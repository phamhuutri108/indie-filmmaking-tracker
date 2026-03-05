// IFT Worker — Main Entry
// Hono.js routing on Cloudflare Workers

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler';
import { handleCron } from './cron';
import { scrapeAsianFilmFestivals } from './scraper';
import { scrapeFunds } from './fund-scraper';
import { generateICS, dbRowsToEvents } from './calendar';
import { signJWT, verifyJWT, getUserFromRequest } from './auth';
import { generateFestivalInsights, generateViTranslation } from './festival-insights';

// Injected by wrangler at build time when [site] is configured
// @ts-ignore
import ASSET_MANIFEST from '__STATIC_CONTENT_MANIFEST';

export interface Env {
  DB: D1Database;
  __STATIC_CONTENT: KVNamespace;
  RESEND_API_KEY: string;
  ALERT_EMAIL: string;
  APP_URL: string;
  ENVIRONMENT: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  OWNER_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors({ origin: '*' }));

// ============================================================
// Health
// ============================================================
app.get('/api/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

// ============================================================
// AUTH
// ============================================================

// Step 1: redirect to Google
app.get('/api/auth/google', (c) => {
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${c.env.APP_URL}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Google callback
app.get('/api/auth/callback', async (c) => {
  const { code, error } = c.req.query();
  if (error || !code) {
    return c.redirect(`${c.env.APP_URL}/?auth_error=${error ?? 'cancelled'}`);
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${c.env.APP_URL}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return c.redirect(`${c.env.APP_URL}/?auth_error=token_failed`);

  const tokens: any = await tokenRes.json();

  // Get Google profile
  const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) return c.redirect(`${c.env.APP_URL}/?auth_error=profile_failed`);

  const profile: any = await profileRes.json();
  const { id: googleId, email, name, picture: avatar } = profile;

  // Upsert user
  let user = await c.env.DB.prepare(
    `SELECT id, status, role FROM users WHERE google_id = ?`
  ).bind(googleId).first<{ id: number; status: string; role: string }>();

  if (!user) {
    // Check by email (e.g. owner linking Google account)
    const byEmail = await c.env.DB.prepare(
      `SELECT id, status, role FROM users WHERE email = ?`
    ).bind(email).first<{ id: number; status: string; role: string }>();

    if (byEmail) {
      await c.env.DB.prepare(
        `UPDATE users SET google_id = ?, name = ?, avatar = ? WHERE id = ?`
      ).bind(googleId, name, avatar, byEmail.id).run();
      user = byEmail;
    } else {
      // New user — pending
      const ins = await c.env.DB.prepare(
        `INSERT INTO users (google_id, email, name, avatar, role, status) VALUES (?, ?, ?, ?, 'member', 'pending')`
      ).bind(googleId, email, name, avatar).run();
      user = { id: ins.meta.last_row_id as number, status: 'pending', role: 'member' };

      // Notify owner
      if (c.env.RESEND_API_KEY && c.env.ALERT_EMAIL) {
        // approval token is valid for 30 days (same as JWT)
        const approveToken = await signJWT(
          { sub: user.id, role: 'system', email, name },
          c.env.JWT_SECRET,
        );
        const approveUrl = `${c.env.APP_URL}/api/auth/approve/${user.id}?token=${approveToken}`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'IFT <noreply@indiefilmmakingtracker.com>',
            to: [c.env.ALERT_EMAIL],
            subject: `[IFT] New member request: ${name} (${email})`,
            html: `
              <p><strong>${name}</strong> (${email}) đã đăng ký tài khoản IFT.</p>
              <p><a href="${approveUrl}" style="background:#004aad;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px">✅ Approve</a></p>
              <p style="color:#999;font-size:12px">Link này có hiệu lực 30 ngày.</p>
            `,
          }),
        });

        // Confirm to new user that request was received
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Indie Filmmaking Tracker <noreply@indiefilmmakingtracker.com>',
            to: [email],
            subject: '[IFT] Yêu cầu đăng ký của bạn đã được gửi đi',
            html: `
              <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px">
                <h2 style="color:#1a202c;margin:0 0 16px">Xin chào ${name},</h2>
                <p style="color:#4a5568;line-height:1.7;margin:0 0 12px">
                  Yêu cầu đăng ký tài khoản <strong>Indie Filmmaking Tracker</strong> của bạn đã được ghi nhận.
                </p>
                <p style="color:#4a5568;line-height:1.7;margin:0 0 28px">
                  Admin sẽ xem xét và duyệt trong thời gian sớm nhất. Bạn sẽ nhận được email thông báo ngay khi tài khoản được kích hoạt.
                </p>
                <p style="color:#a0aec0;font-size:12px;margin:32px 0 0;line-height:1.6">
                  Indie Filmmaking Tracker — <a href="${c.env.APP_URL}" style="color:#a0aec0">${c.env.APP_URL}</a>
                </p>
              </div>
            `,
          }),
        });
      }
    }
  } else {
    await c.env.DB.prepare(
      `UPDATE users SET name = ?, avatar = ? WHERE id = ?`
    ).bind(name, avatar, user.id).run();
  }

  if (user.status !== 'approved') {
    return c.redirect(`${c.env.APP_URL}/?auth_status=pending`);
  }

  const freshUser = await c.env.DB.prepare(
    `SELECT id, email, name, role FROM users WHERE id = ?`
  ).bind(user.id).first<{ id: number; email: string; name: string; role: string }>();

  if (!freshUser) return c.redirect(`${c.env.APP_URL}/?auth_error=db_error`);

  const jwt = await signJWT(
    { sub: freshUser.id, role: freshUser.role, email: freshUser.email, name: freshUser.name ?? '' },
    c.env.JWT_SECRET,
  );
  return c.redirect(`${c.env.APP_URL}/?token=${jwt}`);
});

