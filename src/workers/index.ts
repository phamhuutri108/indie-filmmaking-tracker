// IFT Worker — Main Entry
// Hono.js routing on Cloudflare Workers

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler';
import { handleCron } from './cron';
import { scrapeAsianFilmFestivals } from './scraper';
import { scrapeFunds } from './fund-scraper';
import { generateICS, dbRowsToEvents } from './calendar';

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
// Manual scrape trigger
// ============================================================
app.get('/api/scrape', async (c) => {
  const result = await scrapeAsianFilmFestivals(c.env.DB);
  return c.json({
    saved: result.saved,
    skipped: result.skipped,
    errors: result.errors,
    ts: new Date().toISOString(),
  });
});

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
// Manual fund scrape trigger
// ============================================================
app.get('/api/funds/scrape', async (c) => {
  const result = await scrapeFunds(c.env.DB);
  return c.json({
    saved: result.saved,
    skipped: result.skipped,
    errors: result.errors,
    ts: new Date().toISOString(),
  });
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

app.post('/api/funds', async (c) => {
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
  )
    .bind(name, name_vi, organization, country, website, type, focus, region_focus,
      max_amount, currency ?? 'USD', open_date, deadline, eligibility, eligibility_vi,
      description, description_vi)
    .run();
  return c.json({ id: result.meta.last_row_id }, 201);
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

app.post('/api/education', async (c) => {
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
  )
    .bind(name, name_vi, organization, country, city, website, type,
      duration, application_open, deadline, program_dates, stipend ?? null,
      covers_travel ? 1 : 0, covers_accommodation ? 1 : 0,
      eligibility, eligibility_vi, description, description_vi)
    .run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

// ============================================================
// MODULE 4: Monitor Commands (Command Center)
// ============================================================
app.get('/api/monitors', async (c) => {
  const result = await c.env.DB.prepare(
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
     ORDER BY mc.created_at DESC`
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

// ============================================================
// MODULE 5: My Films
// ============================================================
app.get('/api/films', async (c) => {
  const { status, genre } = c.req.query();
  let query = `SELECT * FROM films WHERE 1=1`;
  const params: unknown[] = [];
  if (status) { query += ` AND status = ?`; params.push(status); }
  if (genre)  { query += ` AND genre = ?`;  params.push(genre); }
  query += ` ORDER BY year DESC, title ASC`;
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.get('/api/films/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM films WHERE id = ?`)
    .bind(c.req.param('id'))
    .first();
  return row ? c.json(row) : c.json({ error: 'Not found' }, 404);
});

app.post('/api/films', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const { title, title_vi, year, genre, duration_min, logline, logline_vi,
          director, producer, status, poster_url, trailer_url, notes } = body as any;
  const result = await c.env.DB.prepare(
    `INSERT INTO films (title, title_vi, year, genre, duration_min, logline, logline_vi,
      director, producer, status, poster_url, trailer_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(title, title_vi, year, genre, duration_min, logline, logline_vi,
    director ?? 'Tri Pham', producer, status ?? 'in-production', poster_url, trailer_url, notes).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

app.put('/api/films/:id', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const { title, title_vi, year, genre, duration_min, logline, logline_vi,
          director, producer, status, poster_url, trailer_url, notes } = body as any;
  await c.env.DB.prepare(
    `UPDATE films SET title=?, title_vi=?, year=?, genre=?, duration_min=?, logline=?, logline_vi=?,
      director=?, producer=?, status=?, poster_url=?, trailer_url=?, notes=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(title, title_vi, year, genre, duration_min, logline, logline_vi,
    director, producer, status, poster_url, trailer_url, notes, c.req.param('id')).run();
  return c.json({ ok: true });
});

app.delete('/api/films/:id', async (c) => {
  await c.env.DB.prepare(`DELETE FROM films WHERE id = ?`).bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ============================================================
// MODULE 5: Submissions
// ============================================================
app.get('/api/submissions', async (c) => {
  const { film_id, status, ref_table } = c.req.query();
  let query = `SELECT * FROM submissions WHERE 1=1`;
  const params: unknown[] = [];
  if (film_id)   { query += ` AND film_id = ?`;   params.push(Number(film_id)); }
  if (status)    { query += ` AND status = ?`;     params.push(status); }
  if (ref_table) { query += ` AND ref_table = ?`;  params.push(ref_table); }
  query += ` ORDER BY created_at DESC`;
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

app.post('/api/submissions', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const { film_id, film_title, ref_table, ref_id, ref_name, deadline,
          submitted_at, submission_platform, submission_url, entry_fee_paid,
          status, result_date, notes } = body as any;
  const result = await c.env.DB.prepare(
    `INSERT INTO submissions (film_id, film_title, ref_table, ref_id, ref_name, deadline,
      submitted_at, submission_platform, submission_url, entry_fee_paid, status, result_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(film_id, film_title, ref_table, ref_id, ref_name, deadline,
    submitted_at, submission_platform ?? 'direct', submission_url, entry_fee_paid,
    status ?? 'draft', result_date, notes).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

app.put('/api/submissions/:id', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const { status, submitted_at, result_date, notes, entry_fee_paid,
          submission_platform, submission_url } = body as any;
  await c.env.DB.prepare(
    `UPDATE submissions SET status=?, submitted_at=?, result_date=?, notes=?,
      entry_fee_paid=?, submission_platform=?, submission_url=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(status, submitted_at, result_date, notes, entry_fee_paid,
    submission_platform, submission_url, c.req.param('id')).run();
  return c.json({ ok: true });
});

app.delete('/api/submissions/:id', async (c) => {
  await c.env.DB.prepare(`DELETE FROM submissions WHERE id = ?`).bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

// ============================================================
// MODULE 6: Watchlist
// ============================================================
app.get('/api/watchlist', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT w.*,
            CASE w.ref_table
              WHEN 'festivals' THEN f.name
              WHEN 'funds_grants' THEN fg.name
              WHEN 'education_residency' THEN er.name
            END as ref_name,
            CASE w.ref_table
              WHEN 'festivals' THEN f.regular_deadline
              WHEN 'funds_grants' THEN fg.deadline
              WHEN 'education_residency' THEN er.deadline
            END as deadline,
            CASE w.ref_table
              WHEN 'festivals' THEN f.website
              WHEN 'funds_grants' THEN fg.website
              WHEN 'education_residency' THEN er.website
            END as website,
            CASE w.ref_table
              WHEN 'festivals' THEN f.country
              WHEN 'funds_grants' THEN fg.country
              WHEN 'education_residency' THEN er.country
            END as country
     FROM watchlist w
     LEFT JOIN festivals f ON w.ref_table = 'festivals' AND w.ref_id = f.id
     LEFT JOIN funds_grants fg ON w.ref_table = 'funds_grants' AND w.ref_id = fg.id
     LEFT JOIN education_residency er ON w.ref_table = 'education_residency' AND w.ref_id = er.id
     ORDER BY deadline ASC`
  ).all();
  return c.json({ data: result.results });
});

app.post('/api/watchlist', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const { ref_table, ref_id, notes } = body as any;
  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO watchlist (ref_table, ref_id, notes) VALUES (?, ?, ?)`
    ).bind(ref_table, ref_id, notes ?? null).run();
    return c.json({ id: result.meta.last_row_id }, 201);
  } catch {
    return c.json({ error: 'Already in watchlist' }, 409);
  }
});

app.delete('/api/watchlist/:id', async (c) => {
  await c.env.DB.prepare(`DELETE FROM watchlist WHERE id = ?`)
    .bind(c.req.param('id'))
    .run();
  return c.json({ ok: true });
});

// Toggle by ref_table + ref_id (used by star buttons in lists)
app.delete('/api/watchlist/ref/:ref_table/:ref_id', async (c) => {
  await c.env.DB.prepare(
    `DELETE FROM watchlist WHERE ref_table = ? AND ref_id = ?`
  ).bind(c.req.param('ref_table'), c.req.param('ref_id')).run();
  return c.json({ ok: true });
});

// ============================================================
// Stats summary for dashboard cards
// ============================================================
app.get('/api/stats', async (c) => {
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
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM films`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM submissions`).first<{ count: number }>(),
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

// ============================================================
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
// Calendar Export (ICS)
// ============================================================
app.get('/api/calendar/export', async (c) => {
  const include = (c.req.query('include') ?? 'festivals,funds,education').split(',');

  const queries: Promise<{ results: any[] }>[] = [];

  if (include.includes('festivals')) {
    queries.push(
      c.env.DB.prepare(
        `SELECT 'festival' as type, id, name, regular_deadline as deadline, website
         FROM festivals WHERE regular_deadline >= date('now') AND status = 'active'`
      ).all() as Promise<{ results: any[] }>
    );
  }
  if (include.includes('funds')) {
    queries.push(
      c.env.DB.prepare(
        `SELECT 'fund' as type, id, name, deadline, website
         FROM funds_grants WHERE deadline >= date('now') AND status = 'active'`
      ).all() as Promise<{ results: any[] }>
    );
  }
  if (include.includes('education')) {
    queries.push(
      c.env.DB.prepare(
        `SELECT 'education' as type, id, name, deadline, website
         FROM education_residency WHERE deadline >= date('now') AND status = 'active'`
      ).all() as Promise<{ results: any[] }>
    );
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
// Static asset serving (Workers Sites catch-all)
// Serves the React SPA; falls back to index.html for client-side routing.
// API paths are never served HTML — they get a JSON 404 instead.
// ============================================================
app.get('*', async (c) => {
  // Guard: unmatched /api/* routes must never return HTML
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
