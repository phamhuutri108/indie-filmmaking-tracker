// IFT Cron Job — Daily at 08:00 UTC
// Runs via Cloudflare Cron Trigger

import { scrapeAsianFilmFestivals, scrapeCineuropaRss, searchFestivalDeadlineWithAI } from './scraper';
import { scrapeFunds } from './fund-scraper';
import { batchAnalyzeFestivals, batchAnalyzeFunds, batchAnalyzeEducation } from './ai-scraper';
import { buildBundledAlertEmail, buildDigestEmail, buildErrorAlertEmail, buildDeadlineCheckEmail, type AlertItem, type DigestItem, type DeadlineCheckItem } from './email-templates';
import { queueDeadlineCandidate } from './data-quality';

export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  ALERT_EMAIL: string;
  APP_URL: string;
  ANTHROPIC_API_KEY: string;
  AI: Ai;
  AI_AUTO_PUBLISH?: string;
}

export async function handleCron(env: Env): Promise<void> {
  console.log('[IFT Cron] Starting daily run:', new Date().toISOString());

  // Biweekly deadline check — runs on Mondays of even ISO weeks
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekNum = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
  const isBiweeklyMonday = dayOfWeek === 1 && weekNum % 2 === 0;

  const tasks: Array<[string, Promise<void>]> = [
    ['AsianFilmFestivals scraper', runScraper(env)],
    ['Cineuropa scraper', runCineuropa(env)],
    ['Fund scraper', runFundScraper(env)],
    ['AI credibility analysis', runAIAnalysis(env)],
    ['Monitor alerts', checkMonitorCommands(env)],
    ['Daily digest', sendDailyDigest(env)],
    ...(isBiweeklyMonday ? [['Pending deadline check', checkPendingDeadlines(env).then(() => {})] as [string, Promise<void>]] : []),
  ];

  const results = await Promise.allSettled(tasks.map(([, p]) => p));

  const failed = results
    .map((r, i) => (r.status === 'rejected' ? { task: tasks[i][0], reason: r.reason } : null))
    .filter(Boolean) as Array<{ task: string; reason: unknown }>;

  if (failed.length > 0) {
    console.error('[IFT Cron] Failed tasks:', failed.map(f => f.task));
    await sendErrorAlert(env, failed);
  }

  // Cleanup old email_logs (keep 90 days)
  const { meta } = await env.DB.prepare(
    `DELETE FROM email_logs WHERE created_at < datetime('now', '-90 days')`
  ).run();
  if (meta.changes > 0) {
    console.log(`[IFT Cron] Cleaned up ${meta.changes} old email_log rows.`);
  }

  // Cleanup old rate limit records
  await env.DB.prepare(
    `DELETE FROM auth_rate_limits WHERE blocked_until < datetime('now') OR (blocked_until IS NULL AND first_attempt_at < datetime('now', '-1 day'))`
  ).run();

  console.log('[IFT Cron] Done.');
}

async function runAIAnalysis(env: Env): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('[Cron] No ANTHROPIC_API_KEY set, skipping AI analysis.');
    return;
  }
  try {
    await batchAnalyzeFestivals(env.DB, env);
    await batchAnalyzeFunds(env.DB, env);
    await batchAnalyzeEducation(env.DB, env);
  } catch (err) {
    console.error('[Cron] AI analysis failed:', err);
  }
}

async function runFundScraper(env: Env): Promise<void> {
  try {
    const result = await scrapeFunds(env.DB);
    console.log(`[Cron] FundScraper — saved/updated: ${result.saved}, unchanged: ${result.skipped}`);
    if (result.errors.length) {
      console.error('[Cron] FundScraper errors:', result.errors);
    }
  } catch (err) {
    console.error('[Cron] FundScraper failed:', err);
  }
}