// Owner password login
app.post('/api/auth/owner', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
  const now = new Date();

  // Check rate limit
  const rl = await c.env.DB.prepare(
    `SELECT attempts, blocked_until FROM auth_rate_limits WHERE ip = ?`
  ).bind(ip).first<{ attempts: number; blocked_until: string | null }>();

  if (rl?.blocked_until && new Date(rl.blocked_until) > now) {
    const retryAfter = Math.ceil((new Date(rl.blocked_until).getTime() - now.getTime()) / 1000);
    return c.json({ error: 'Too many attempts. Try again later.' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const { password } = await c.req.json<{ password: string }>();
  if (password !== c.env.OWNER_PASSWORD) {
    // Increment failed attempts; block after 5 within 15 minutes
    const attempts = (rl?.attempts ?? 0) + 1;
    const blockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
    await c.env.DB.prepare(
      `INSERT INTO auth_rate_limits (ip, attempts, first_attempt_at, blocked_until)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(ip) DO UPDATE SET
         attempts = excluded.attempts,
         blocked_until = excluded.blocked_until`
    ).bind(ip, attempts, blockedUntil).run();

    return c.json(
      { error: 'Invalid password', attemptsLeft: Math.max(0, 5 - attempts) },
      401,
    );
  }

  // Success — clear rate limit
  await c.env.DB.prepare(`DELETE FROM auth_rate_limits WHERE ip = ?`).bind(ip).run();

  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO users (id, email, name, role, status) VALUES (1, 'owner@ift.internal', 'Tri Pham', 'owner', 'approved')`
  ).run();
  const jwt = await signJWT(
    { sub: 1, role: 'owner', email: 'owner@ift.internal', name: 'Tri Pham' },
    c.env.JWT_SECRET,
  );
  return c.json({ token: jwt });
});

// Current user
app.get('/api/auth/me', async (c) => {
  const payload = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'Unauthorized' }, 401);
  const user = await c.env.DB.prepare(
    `SELECT id, email, name, role, status, avatar FROM users WHERE id = ?`
  ).bind(payload.sub).first();
  return user ? c.json(user) : c.json({ error: 'Not found' }, 404);
});

async function sendApprovalEmail(resendKey: string, appUrl: string, user: { name: string; email: string }) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Indie Filmmaking Tracker <noreply@indiefilmmakingtracker.com>',
      to: [user.email],
      subject: '[IFT] Tài khoản của bạn đã được duyệt',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 24px">
          <h2 style="color:#1a202c;margin:0 0 16px">Xin chào ${user.name},</h2>
          <p style="color:#4a5568;line-height:1.7;margin:0 0 12px">
            Tài khoản của bạn tại <strong>Indie Filmmaking Tracker</strong> đã được duyệt.
          </p>
          <p style="color:#4a5568;line-height:1.7;margin:0 0 28px">
            Mời bạn đăng nhập lại để bắt đầu sử dụng:
          </p>
          <a href="${appUrl}" style="display:inline-block;background:#004aad;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Đăng nhập ngay →
          </a>
          <p style="color:#a0aec0;font-size:12px;margin:32px 0 0;line-height:1.6">
            Indie Filmmaking Tracker — <a href="${appUrl}" style="color:#a0aec0">${appUrl}</a>
          </p>
        </div>
      `,
    }),
  });
}

// Approve pending user (owner clicks email link)
app.get('/api/auth/approve/:id', async (c) => {
  const { token } = c.req.query();
  if (!token) return c.text('Missing token', 400);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload || payload.role !== 'system') return c.text('Invalid or expired link', 400);

  const userId = Number(c.req.param('id'));
  if (payload.sub !== userId) return c.text('Token mismatch', 400);

  const user = await c.env.DB.prepare(`SELECT name, email FROM users WHERE id = ?`).bind(userId).first<{ name: string; email: string }>();
  await c.env.DB.prepare(`UPDATE users SET status = 'approved' WHERE id = ?`).bind(userId).run();

  if (user && c.env.RESEND_API_KEY) {
    await sendApprovalEmail(c.env.RESEND_API_KEY, c.env.APP_URL, user);
    // Also send the latest announcement to the new member
    const latestAnn = await c.env.DB.prepare(
      `SELECT content FROM chat_messages WHERE channel = 'announcements' ORDER BY id DESC LIMIT 1`
    ).first<{ content: string }>();
    if (latestAnn) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'IFT Announcements <noreply@indiefilmmakingtracker.com>',
          to: [user.email],
          subject: '📢 IFT — Thông báo mới nhất / Latest Announcement',
          html: buildAnnouncementEmail(latestAnn.content, user.name, c.env.APP_URL),
        }),
      }).catch(() => {});
    }
  }

  return c.html(`
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:'Segoe UI',sans-serif;text-align:center;padding:60px;background:#f7fafc">
      <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h2 style="color:#1a202c;margin:0 0 8px">${user?.name ?? 'User'} approved!</h2>
        <p style="color:#718096;margin:0">${user?.email} can now log in to IFT.</p>
      </div>
    </body></html>
  `);
});

// List pending users (owner only)
app.get('/api/auth/pending', async (c) => {
  const payload = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!payload || payload.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);
  const result = await c.env.DB.prepare(
    `SELECT id, email, name, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC`
  ).all();
  return c.json({ data: result.results });
});

