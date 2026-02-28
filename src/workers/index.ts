// IFT Worker — Main Entry
// Hono.js routing on Cloudflare Workers

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler';
import { handleCron } from './cron';

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
}

const app = new Hono<{ Bindings: Env }>();

// CORS only for API routes
app.use('/api/*', cors({ origin: '*' }));

// ============================================================
// Health
// ============================================================
app.get('/api/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() })
);

// ============================================================
// MODULE 1: Festivals
// ============================================================
app.get('/api/festivals', async (c) => {
  const { category, tier, status = 'active', limit = '20', offset = '0' } = c.req.query();

  let query = `SELECT * FROM festivals WHERE status = ?`;
  const params: unknown[] = [status];

  if (category) { query += ` AND category = ?`; params.push(category); }
  if (tier)     { query += ` AND tier = ?`;     params.push(tier); }

  query += ` ORDER BY regular_deadline ASC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results, total: result.results.length });
});

app.get('/api/festivals/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM festivals WHERE id = ?`)
    .bind(c.req.param('id'))
    .first();
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404);
});

app.post('/api/festivals', async (c) => {
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
  )
    .bind(name, name_vi, country, city, website, filmfreeway_url, category, tier,
      early_deadline, regular_deadline, late_deadline, notification_date, festival_dates,
      entry_fee_early, entry_fee_regular, description, description_vi, source)
    .run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// ============================================================
// MODULE 2: Funds & Grants
// ============================================================
app.get('/api/funds', async (c) => {
  const { type, focus, region_focus, status = 'active' } = c.req.query();

  let query = `SELECT * FROM funds_grants WHERE status = ?`;
  const params: unknown[] = [status];

  if (type)         { query += ` AND type = ?`;         params.push(type); }
  if (focus)        { query += ` AND focus = ?`;        params.push(focus); }
  if (region_focus) { query += ` AND region_focus = ?`; params.push(region_focus); }

  query += ` ORDER BY deadline ASC LIMIT 50`;

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.get('/api/funds/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM funds_grants WHERE id = ?`)
    .bind(c.req.param('id'))
    .first();
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404);
});

// ============================================================
// MODULE 3: Education & Residency
// ============================================================
app.get('/api/education', async (c) => {
  const { type, status = 'active' } = c.req.query();

  let query = `SELECT * FROM education_residency WHERE status = ?`;
  const params: unknown[] = [status];

  if (type) { query += ` AND type = ?`; params.push(type); }

  query += ` ORDER BY deadline ASC LIMIT 50`;

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.get('/api/education/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM education_residency WHERE id = ?`)
    .bind(c.req.param('id'))
    .first();
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404);
});

// ============================================================
// MODULE 4: Monitor Commands (Command Center)
// ============================================================
app.get('/api/monitors', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT * FROM monitor_commands ORDER BY created_at DESC`
  ).all();
  return c.json({ data: result.results });
});

app.post('/api/monitors', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const { target_url, target_name, monitor_type, ref_id, ref_table, watch_for, alert_days_before } = body as any;

  const result = await c.env.DB.prepare(
    `INSERT INTO monitor_commands (target_url, target_name, monitor_type, ref_id, ref_table, watch_for, alert_days_before)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(target_url, target_name, monitor_type, ref_id, ref_table, watch_for, alert_days_before ?? 7)
    .run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

app.delete('/api/monitors/:id', async (c) => {
  await c.env.DB.prepare(`UPDATE monitor_commands SET is_active = 0 WHERE id = ?`)
    .bind(c.req.param('id'))
    .run();
  return c.json({ ok: true });
});

// Upcoming deadlines summary
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
// Static asset serving (Workers Sites catch-all)
// Serves the React SPA; falls back to index.html for client-side routing
// ============================================================
app.get('*', async (c) => {
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
      // SPA fallback: serve index.html for any unmatched path
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

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env));
  },
};