async function runCineuropa(env: Env): Promise<void> {
  try {
    const result = await scrapeCineuropaRss(
      env.DB,
      env.ANTHROPIC_API_KEY,
      env.AI,
      env.AI_AUTO_PUBLISH === 'true',
    );
    console.log(`[Cron] Cineuropa — saved: ${result.saved}, skipped: ${result.skipped}`);
    if (result.errors.length) console.error('[Cron] Cineuropa errors:', result.errors);
  } catch (err) {
    console.error('[Cron] Cineuropa failed:', err);
  }
}

async function runScraper(env: Env): Promise<void> {
  try {
    const result = await scrapeAsianFilmFestivals(
      env.DB,
      env.ANTHROPIC_API_KEY,
      env.AI,
      env.AI_AUTO_PUBLISH === 'true',
    );
    console.log(`[Cron] Scraper — saved: ${result.saved}, skipped: ${result.skipped}`);
    if (result.errors.length) {
      console.error('[Cron] Scraper errors:', result.errors);
    }
  } catch (err) {
    console.error('[Cron] Scraper failed:', err);
  }
}

async function checkMonitorCommands(env: Env): Promise<void> {
  const commands = await env.DB.prepare(
    `SELECT mc.*,
            CASE mc.ref_table
              WHEN 'festivals' THEN f.name
              WHEN 'funds_grants' THEN fg.name
              WHEN 'education_residency' THEN er.name
            END as ref_name,
            CASE mc.ref_table
              WHEN 'festivals' THEN f.regular_deadline
              WHEN 'funds_grants' THEN fg.deadline
              WHEN 'education_residency' THEN er.deadline
            END as deadline
     FROM monitor_commands mc
     LEFT JOIN festivals f ON mc.ref_table = 'festivals' AND mc.ref_id = f.id
     LEFT JOIN funds_grants fg ON mc.ref_table = 'funds_grants' AND mc.ref_id = fg.id
     LEFT JOIN education_residency er ON mc.ref_table = 'education_residency' AND mc.ref_id = er.id
     WHERE mc.is_active = 1`
  ).all();

  const today = new Date();
  const toAlert: AlertItem[] = [];

  for (const cmd of commands.results as any[]) {
    if (!cmd.deadline) continue;

    const deadline = new Date(cmd.deadline);
    const daysUntil = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil === cmd.alert_days_before || daysUntil === 1) {
      // Deduplication: skip if alert already sent for this monitor in last 24h
      const alreadySent = await env.DB.prepare(
        `SELECT id FROM email_logs
         WHERE template = 'alert' AND ref_table = ? AND ref_id = ?
           AND created_at > datetime('now', '-24 hours')`
      ).bind(cmd.ref_table, cmd.ref_id).first();

      if (alreadySent) {
        console.log(`[Cron] Monitor alert skipped (dedup): ${cmd.ref_name} (${cmd.ref_table}/${cmd.ref_id})`);
        continue;
      }

      toAlert.push({ cmd, daysUntil });
    }
  }

  if (toAlert.length === 0) return;

  // Send all alerts in a single bundled email
  const tomorrowCount = toAlert.filter((a) => a.daysUntil === 1).length;
  const subject =
    toAlert.length === 1
      ? (toAlert[0].daysUntil === 1
          ? `[IFT] TOMORROW: ${toAlert[0].cmd.ref_name || toAlert[0].cmd.target_name}`
          : `[IFT] ${toAlert[0].daysUntil} days left: ${toAlert[0].cmd.ref_name || toAlert[0].cmd.target_name}`)
      : `[IFT] ${toAlert.length} deadline alerts${tomorrowCount > 0 ? ` (${tomorrowCount} tomorrow)` : ''}`;

  await sendEmail(env, {
    to: env.ALERT_EMAIL,
    subject,
    html: buildBundledAlertEmail(toAlert),
  });

  // Update DB for all triggered monitors
  for (const { cmd, daysUntil } of toAlert) {
    await env.DB.prepare(
      `UPDATE monitor_commands SET last_triggered = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(cmd.id).run();

    await env.DB.prepare(
      `INSERT INTO email_logs (to_email, subject, template, ref_table, ref_id, status)
       VALUES (?, ?, 'alert', ?, ?, 'sent')`
    ).bind(env.ALERT_EMAIL, subject, cmd.ref_table, cmd.ref_id).run();

    console.log(`[Cron] Alert queued: ${cmd.ref_name} (${daysUntil}d)`);
  }
}

async function sendDailyDigest(env: Env): Promise<void> {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek !== 1) return; // Monday digest only

  // Owner digest — global upcoming deadlines
  const upcoming = await env.DB.prepare(
    `SELECT 'festival' as type, name, regular_deadline as deadline, website
     FROM festivals WHERE regular_deadline >= date('now') AND regular_deadline <= date('now', '+30 days') AND status = 'active'
     UNION ALL
     SELECT 'fund' as type, name, deadline, website
     FROM funds_grants WHERE deadline >= date('now') AND deadline <= date('now', '+30 days') AND status = 'active'
     UNION ALL
     SELECT 'education' as type, name, deadline, website
     FROM education_residency WHERE deadline >= date('now') AND deadline <= date('now', '+30 days') AND status = 'active'
     ORDER BY deadline ASC
     LIMIT 20`
  ).all();

  if (upcoming.results.length > 0) {
    await sendEmail(env, {
      to: env.ALERT_EMAIL,
      subject: '[IFT] Weekly Digest — Upcoming Deadlines',
      html: buildDigestEmail(upcoming.results as DigestItem[]),
    });
  }

  // Member digests — personalized by watchlist
  const members = await env.DB.prepare(
    `SELECT id, name, email FROM users WHERE role = 'member' AND status = 'approved' AND email IS NOT NULL`
  ).all<{ id: number; name: string; email: string }>();

  for (const member of members.results) {
    const watchlistItems = await env.DB.prepare(
      `SELECT
         CASE w.ref_table
           WHEN 'festivals'           THEN 'festival'
           WHEN 'funds_grants'        THEN 'fund'
           WHEN 'education_residency' THEN 'education'
         END as type,
         COALESCE(f.name, fg.name, er.name) as name,
         COALESCE(f.regular_deadline, fg.deadline, er.deadline) as deadline,
         COALESCE(f.website, fg.website, er.website) as website
       FROM watchlist w
       LEFT JOIN festivals f          ON w.ref_table = 'festivals'          AND w.ref_id = f.id
       LEFT JOIN funds_grants fg      ON w.ref_table = 'funds_grants'       AND w.ref_id = fg.id
       LEFT JOIN education_residency er ON w.ref_table = 'education_residency' AND w.ref_id = er.id
       WHERE w.user_id = ?
         AND COALESCE(f.regular_deadline, fg.deadline, er.deadline) >= date('now')
         AND COALESCE(f.regular_deadline, fg.deadline, er.deadline) <= date('now', '+30 days')
       ORDER BY deadline ASC
       LIMIT 20`
    ).bind(member.id).all<DigestItem>();

    if (watchlistItems.results.length === 0) continue;

    await sendEmail(env, {
      to: member.email,
      subject: '[IFT] Your Weekly Watchlist Digest',
      html: buildDigestEmail(watchlistItems.results, member.name),
    });

    console.log(`[Cron] Member digest sent to ${member.email} (${watchlistItems.results.length} items)`);
  }
}

export async function checkPendingDeadlines(env: Env): Promise<{ updated: number; queued: number; pending: number }> {
  if (!env.ANTHROPIC_API_KEY) {
    console.warn('[Cron] No ANTHROPIC_API_KEY, skipping pending deadline check.');
    return { updated: 0, pending: 0 };
  }

  // Find all active monitors where the referenced item has no deadline yet
  const rows = await env.DB.prepare(`
    SELECT
      mc.id as monitor_id, mc.ref_table, mc.ref_id, mc.target_url,
      CASE mc.ref_table
        WHEN 'festivals' THEN f.name
        WHEN 'funds_grants' THEN fg.name
        WHEN 'education_residency' THEN er.name
      END as name,
      CASE mc.ref_table
        WHEN 'festivals' THEN f.country
        ELSE NULL
      END as country,
      CASE mc.ref_table
        WHEN 'festivals' THEN f.website
        WHEN 'funds_grants' THEN fg.website
        WHEN 'education_residency' THEN er.website
      END as website
    FROM monitor_commands mc
    LEFT JOIN festivals f          ON mc.ref_table = 'festivals'          AND mc.ref_id = f.id
    LEFT JOIN funds_grants fg      ON mc.ref_table = 'funds_grants'       AND mc.ref_id = fg.id
    LEFT JOIN education_residency er ON mc.ref_table = 'education_residency' AND mc.ref_id = er.id
    WHERE mc.is_active = 1
      AND (
        (mc.ref_table = 'festivals'           AND (f.regular_deadline IS NULL OR f.regular_deadline < date('now')))
        OR (mc.ref_table = 'funds_grants'      AND (fg.deadline IS NULL OR fg.deadline < date('now')))
        OR (mc.ref_table = 'education_residency' AND (er.deadline IS NULL OR er.deadline < date('now')))
      )
  `).all<{ monitor_id: number; ref_table: string; ref_id: number; target_url: string | null; name: string; country: string | null; website: string | null }>();

  const monitors = rows.results.filter(r => r.name);
  const updatedItems: DeadlineCheckItem[] = [];
  const pendingItems: DeadlineCheckItem[] = [];

  // Process in batches of 3 to avoid rate limits
  for (let i = 0; i < monitors.length; i += 3) {
    const batch = monitors.slice(i, i + 3);
    await Promise.allSettled(batch.map(async (m) => {
      try {
        const candidate = await searchFestivalDeadlineWithAI(m.name, m.country, env.ANTHROPIC_API_KEY);
        if (candidate) {
          await queueDeadlineCandidate(env.DB, m.ref_table, m.ref_id, m.name, candidate);
          const proposedDate = candidate.deadline_regular ?? candidate.deadline_early ?? undefined;
          updatedItems.push({
            name: m.name,
            refTable: m.ref_table,
            refId: m.ref_id,
            found: true,
            deadline: proposedDate,
            website: candidate.source_url ?? m.website ?? undefined,
          });
          console.log(`[Cron] Deadline candidate queued for review: "${m.name}" (${proposedDate})`);
        } else {
          pendingItems.push({ name: m.name, refTable: m.ref_table, refId: m.ref_id, found: false, website: m.website ?? undefined });
        }
      } catch (e) {
        console.error(`[Cron] Deadline search failed for "${m.name}":`, e);
        pendingItems.push({ name: m.name, refTable: m.ref_table, refId: m.ref_id, found: false });
      }
    }));
  }

  const ts = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  await sendEmail(env, {
    to: env.ALERT_EMAIL,
    subject: `🎬 Festival Deadline Check — ${updatedItems.length} awaiting review, ${pendingItems.length} pending`,
    html: buildDeadlineCheckEmail(updatedItems, pendingItems, ts),
  });

  console.log(`[Cron] Deadline check done — queued: ${updatedItems.length}, pending: ${pendingItems.length}`);
  return { updated: 0, queued: updatedItems.length, pending: pendingItems.length };
}

async function sendEmail(
  env: Env,
  opts: { to: string; subject: string; html: string }
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('[Email] No RESEND_API_KEY set, skipping send.');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'IFT <noreply@indiefilmmakingtracker.com>',
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Email] Send failed:', err);
  }
}

async function sendErrorAlert(env: Env, failed: Array<{ task: string; reason: unknown }>): Promise<void> {
  await sendEmail(env, {
    to: env.ALERT_EMAIL,
    subject: `[IFT] Cron failure — ${failed.length} task(s) failed`,
    html: buildErrorAlertEmail(failed),
  });
}