// List all users (owner only)
app.get('/api/auth/users', async (c) => {
  const payload = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!payload || payload.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);
  const result = await c.env.DB.prepare(
    `SELECT id, email, name, role, status, avatar, created_at FROM users ORDER BY created_at ASC`
  ).all();
  return c.json({ data: result.results });
});

// Update user status (approve/block) — owner only
app.patch('/api/auth/users/:id', async (c) => {
  const payload = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!payload || payload.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);
  const userId = Number(c.req.param('id'));
  const body = await c.req.json<{ status?: string }>();
  if (body.status) {
    await c.env.DB.prepare(`UPDATE users SET status = ? WHERE id = ?`).bind(body.status, userId).run();
    if (body.status === 'approved' && c.env.RESEND_API_KEY) {
      const user = await c.env.DB.prepare(`SELECT name, email FROM users WHERE id = ?`).bind(userId).first<{ name: string; email: string }>();
      if (user) {
        await sendApprovalEmail(c.env.RESEND_API_KEY, c.env.APP_URL, user);
        // Also send the latest announcement to the new member
        const latestAnn = await c.env.DB.prepare(
          `SELECT content FROM chat_messages WHERE channel = 'announcements' ORDER BY id DESC LIMIT 1`
        ).first<{ content: string }>();
        if (latestAnn) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'IFT Announcements <noreply@indiefilmmakingtracker.com>',
              to: [user.email],
              subject: '📢 IFT — Thông báo mới nhất / Latest Announcement',
              html: buildAnnouncementEmail(latestAnn.content, user.name, c.env.APP_URL),
            }),
          }).catch(() => {});
        }
      }
    }
  }
  return c.json({ ok: true });
});

// Delete user — owner only, cannot delete self (id=1)
app.delete('/api/auth/users/:id', async (c) => {
  const payload = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!payload || payload.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);
  const userId = Number(c.req.param('id'));
  if (userId === 1) return c.json({ error: 'Cannot delete owner account' }, 400);
  await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run();
  return c.json({ ok: true });
});

// ============================================================
// Feedback
// ============================================================
app.post('/api/feedback', async (c) => {
  const { name, email, message } = await c.req.json<{ name: string; email: string; message: string }>();
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return c.json({ error: 'Missing fields' }, 400);
  }
  if (c.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'IFT Feedback <noreply@indiefilmmakingtracker.com>',
        to: ['support@indiefilmmakingtracker.com'],
        reply_to: email,
        subject: `[IFT Feedback] ${name}`,
        html: `<p><strong>Tên:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Lời nhắn:</strong></p><p style="white-space:pre-wrap">${message}</p>`,
      }),
    });
  }
  return c.json({ ok: true });
});

// ============================================================
// Chat / Announcement Channel
// ============================================================

// GET messages for a channel (paginated, newest first)
app.get('/api/chat/messages', async (c) => {
  const channel = c.req.query('channel') ?? 'announcements';
  const since = Number(c.req.query('since') ?? 0); // return only id > since

  if (!['announcements', 'feedback'].includes(channel)) {
    return c.json({ error: 'Invalid channel' }, 400);
  }

  const result = await c.env.DB.prepare(
    `SELECT id, channel, content, author_name, author_role, created_at
     FROM chat_messages
     WHERE channel = ? AND id > ?
     ORDER BY created_at ASC
     LIMIT 100`
  ).bind(channel, since).all();

  return c.json({ data: result.results });
});

// GET latest message id per channel (for unread badge polling)
app.get('/api/chat/latest', async (c) => {
  const ann = await c.env.DB.prepare(
    `SELECT id, created_at FROM chat_messages WHERE channel='announcements' ORDER BY id DESC LIMIT 1`
  ).first<{ id: number; created_at: string }>();
  const fb = await c.env.DB.prepare(
    `SELECT id, created_at FROM chat_messages WHERE channel='feedback' ORDER BY id DESC LIMIT 1`
  ).first<{ id: number; created_at: string }>();
  return c.json({
    announcements: ann?.id ?? 0,
    feedback: fb?.id ?? 0,
  });
});

// POST new message
// - announcements: owner only → also emails all approved members
// - feedback: any logged-in user
app.post('/api/chat/messages', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ channel: string; content: string; test_email?: string }>();
  const channel = body.channel;
  const content = (body.content ?? '').trim();
  const testEmail = (body.test_email ?? '').trim();

  if (!['announcements', 'feedback'].includes(channel)) {
    return c.json({ error: 'Invalid channel' }, 400);
  }
  if (!content) return c.json({ error: 'Empty message' }, 400);
  if (channel === 'announcements' && user.role !== 'owner') {
    return c.json({ error: 'Only owner can post announcements' }, 403);
  }

  // ── Test mode: send preview email only, do NOT insert into DB ─────────────
  if (testEmail && channel === 'announcements' && user.role === 'owner') {
    if (c.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'IFT Announcements <noreply@indiefilmmakingtracker.com>',
            to: [testEmail],
            subject: '[TEST PREVIEW] 📢 IFT Announcement',
            html: buildAnnouncementEmail(content, 'Test Recipient', c.env.APP_URL),
          }),
        });
      } catch { /* best-effort */ }
    }
    return c.json({ data: null, emailCount: 0, test: true }, 200);
  }

  // ── Real send: insert into DB ────────────────────────────────────────────
  const inserted = await c.env.DB.prepare(
    `INSERT INTO chat_messages (channel, content, author_name, author_role)
     VALUES (?, ?, ?, ?) RETURNING id, created_at`
  ).bind(channel, content, user.name ?? user.email ?? 'Member', user.role).first<{ id: number; created_at: string }>();

  // Blast email to all approved members when owner posts announcement
  let emailCount = 0;
  if (channel === 'announcements' && user.role === 'owner' && c.env.RESEND_API_KEY) {
    const members = await c.env.DB.prepare(
      `SELECT email, name FROM users WHERE status = 'approved' AND role = 'member'`
    ).all<{ email: string; name: string }>();

    for (const m of members.results ?? []) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'IFT Announcements <noreply@indiefilmmakingtracker.com>',
            to: [m.email],
            subject: '📢 IFT — New Announcement / Thông báo mới',
            html: buildAnnouncementEmail(content, m.name, c.env.APP_URL),
          }),
        });
        emailCount++;
      } catch { /* best-effort */ }
    }

    if (inserted?.id) {
      await c.env.DB.prepare(`UPDATE chat_messages SET email_sent = ? WHERE id = ?`)
        .bind(emailCount, inserted.id).run();
    }
  }

  return c.json({ data: inserted, emailCount }, 201);
});

