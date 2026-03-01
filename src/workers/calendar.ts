// IFT Calendar Export — ICS (RFC 5545) generator
// Cloudflare Workers runtime only

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string; // YYYY-MM-DD
  url?: string;
}

/** Format a YYYY-MM-DD date to ICS DTSTART/DTEND (all-day: VALUE=DATE) */
function icsDate(date: string): string {
  return date.replace(/-/g, '');
}

/** Escape special ICS characters in text */
function icsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Fold long ICS lines at 75 characters (RFC 5545 requirement) */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

export function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IFT//Indie Filmmaking Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:IFT Deadlines`,
    `X-WR-TIMEZONE:UTC`,
  ];

  for (const ev of events) {
    const dateStr = icsDate(ev.dtstart);
    // DTEND for all-day events = next day
    const dtend = new Date(ev.dtstart);
    dtend.setDate(dtend.getDate() + 1);
    const dtendStr = icsDate(dtend.toISOString().slice(0, 10));

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(foldLine(`SUMMARY:${icsText(ev.summary)}`));
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${dtendStr}`);
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${icsText(ev.description)}`));
    if (ev.url) lines.push(foldLine(`URL:${ev.url}`));
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Build CalendarEvent array from D1 query results */
export function dbRowsToEvents(
  rows: Array<{
    type: string;
    id: number;
    name: string;
    deadline: string;
    website?: string;
  }>
): CalendarEvent[] {
  return rows
    .filter((r) => r.deadline)
    .map((r) => ({
      uid: `${r.type}-${r.id}@indiefilmmakingtracker.com`,
      summary: `[${r.type.toUpperCase()}] ${r.name} — Deadline`,
      description: `Deadline for ${r.name}`,
      dtstart: r.deadline,
      url: r.website,
    }));
}
