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

  const tasks: Array<[string, Promise<void>]> = [
    ['AsianFilmFestivals scraper', runScraper(env)],
    ['Cineuropa scraper', runCineuropa(env)],
    ['Fund scraper', runFundScraper(env)],
    ['Monitor alerts', checkMonitorCommands(env)],
    ['Daily digest', sendDailyDigest(env)],
  ];

  const results = await Promise.allSettled(tasks.map(([, p]) => p));

  const failed = results
    .map((r, i) => (r.status === 'rejected' ? { task: tasks[i][0], reason: r.reason } : null))
    .filter(Boolean) as Array<{ task: string; reason: unknown }>;

  if (failed.length > 0) {
    console.error('[IFT Cron] Failed tasks:', failed.map(f => f.task));
    await sendErrorAlert(env, failed);
  }

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

type AlertItem = { cmd: any; daysUntil: number };

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

function buildBundledAlertEmail(alerts: AlertItem[]): string {
  const rows = alerts
    .map(({ cmd, daysUntil }) => {
      const name = cmd.ref_name || cmd.target_name || cmd.target_url;
      const deadline = cmd.deadline ? new Date(cmd.deadline).toDateString() : 'TBD';
      const urgency = daysUntil === 1 ? '🔴 TOMORROW' : `🟡 ${daysUntil} days`;
      const link = cmd.target_url
        ? `<a href="${cmd.target_url}" style="color:#004aad;">${cmd.target_url}</a>`
        : '—';
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${name}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">${deadline}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">${urgency}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${link}</td>
        </tr>`;
    })
    .join('');

  return `
    <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e53e3e;">⚠️ Deadline Alerts / Nhắc nhở hạn chót</h2>
      <p>${alerts.length} monitor(s) triggered today:</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#2d3748;color:white;">
            <th style="padding:8px;text-align:left;">Name</th>
            <th style="padding:8px;text-align:left;">Deadline</th>
            <th style="padding:8px;text-align:left;">Urgency</th>
            <th style="padding:8px;text-align:left;">Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;">
        <a href="https://www.indiefilmmakingtracker.com/monitors" style="color:#004aad;">View all monitors →</a>
      </p>
      <hr/>
      <p style="color:#718096;font-size:12px;">IFT — Indie Filmmaking Tracker</p>
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

async function sendErrorAlert(env: Env, failed: Array<{ task: string; reason: unknown }>): Promise<void> {
  const rows = failed
    .map(f => `<li><strong>${f.task}</strong>: ${String(f.reason)}</li>`)
    .join('');

  await sendEmail(env, {
    to: env.ALERT_EMAIL,
    subject: `[IFT] Cron failure — ${failed.length} task(s) failed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e53e3e;">⚠️ IFT Cron Job Failed</h2>
        <p>${failed.length} task(s) failed during the daily run at ${new Date().toISOString()}:</p>
        <ul>${rows}</ul>
        <p>Check Cloudflare Workers logs for details.</p>
        <hr/>
        <p style="color: #718096; font-size: 12px;">IFT — Indie Filmmaking Tracker</p>
      </div>
    `,
  });
}