// PUT /api/chat/messages/:id  (edit content)
app.put('/api/chat/messages/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const msgId = Number(c.req.param('id'));
  const body = await c.req.json<{ content: string }>();
  const content = (body.content ?? '').trim();
  if (!content) return c.json({ error: 'Content required' }, 400);

  const msg = await c.env.DB.prepare(
    `SELECT id, author_name, author_role FROM chat_messages WHERE id = ?`
  ).bind(msgId).first<{ id: number; author_name: string; author_role: string }>();
  if (!msg) return c.json({ error: 'Not found' }, 404);

  const authorName = user.name ?? user.email ?? '';
  if (user.role !== 'owner' && msg.author_name !== authorName) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await c.env.DB.prepare(`UPDATE chat_messages SET content = ? WHERE id = ?`)
    .bind(content, msgId).run();

  return c.json({ ok: true, content });
});

// DELETE /api/chat/messages/:id
app.delete('/api/chat/messages/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const msgId = Number(c.req.param('id'));
  const msg = await c.env.DB.prepare(
    `SELECT id, author_name, author_role FROM chat_messages WHERE id = ?`
  ).bind(msgId).first<{ id: number; author_name: string; author_role: string }>();
  if (!msg) return c.json({ error: 'Not found' }, 404);

  const authorName = user.name ?? user.email ?? '';
  if (user.role !== 'owner' && msg.author_name !== authorName) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await c.env.DB.prepare(`DELETE FROM chat_messages WHERE id = ?`).bind(msgId).run();
  return c.json({ ok: true });
});

// POST /api/chat/messages/:id/resend  (send a specific message to one email)
app.post('/api/chat/messages/:id/resend', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Forbidden' }, 403);

  const msgId = Number(c.req.param('id'));
  const body = await c.req.json<{ email: string; name?: string }>();
  const to = (body.email ?? '').trim();
  if (!to) return c.json({ error: 'Email required' }, 400);

  const msg = await c.env.DB.prepare(
    `SELECT content FROM chat_messages WHERE id = ?`
  ).bind(msgId).first<{ content: string }>();
  if (!msg) return c.json({ error: 'Not found' }, 404);

  if (c.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'IFT Announcements <noreply@indiefilmmakingtracker.com>',
        to: [to],
        subject: '📢 IFT — Thông báo / Announcement',
        html: buildAnnouncementEmail(msg.content, body.name ?? '', c.env.APP_URL),
      }),
    });
  }
  return c.json({ ok: true });
});

function buildAnnouncementEmail(content: string, recipientName: string, appUrl: string): string {
  const escaped = content.replace(/\n/g, '<br>');
  const name = recipientName ? `<p>Hi <strong>${recipientName}</strong>,</p>` : '';
  return `
    <div style="font-family:sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f8f9fa;">
      <div style="background:#fff;border-radius:12px;padding:28px 32px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <span style="font-size:28px;">📢</span>
          <h2 style="margin:0;color:#004aad;font-size:20px;">IFT Announcement</h2>
        </div>
        ${name}
        <div style="background:#EBF8FF;border-left:4px solid #004aad;border-radius:6px;padding:16px 20px;margin:16px 0;font-size:15px;line-height:1.7;color:#2d3748;">
          ${escaped}
        </div>
        <p style="margin:20px 0 0;">
          <a href="${appUrl}/dashboard"
             style="display:inline-block;padding:10px 20px;background:#004aad;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            View on IFT Dashboard →
          </a>
        </p>
      </div>
      <p style="text-align:center;color:#a0aec0;font-size:12px;margin-top:16px;">
        IFT — Indie Filmmaking Tracker · <a href="${appUrl}" style="color:#718096;">indiefilmmakingtracker.com</a>
      </p>
    </div>
  `;
}

// ============================================================
// Manual triggers
// ============================================================
app.get('/api/scrape', async (c) => {
  const result = await scrapeAsianFilmFestivals(c.env.DB);
  return c.json({ saved: result.saved, skipped: result.skipped, errors: result.errors, ts: new Date().toISOString() });
});

app.get('/api/funds/scrape', async (c) => {
  const result = await scrapeFunds(c.env.DB);
  return c.json({ saved: result.saved, skipped: result.skipped, errors: result.errors, ts: new Date().toISOString() });
});

app.get('/api/cron/run', async (c) => {
  await handleCron(c.env);
  return c.json({ ok: true, ts: new Date().toISOString() });
});

