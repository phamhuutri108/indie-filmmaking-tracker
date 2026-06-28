// IFT Email Templates
// Centralized HTML email builders — imported by cron.ts

export type AlertItem = { cmd: any; daysUntil: number };
export type DigestItem = { type: string; name: string; deadline: string; website: string };

const FOOTER = `
  <hr/>
  <p style="color:#718096;font-size:12px;">IFT — Indie Filmmaking Tracker | <a href="https://www.indiefilmmakingtracker.com">Dashboard</a></p>
`;

export function buildBundledAlertEmail(alerts: AlertItem[]): string {
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
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;padding:20px;">
      <h2 style="color:#e53e3e;">⚠️ Deadline Alerts / Nhắc nhở hạn chót</h2>
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
      ${FOOTER}
    </div>
  `;
}

export function buildDigestEmail(items: DigestItem[], recipientName?: string): string {
  const rows = items
    .map((i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${i.type}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;"><a href="${i.website}">${i.name}</a></td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${i.deadline}</td>
      </tr>`)
    .join('');

  const greeting = recipientName ? `<p>Hi ${recipientName},</p>` : '';

  return `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px;">
      <h2>🎬 IFT Weekly Digest</h2>
      ${greeting}
      <p>Upcoming deadlines in the next 30 days / Hạn chót trong 30 ngày tới:</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#2d3748;color:white;">
            <th style="padding:8px;text-align:left;">Type</th>
            <th style="padding:8px;text-align:left;">Name</th>
            <th style="padding:8px;text-align:left;">Deadline</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${FOOTER}
    </div>
  `;
}

export type DeadlineCheckItem = {
  name: string;
  refTable: string;
  refId: number;
  found: boolean;
  deadline?: string;
  website?: string;
};

export function buildDeadlineCheckEmail(
  updated: DeadlineCheckItem[],
  pending: DeadlineCheckItem[],
  ts: string
): string {
  const updatedRows = updated
    .map((i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${i.name}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#276749;">${i.deadline}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${i.website ? `<a href="${i.website}" style="color:#004aad;">${i.website}</a>` : '—'}</td>
      </tr>`)
    .join('');

  const pendingRows = pending
    .map((i) => `<li>${i.name}</li>`)
    .join('');

  const updatedSection = updated.length > 0 ? `
    <h3 style="color:#276749;">🔎 DEADLINE CHỜ XÁC MINH (${updated.length}):</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#2d3748;color:white;">
          <th style="padding:8px;text-align:left;">Festival</th>
          <th style="padding:8px;text-align:left;">Ngày đề xuất</th>
          <th style="padding:8px;text-align:left;">Nguồn cần kiểm tra</th>
        </tr>
      </thead>
      <tbody>${updatedRows}</tbody>
    </table>` : '';

  const pendingSection = pending.length > 0 ? `
    <h3 style="color:#c05621;">⏳ CHƯA TÌM THẤY DEADLINE (${pending.length}):</h3>
    <ul style="margin:0;padding-left:20px;">${pendingRows}</ul>
    <p style="color:#718096;font-size:13px;">→ Sẽ kiểm tra lại sau 2 tuần</p>` : '';

  return `
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;padding:20px;">
      <h2>🎬 BÁO CÁO KIỂM TRA DEADLINE FESTIVAL</h2>
      <p style="color:#718096;">📅 Thời gian: ${ts}</p>
      <hr/>
      ${updatedSection}
      ${pendingSection}
      <hr/>
      <p style="color:#718096;font-size:12px;">
        💡 Các ngày tìm thấy chưa được ghi vào dữ liệu chính. Hãy duyệt trong Data Review.<br/>
        ⚙️ Script chạy tự động mỗi 2 tuần (thứ 2, 9h sáng)
      </p>
      ${FOOTER}
    </div>
  `;
}

export function buildErrorAlertEmail(failed: Array<{ task: string; reason: unknown }>): string {
  const rows = failed
    .map(f => `<li><strong>${f.task}</strong>: ${String(f.reason)}</li>`)
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#e53e3e;">⚠️ IFT Cron Job Failed</h2>
      <p>${failed.length} task(s) failed during the daily run at ${new Date().toISOString()}:</p>
      <ul>${rows}</ul>
      <p>Check Cloudflare Workers logs for details.</p>
      ${FOOTER}
    </div>
  `;
}
