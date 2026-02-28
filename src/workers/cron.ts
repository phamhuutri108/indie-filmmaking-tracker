// IFT Cron Job — Daily at 08:00 UTC
// Runs via Cloudflare Cron Trigger

import { scrapeAsianFilmFestivals, scrapeCineuropaRss } from './scraper';
import { scrapeFunds } from './fund-scraper';

export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  ALERT_EMAIL: string;
  APP_URL: string;
}

export async function handleCron(env: Env): Promise<void> {
  console.log('[IFT Cron] Starting daily run:', new Date().toISOString());

  await Promise.allSettled([
    runScraper(env),
    runCineuropa(env),
    runFundScraper(env),
    checkMonitorCommands(env),
    sendDailyDigest(env),
  ]);

  console.log('[IFT Cron] Done.');
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
    const result = await scrapeCineuropaRss(env.DB);
    console.log(`[Cron] Cineuropa — saved: ${result.saved}, skipped: ${result.skipped}`);
    if (result.errors.length) console.error('[Cron] Cineuropa errors:', result.errors);
  } catch (err) {
    console.error('[Cron] Cineuropa failed:', err);
  }
}

async function runScraper(env: Env): Promise<void> {
  try {
    const result = await scrapeAsianFilmFestivals(env.DB);
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

  for (const cmd of commands.results as any[]) {
    if (!cmd.deadline) continue;

    const deadline = new Date(cmd.deadline);
    const daysUntil = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil === cmd.alert_days_before || daysUntil === 1) {
      await triggerAlert(env, cmd, daysUntil);
    }
  }
}

async function triggerAlert(env: Env, cmd: any, daysUntil: number): Promise<void> {
  const subject =
    daysUntil === 1
      ? `[IFT] TOMORROW: ${cmd.ref_name || cmd.target_name}`
      : `[IFT] ${daysUntil} days left: ${cmd.ref_name || cmd.target_name}`;

  await sendEmail(env, {
    to: env.ALERT_EMAIL,
    subject,
    html: buildAlertEmail(cmd, daysUntil),
  });

  await env.DB.prepare(
    `UPDATE monitor_commands SET last_triggered = CURRENT_TIMESTAMP WHERE id = ?`
  )
    .bind(cmd.id)
    .run();

  await env.DB.prepare(
    `INSERT INTO email_logs (to_email, subject, template, ref_table, ref_id, status)
     VALUES (?, ?, 'alert', ?, ?, 'sent')`
  )
    .bind(env.ALERT_EMAIL, subject, cmd.ref_table, cmd.ref_id)
    .run();
}

async function sendDailyDigest(env: Env): Promise<void> {
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

  if (upcoming.results.length === 0) return;

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek !== 1) return; // Monday digest only

  await sendEmail(env, {
    to: env.ALERT_EMAIL,
    subject: '[IFT] Weekly Digest — Upcoming Deadlines',
    html: buildDigestEmail(upcoming.results as any[]),
  });
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
      from: 'IFT <noreply@ift.phamhuutri.com>',
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

function buildAlertEmail(cmd: any, daysUntil: number): string {
  const name = cmd.ref_name || cmd.target_name || cmd.target_url;
  const deadline = cmd.deadline ? new Date(cmd.deadline).toDateString() : 'TBD';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e53e3e;">⚠️ Deadline Alert / Nhắc nhở hạn chót</h2>
      <p><strong>${name}</strong></p>
      <p>Deadline: <strong>${deadline}</strong> (${daysUntil === 1 ? 'TOMORROW / NGÀY MAI' : `${daysUntil} days / ${daysUntil} ngày`})</p>
      ${cmd.target_url ? `<p><a href="${cmd.target_url}">View → ${cmd.target_url}</a></p>` : ''}
      <hr/>
      <p style="color: #718096; font-size: 12px;">IFT — Indie Filmmaking Tracker | <a href="https://ift.phamhuutri.com">Dashboard</a></p>
    </div>
  `;
}

function buildDigestEmail(items: any[]): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.type}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><a href="${i.website}">${i.name}</a></td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.deadline}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h2>🎬 IFT Weekly Digest</h2>
      <p>Upcoming deadlines in the next 30 days / Hạn chót trong 30 ngày tới:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #2d3748; color: white;">
            <th style="padding: 8px; text-align: left;">Type</th>
            <th style="padding: 8px; text-align: left;">Name</th>
            <th style="padding: 8px; text-align: left;">Deadline</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <hr/>
      <p style="color: #718096; font-size: 12px;">IFT — Indie Filmmaking Tracker</p>
    </div>
  `;
}