// ============================================================
// MODULE 1: Festivals (global — no user scoping)
// ============================================================
app.get('/api/festivals', async (c) => {
  const { category, tier, prestige_tier, status = 'active', limit = '500', offset = '0', search } = c.req.query();

  let query = `SELECT * FROM festivals WHERE status = ?`;
  const params: unknown[] = [status];

  if (category)      { query += ` AND category = ?`;      params.push(category); }
  if (tier)          { query += ` AND tier = ?`;           params.push(tier); }
  if (prestige_tier) { query += ` AND prestige_tier = ?`;  params.push(prestige_tier); }
  if (search) {
    query += ` AND (name LIKE ? OR country LIKE ? OR city LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  query += ` ORDER BY regular_deadline ASC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results, total: result.results.length });
});

app.get('/api/festivals/:id', async (c) => {
  const festival = await c.env.DB.prepare(`SELECT * FROM festivals WHERE id = ?`)
    .bind(c.req.param('id')).first();
  if (!festival) return c.json({ error: 'Not found' }, 404);

  const sections = await c.env.DB.prepare(
    `SELECT * FROM festival_sections WHERE festival_id = ? ORDER BY regular_deadline ASC`
  ).bind(c.req.param('id')).all();

  return c.json({ data: { ...festival, sections: sections.results } });
});

// ─── Festival Sections ────────────────────────────────────────────────────────
app.post('/api/festival-sections', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const {
    festival_id, section_name, section_name_vi, category,
    early_deadline, regular_deadline, late_deadline,
    entry_fee_early, entry_fee_regular, filmfreeway_url, notification_date,
  } = body as any;

  if (!festival_id || !section_name) return c.json({ error: 'festival_id and section_name required' }, 400);

  const result = await c.env.DB.prepare(
    `INSERT INTO festival_sections
       (festival_id, section_name, section_name_vi, category,
        early_deadline, regular_deadline, late_deadline,
        entry_fee_early, entry_fee_regular, filmfreeway_url,
        notification_date, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
     ON CONFLICT(festival_id, section_name) DO UPDATE SET
       section_name_vi = excluded.section_name_vi,
       category = excluded.category,
       early_deadline = excluded.early_deadline,
       regular_deadline = excluded.regular_deadline,
       late_deadline = excluded.late_deadline,
       entry_fee_early = excluded.entry_fee_early,
       entry_fee_regular = excluded.entry_fee_regular,
       filmfreeway_url = excluded.filmfreeway_url,
       notification_date = excluded.notification_date`
  ).bind(
    festival_id, section_name, section_name_vi ?? null, category ?? null,
    early_deadline ?? null, regular_deadline ?? null, late_deadline ?? null,
    entry_fee_early ? Math.round(Number(entry_fee_early) * 100) : null,
    entry_fee_regular ? Math.round(Number(entry_fee_regular) * 100) : null,
    filmfreeway_url ?? null, notification_date ?? null,
  ).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

app.delete('/api/festival-sections/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(`DELETE FROM festival_sections WHERE id = ?`)
    .bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ─── Festival Insights (AI-generated, cached) ────────────────────────────────
app.get('/api/festivals/:id/insights', async (c) => {
  const festivalId = Number(c.req.param('id'));
  if (isNaN(festivalId)) return c.json({ error: 'Invalid id' }, 400);

  // Return cached insights if available (always serve EN cache immediately)
  const cached = await c.env.DB.prepare(
    `SELECT * FROM festival_insights WHERE festival_id = ?`
  ).bind(festivalId).first<Record<string, unknown>>();

  if (cached) {
    return c.json({ data: cached, cached: true });
  }

  // Load festival data
  const festival = await c.env.DB.prepare(
    `SELECT id, name, country, city, website, description, prestige_tier, category, tier
     FROM festivals WHERE id = ?`
  ).bind(festivalId).first<{ id: number; name: string; country: string | null; city: string | null; website: string | null; description: string | null; prestige_tier: string | null; category: string | null; tier: string | null }>();

  if (!festival) return c.json({ error: 'Festival not found' }, 404);

  // Generate AI profile (may take 5-10s on first call)
  const insights = await generateFestivalInsights(festival, c.env.ANTHROPIC_API_KEY);

  // Cache in DB
  await c.env.DB.prepare(`
    INSERT INTO festival_insights
      (festival_id, summary, what_they_look_for, eligibility, industry_presence,
       tips, summary_vi, what_they_look_for_vi, eligibility_vi, industry_presence_vi, tips_vi,
       past_selections, prizes, useful_links, acceptance_stats, confidence, model_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    festivalId,
    insights.summary,
    insights.what_they_look_for,
    insights.eligibility,
    insights.industry_presence,
    insights.tips,
    insights.summary_vi,
    insights.what_they_look_for_vi,
    insights.eligibility_vi,
    insights.industry_presence_vi,
    insights.tips_vi,
    JSON.stringify(insights.past_selections),
    JSON.stringify(insights.prizes),
    JSON.stringify(insights.useful_links),
    insights.acceptance_stats ? JSON.stringify(insights.acceptance_stats) : null,
    insights.confidence,
    'claude-sonnet-4-6',
  ).run();

  return c.json({ data: { ...insights, festival_id: festivalId }, cached: false });
});

app.delete('/api/festivals/:id/insights', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(`DELETE FROM festival_insights WHERE festival_id = ?`)
    .bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// Translate cached EN insights to Vietnamese (called in background from frontend)
app.post('/api/festivals/:id/insights/translate-vi', async (c) => {
  const festivalId = Number(c.req.param('id'));
  if (isNaN(festivalId)) return c.json({ error: 'Invalid id' }, 400);

  const cached = await c.env.DB.prepare(
    `SELECT summary, what_they_look_for, eligibility, industry_presence, tips, summary_vi
     FROM festival_insights WHERE festival_id = ?`
  ).bind(festivalId).first<{
    summary: string; what_they_look_for: string; eligibility: string;
    industry_presence: string; tips: string; summary_vi: string | null;
  }>();

  if (!cached) return c.json({ error: 'No cached insights' }, 404);
  // Already has VI — nothing to do
  if (cached.summary_vi) return c.json({ ok: true, skipped: true });

  const vi = await generateViTranslation({
    summary: cached.summary,
    what_they_look_for: cached.what_they_look_for,
    eligibility: cached.eligibility,
    industry_presence: cached.industry_presence,
    tips: cached.tips,
  }, c.env.ANTHROPIC_API_KEY);

  await c.env.DB.prepare(`
    UPDATE festival_insights
    SET summary_vi = ?, what_they_look_for_vi = ?, eligibility_vi = ?,
        industry_presence_vi = ?, tips_vi = ?
    WHERE festival_id = ?
  `).bind(vi.summary_vi, vi.what_they_look_for_vi, vi.eligibility_vi, vi.industry_presence_vi, vi.tips_vi, festivalId).run();

  return c.json({ ok: true, data: vi });
});

app.post('/api/festivals', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const {
    name, name_vi, country, city, website, filmfreeway_url,
    category, tier, early_deadline, regular_deadline, late_deadline,
    notification_date, festival_dates, entry_fee_early, entry_fee_regular,
    description, description_vi, source,
  } = body as any;

  const result = await c.env.DB.prepare(
    `INSERT INTO festivals (name, name_vi, country, city, website, filmfreeway_url, category, tier,
      early_deadline, regular_deadline, late_deadline, notification_date, festival_dates,
      entry_fee_early, entry_fee_regular, description, description_vi, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, name_vi, country, city, website, filmfreeway_url, category, tier,
    early_deadline, regular_deadline, late_deadline, notification_date, festival_dates,
    entry_fee_early, entry_fee_regular, description, description_vi, source).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// ============================================================
// MODULE 2: Funds & Grants (global)
// ============================================================
app.get('/api/funds', async (c) => {
  const { type, focus, region_focus, status = 'active', search } = c.req.query();

  let query = `SELECT * FROM funds_grants WHERE status = ?`;
  const params: unknown[] = [status];

  if (type)         { query += ` AND type = ?`;         params.push(type); }
  if (focus)        { query += ` AND focus = ?`;        params.push(focus); }
  if (region_focus) { query += ` AND region_focus = ?`; params.push(region_focus); }
  if (search) {
    query += ` AND (name LIKE ? OR organization LIKE ? OR country LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  query += ` ORDER BY deadline ASC LIMIT 500`;

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.get('/api/funds/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM funds_grants WHERE id = ?`)
    .bind(c.req.param('id')).first();
  return row ? c.json({ data: row }) : c.json({ error: 'Not found' }, 404);
});

app.post('/api/funds', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const {
    name, name_vi, organization, country, website,
    type, focus, region_focus, max_amount, currency,
    open_date, deadline, eligibility, eligibility_vi,
    description, description_vi,
  } = body as any;
  const result = await c.env.DB.prepare(
    `INSERT INTO funds_grants (name, name_vi, organization, country, website, type, focus, region_focus,
      max_amount, currency, open_date, deadline, eligibility, eligibility_vi, description, description_vi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, name_vi, organization, country, website, type, focus, region_focus,
    max_amount, currency ?? 'USD', open_date, deadline, eligibility, eligibility_vi,
    description, description_vi).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

// ============================================================
// MODULE 3: Education & Residency (global)
// ============================================================
app.get('/api/education', async (c) => {
  const { type, status = 'active', search } = c.req.query();

  let query = `SELECT * FROM education_residency WHERE status = ?`;
  const params: unknown[] = [status];

  if (type) { query += ` AND type = ?`; params.push(type); }
  if (search) {
    query += ` AND (name LIKE ? OR organization LIKE ? OR country LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  query += ` ORDER BY deadline ASC LIMIT 500`;

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.get('/api/education/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM education_residency WHERE id = ?`)
    .bind(c.req.param('id')).first();
  return row ? c.json({ data: row }) : c.json({ error: 'Not found' }, 404);
});

app.post('/api/education', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user || user.role !== 'owner') return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const {
    name, name_vi, organization, country, city, website,
    type, duration, application_open, deadline, program_dates,
    stipend, covers_travel, covers_accommodation,
    eligibility, eligibility_vi, description, description_vi,
  } = body as any;
  const result = await c.env.DB.prepare(
    `INSERT INTO education_residency (name, name_vi, organization, country, city, website, type,
      duration, application_open, deadline, program_dates, stipend, covers_travel,
      covers_accommodation, eligibility, eligibility_vi, description, description_vi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, name_vi, organization, country, city, website, type,
    duration, application_open, deadline, program_dates, stipend ?? null,
    covers_travel ? 1 : 0, covers_accommodation ? 1 : 0,
    eligibility, eligibility_vi, description, description_vi).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

// ============================================================
// MODULE 4: Monitor Commands (per-user)
// ============================================================
app.get('/api/monitors', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ data: [] });

  const result = await c.env.DB.prepare(
    `SELECT * FROM v_monitor_details WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(user.sub).all();
  return c.json({ data: result.results });
});

app.post('/api/monitors', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const { target_url, target_name, monitor_type, ref_id, ref_table, watch_for, alert_days_before } = body as any;

  const result = await c.env.DB.prepare(
    `INSERT INTO monitor_commands (user_id, target_url, target_name, monitor_type, ref_id, ref_table, watch_for, alert_days_before)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(user.sub, target_url, target_name, monitor_type, ref_id, ref_table, watch_for, alert_days_before ?? 7).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

app.delete('/api/monitors/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(
    `UPDATE monitor_commands SET is_active = 0 WHERE id = ? AND user_id = ?`
  ).bind(c.req.param('id'), user.sub).run();
  return c.json({ ok: true });
});

// ============================================================
// MODULE 5: My Films (per-user)
// ============================================================
app.get('/api/films', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ data: [] });

  const { status, genre } = c.req.query();
  let query = `SELECT * FROM films WHERE user_id = ?`;
  const params: unknown[] = [user.sub];
  if (status) { query += ` AND status = ?`; params.push(status); }
  if (genre)  { query += ` AND genre = ?`;  params.push(genre); }
  query += ` ORDER BY year DESC, title ASC`;
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.get('/api/films/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const row = await c.env.DB.prepare(`SELECT * FROM films WHERE id = ? AND user_id = ?`)
    .bind(c.req.param('id'), user.sub).first();
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404);
});

app.post('/api/films', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const { title, title_vi, year, genre, duration_min, logline, logline_vi,
          director, producer, status, poster_url, trailer_url, notes } = body as any;
  const result = await c.env.DB.prepare(
    `INSERT INTO films (user_id, title, title_vi, year, genre, duration_min, logline, logline_vi,
      director, producer, status, poster_url, trailer_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(user.sub, title, title_vi, year, genre, duration_min, logline, logline_vi,
    director ?? 'Tri Pham', producer, status ?? 'in-production', poster_url, trailer_url, notes).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

app.put('/api/films/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const { title, title_vi, year, genre, duration_min, logline, logline_vi,
          director, producer, status, poster_url, trailer_url, notes } = body as any;
  await c.env.DB.prepare(
    `UPDATE films SET title=?, title_vi=?, year=?, genre=?, duration_min=?, logline=?, logline_vi=?,
      director=?, producer=?, status=?, poster_url=?, trailer_url=?, notes=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?`
  ).bind(title, title_vi, year, genre, duration_min, logline, logline_vi,
    director, producer, status, poster_url, trailer_url, notes, c.req.param('id'), user.sub).run();
  return c.json({ ok: true });
});

app.delete('/api/films/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(`DELETE FROM films WHERE id = ? AND user_id = ?`)
    .bind(c.req.param('id'), user.sub).run();
  return c.json({ ok: true });
});

// ============================================================
// MODULE 5: Submissions (per-user)
// ============================================================
app.get('/api/submissions', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ data: [] });

  const { film_id, status, ref_table } = c.req.query();
  let query = `SELECT * FROM submissions WHERE user_id = ?`;
  const params: unknown[] = [user.sub];
  if (film_id)   { query += ` AND film_id = ?`;   params.push(Number(film_id)); }
  if (status)    { query += ` AND status = ?`;     params.push(status); }
  if (ref_table) { query += ` AND ref_table = ?`;  params.push(ref_table); }
  query += ` ORDER BY created_at DESC`;
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.post('/api/submissions', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const { film_id, film_title, ref_table, ref_id, ref_name, deadline,
          submitted_at, submission_platform, submission_url, entry_fee_paid,
          status, result_date, notes } = body as any;
  const result = await c.env.DB.prepare(
    `INSERT INTO submissions (user_id, film_id, film_title, ref_table, ref_id, ref_name, deadline,
      submitted_at, submission_platform, submission_url, entry_fee_paid, status, result_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(user.sub, film_id, film_title, ref_table, ref_id, ref_name, deadline,
    submitted_at, submission_platform ?? 'direct', submission_url, entry_fee_paid,
    status ?? 'draft', result_date, notes).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

app.put('/api/submissions/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const { status, submitted_at, result_date, notes, entry_fee_paid,
          submission_platform, submission_url } = body as any;
  await c.env.DB.prepare(
    `UPDATE submissions SET status=?, submitted_at=?, result_date=?, notes=?,
      entry_fee_paid=?, submission_platform=?, submission_url=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=?`
  ).bind(status, submitted_at, result_date, notes, entry_fee_paid,
    submission_platform, submission_url, c.req.param('id'), user.sub).run();
  return c.json({ ok: true });
});

app.delete('/api/submissions/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(`DELETE FROM submissions WHERE id = ? AND user_id = ?`)
    .bind(c.req.param('id'), user.sub).run();
  return c.json({ ok: true });
});

// ============================================================
// MODULE 6: Watchlist (per-user)
// ============================================================
app.get('/api/watchlist', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ data: [] });

  const result = await c.env.DB.prepare(
    `SELECT * FROM v_watchlist_details WHERE user_id = ? ORDER BY deadline ASC`
  ).bind(user.sub).all();
  return c.json({ data: result.results });
});

app.post('/api/watchlist', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<Record<string, unknown>>();
  const { ref_table, ref_id, notes } = body as any;
  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO watchlist (user_id, ref_table, ref_id, notes) VALUES (?, ?, ?, ?)`
    ).bind(user.sub, ref_table, ref_id, notes ?? null).run();
    return c.json({ id: result.meta.last_row_id }, 201);
  } catch {
    return c.json({ error: 'Already in watchlist' }, 409);
  }
});

app.delete('/api/watchlist/ref/:ref_table/:ref_id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(
    `DELETE FROM watchlist WHERE ref_table = ? AND ref_id = ? AND user_id = ?`
  ).bind(c.req.param('ref_table'), c.req.param('ref_id'), user.sub).run();
  return c.json({ ok: true });
});

app.delete('/api/watchlist/:id', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  await c.env.DB.prepare(`DELETE FROM watchlist WHERE id = ? AND user_id = ?`)
    .bind(c.req.param('id'), user.sub).run();
  return c.json({ ok: true });
});

// ============================================================
// Dashboard & Stats (global)
// ============================================================
app.get('/api/stats', async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env.JWT_SECRET);
  const userId = user?.sub ?? null;

  const [festivals, funds, education, upcoming7, upcoming30, films, submissions] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM festivals WHERE status = 'active'`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM funds_grants WHERE status = 'active'`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM education_residency WHERE status = 'active'`).first<{ count: number }>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT regular_deadline as d FROM festivals WHERE status='active' AND regular_deadline BETWEEN date('now') AND date('now', '+7 days')
        UNION ALL
        SELECT deadline as d FROM funds_grants WHERE status='active' AND deadline BETWEEN date('now') AND date('now', '+7 days')
        UNION ALL
        SELECT deadline as d FROM education_residency WHERE status='active' AND deadline BETWEEN date('now') AND date('now', '+7 days')
      )
    `).first<{ count: number }>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT regular_deadline as d FROM festivals WHERE status='active' AND regular_deadline BETWEEN date('now') AND date('now', '+30 days')
        UNION ALL
        SELECT deadline as d FROM funds_grants WHERE status='active' AND deadline BETWEEN date('now') AND date('now', '+30 days')
        UNION ALL
        SELECT deadline as d FROM education_residency WHERE status='active' AND deadline BETWEEN date('now') AND date('now', '+30 days')
      )
    `).first<{ count: number }>(),
    userId
      ? c.env.DB.prepare(`SELECT COUNT(*) as count FROM films WHERE user_id = ?`).bind(userId).first<{ count: number }>()
      : Promise.resolve({ count: 0 }),
    userId
      ? c.env.DB.prepare(`SELECT COUNT(*) as count FROM submissions WHERE user_id = ?`).bind(userId).first<{ count: number }>()
      : Promise.resolve({ count: 0 }),
  ]);
  return c.json({
    festivals: festivals?.count ?? 0,
    funds: funds?.count ?? 0,
    education: education?.count ?? 0,
    upcoming7: upcoming7?.count ?? 0,
    upcoming30: upcoming30?.count ?? 0,
    films: films?.count ?? 0,
    submissions: submissions?.count ?? 0,
  });
});

app.get('/api/dashboard', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT 'festival' as type, id, name, regular_deadline as deadline, website, status
     FROM festivals WHERE regular_deadline >= date('now') AND status = 'active'
     UNION ALL
     SELECT 'fund' as type, id, name, deadline, website, status
     FROM funds_grants WHERE deadline >= date('now') AND status = 'active'
     UNION ALL
     SELECT 'education' as type, id, name, deadline, website, status
     FROM education_residency WHERE deadline >= date('now') AND status = 'active'
     ORDER BY deadline ASC
     LIMIT 30`
  ).all();
  return c.json({ upcoming: result.results });
});

// ============================================================
// Calendar Export (ICS)
// ============================================================
app.get('/api/calendar/export', async (c) => {
  const include = (c.req.query('include') ?? 'festivals,funds,education').split(',');

  const queries: Promise<{ results: any[] }>[] = [];

  if (include.includes('festivals')) {
    queries.push(c.env.DB.prepare(
      `SELECT 'festival' as type, id, name, regular_deadline as deadline, website FROM festivals WHERE regular_deadline >= date('now') AND status = 'active'`
    ).all() as Promise<{ results: any[] }>);
  }
  if (include.includes('funds')) {
    queries.push(c.env.DB.prepare(
      `SELECT 'fund' as type, id, name, deadline, website FROM funds_grants WHERE deadline >= date('now') AND status = 'active'`
    ).all() as Promise<{ results: any[] }>);
  }
  if (include.includes('education')) {
    queries.push(c.env.DB.prepare(
      `SELECT 'education' as type, id, name, deadline, website FROM education_residency WHERE deadline >= date('now') AND status = 'active'`
    ).all() as Promise<{ results: any[] }>);
  }

  const results = await Promise.all(queries);
  const allRows = results.flatMap((r) => r.results);
  allRows.sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));

  const ics = generateICS(dbRowsToEvents(allRows));

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ift-deadlines.ics"',
    },
  });
});

// ============================================================
// Static asset serving
// ============================================================
app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const kvEvent = {
    request: c.req.raw,
    waitUntil: (p: Promise<unknown>) => c.executionCtx.waitUntil(p),
  };
  const options = {
    ASSET_NAMESPACE: c.env.__STATIC_CONTENT,
    ASSET_MANIFEST,
  };

  try {
    return await getAssetFromKV(kvEvent, options);
  } catch (e) {
    if (e instanceof NotFoundError) {
      const indexRequest = new Request(
        new URL('/index.html', c.req.url).toString(),
        c.req.raw
      );
      try {
        const resp = await getAssetFromKV(
          { request: indexRequest, waitUntil: kvEvent.waitUntil },
          options
        );
        return new Response(resp.body, { ...resp, status: 200 });
      } catch {
        return c.text('Not found', 404);
      }
    }
    return c.text('Internal Server Error', 500);
  }
});

// ============================================================
// Cloudflare Worker Export
// ============================================================
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env));
  },
};
