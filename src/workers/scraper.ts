// IFT Scraper — RSS + HTML
// Cloudflare Workers runtime only

// ============================================================
// Types
// ============================================================

export interface RssItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  description: string; // short CDATA text
  content: string;     // full HTML (content:encoded)
  categories: string[];
}

export interface ParsedFestival {
  name: string;
  country: string | null;
  website: string | null;        // direct submission site (or article as fallback)
  filmfreeway_url: string | null;
  category: string | null;       // documentary | short | animation | experimental
  early_deadline: string | null; // YYYY-MM-DD
  regular_deadline: string | null;
  notification_date: string | null;
  festival_dates: string | null;
  description: string;
  source: 'rss';
}

export interface ScrapeResult {
  saved: number;
  skipped: number;
  errors: string[];
}

// ============================================================
// Constants
// ============================================================

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

const COUNTRY_TAG_MAP: Record<string, string> = {
  korea: 'South Korea', southkorea: 'South Korea',
  japan: 'Japan', india: 'India', china: 'China',
  taiwan: 'Taiwan', indonesia: 'Indonesia', philippines: 'Philippines',
  vietnam: 'Vietnam', thailand: 'Thailand', singapore: 'Singapore',
  malaysia: 'Malaysia', hongkong: 'Hong Kong', bangladesh: 'Bangladesh',
  pakistan: 'Pakistan', srilanka: 'Sri Lanka', nepal: 'Nepal',
  myanmar: 'Myanmar', cambodia: 'Cambodia', laos: 'Laos',
  mongolia: 'Mongolia', kazakhstan: 'Kazakhstan',
};

const ASIAN_FILM_FESTIVALS_FEED = 'https://asianfilmfestivals.com/feed';

// ============================================================
// Low-level XML / HTML helpers
// ============================================================

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

function stripCdata(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ============================================================
// Date parsing
// ============================================================

/** Convert date strings like "April 29, 2026" or "29 April 2026" → "YYYY-MM-DD" */
function parseDate(raw: string, fallbackYear?: number): string | null {
  const cleaned = raw
    .replace(/\([^)]*\)/g, '') // strip "(KST)", "(17:00 pm Japan Time)"
    .replace(/\|.*/g, '')      // strip "| 17:00 pm KST"
    .replace(/\bat\s+\d+:\d+.*/gi, '')
    .trim();

  // "Month Day, Year" or "Month Day Year"
  let m = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month) return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
  }

  // "Day Month Year"
  m = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase()];
    if (month) return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
  }

  // "Month Day" with no year — use fallback
  if (fallbackYear) {
    m = cleaned.match(/([A-Za-z]+)\s+(\d{1,2})(?!\s*,?\s*\d{4})/);
    if (m) {
      const month = MONTH_MAP[m[1].toLowerCase()];
      if (month) return `${fallbackYear}-${month}-${m[2].padStart(2, '0')}`;
    }
  }

  return null;
}

/** Get year number from RFC-2822 pubDate "Fri, 27 Feb 2026 22:15:59 +0000" */
function pubDateYear(pubDate: string): number {
  const m = pubDate.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : new Date().getFullYear();
}

function collectDatesFromText(text: string, fallbackYear: number): string[] {
  const pattern =
    /([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2}(?!\s*,?\s*\d{4}))/g;
  const seen = new Set<string>();
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const d = parseDate(m[1], fallbackYear);
    if (d && !seen.has(d)) { seen.add(d); results.push(d); }
  }
  return results;
}

// ============================================================
// Extraction helpers (all operate on real asianfilmfestivals.com patterns)
// ============================================================

/**
 * Extract clean festival name.
 * Primary: description text "The {NAME} ({Country}) is accepting..."
 * Fallback: title stripped of ordinal prefix and "– Call for Entry YYYY" suffix.
 */
function extractFestivalName(description: string, title: string): string {
  const m = description.match(/^The (.+?) \([^)]+\) is accepting/i);
  if (m) return m[1].trim();

  return title
    .replace(/^\d+(?:st|nd|rd|th)\s+/i, '')
    .replace(/\s*[–—-]+\s*Call for Entr(?:y|ies).*/i, '')
    .replace(/\s*[–—-]+\s*Open Call.*/i, '')
    .replace(/\s*[–—-]+\s*Submissions?.*/i, '')
    .replace(/\s*\d{4}$/, '')
    .trim();
}

/**
 * Extract country from "(Country) is accepting" in description.
 * Falls back to RSS category tags mapping.
 */
function extractCountry(description: string, categories: string[]): string | null {
  const m = description.match(/\(([^)]+)\)\s+is accepting/i);
  if (m) return m[1].trim();

  for (const cat of categories) {
    const key = cat.toLowerCase().replace(/\s+/g, '');
    if (COUNTRY_TAG_MAP[key]) return COUNTRY_TAG_MAP[key];
  }
  return null;
}

/**
 * Extract deadlines from content HTML and/or short description.
 *
 * Patterns found in asianfilmfestivals.com content:
 *   – Deadline: April 21, 2026
 *   – Deadlines:
 *       * International (Features) – April 29, 2026 | 17:00 (KST)
 *       * Korean – May 22, 2026 | 17:00 (KST)
 *
 * When multiple deadlines exist (multi-category festivals), we use the
 * earliest one as regular_deadline — it's the most pressing for filmmakers.
 * When "Early Bird" is explicitly labelled, we assign early_deadline separately.
 */
function extractDeadlines(
  content: string,
  description: string,
  fallbackYear: number
): { early: string | null; regular: string | null } {
  const text = stripHtml(content);
  const deadlineIdx = text.search(/deadline[s]?\s*:/i);

  if (deadlineIdx !== -1) {
    const section = text.slice(deadlineIdx, deadlineIdx + 600);
    const dates = collectDatesFromText(section, fallbackYear);

    if (dates.length === 1) return { early: null, regular: dates[0] };
    if (dates.length >= 2) {
      dates.sort();
      const hasEarlyLabel = /early\s*(?:bird|deadline)/i.test(section);
      if (hasEarlyLabel) return { early: dates[0], regular: dates[dates.length - 1] };
      // Multi-category (e.g. International vs Korean): use earliest as regular
      return { early: null, regular: dates[0] };
    }
  }

  // Fallback: "accepting ... until Month [Day[, Year]]" in description
  const untilMatches = [...description.matchAll(/until\s+([A-Za-z]+ \d{1,2}(?:,\s*\d{4})?)/gi)];
  const dates: string[] = [];
  for (const u of untilMatches) {
    const d = parseDate(u[1], fallbackYear);
    if (d) dates.push(d);
  }
  if (dates.length > 0) {
    dates.sort();
    return { early: null, regular: dates[0] };
  }

  return { early: null, regular: null };
}

/**
 * Extract submission URLs from "To submit…" paragraphs in content:encoded.
 * Priority for website: any non-filmfreeway, non-self link in a "To submit" paragraph.
 */
function extractSubmissionUrls(
  content: string,
  articleLink: string
): { website: string | null; filmfreeway: string | null } {
  const ffMatch = content.match(/href="(https?:\/\/filmfreeway\.com\/[^"]+)"/i);
  const filmfreeway = ffMatch ? ffMatch[1] : null;

  const submitParaRe = /<p[^>]*>(?:[^<]|<(?!\/p>))*?to submit(?:[^<]|<(?!\/p>))*?<\/p>/gi;
  let website: string | null = null;
  let m: RegExpExecArray | null;

  while ((m = submitParaRe.exec(content)) !== null) {
    const hrefMatch = m[0].match(/href="([^"]+)"/);
    if (hrefMatch) {
      const url = hrefMatch[1];
      if (
        !url.includes('filmfreeway.com') &&
        !url.includes('asianfilmfestivals.com') &&
        url !== articleLink
      ) {
        website = url;
        break;
      }
    }
  }

  return { website, filmfreeway };
}

/** Extract notification date from "Notification Date: …" in content. */
function extractNotificationDate(content: string, fallbackYear: number): string | null {
  const text = stripHtml(content);
  const m = text.match(/notification\s+date\s*:\s*([^\n.]+)/i);
  if (!m) return null;
  return parseDate(m[1].trim(), fallbackYear);
}

/** Extract festival date range from "will take place from X in City" sentence. */
function extractFestivalDates(content: string): string | null {
  const text = stripHtml(content);
  const m = text.match(/will take place\s+(?:from\s+)?([A-Za-z][\w\s,–\-]+\d{4})/i);
  return m ? m[1].replace(/\s+in\s+.*/i, '').trim() : null;
}

/** Infer film category from RSS category tags and/or content text. */
function inferCategory(categories: string[], content: string): string | null {
  const tags = categories.map((c) => c.toLowerCase());
  const text = stripHtml(content).toLowerCase();

  if (tags.some((t) => t.includes('doc')) || text.includes('documentary')) return 'documentary';
  if (tags.some((t) => t.includes('short')) || text.includes('short film')) return 'short';
  if (tags.some((t) => t.includes('animat')) || text.includes('animation')) return 'animation';
  if (tags.some((t) => t.includes('experi')) || text.includes('experimental')) return 'experimental';
  return null;
}

// ============================================================
// RSS parsing
// ============================================================

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      guid: stripCdata(extractTag(block, 'guid') ?? extractTag(block, 'link') ?? ''),
      title: stripCdata(extractTag(block, 'title') ?? ''),
      link: extractTag(block, 'link') ?? '',
      pubDate: extractTag(block, 'pubDate') ?? '',
      description: stripCdata(extractTag(block, 'description') ?? ''),
      content: stripCdata(extractTag(block, 'content:encoded') ?? extractTag(block, 'description') ?? ''),
      categories: extractAllTags(block, 'category').map(stripCdata),
    });
  }

  return items;
}

export async function fetchRssFeed(url: string): Promise<RssItem[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'IFT-Bot/1.0 (Indie Filmmaking Tracker)' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status} ${url}`);
  return parseRss(await response.text());
}

// ============================================================
// Festival item parser
// ============================================================

/**
 * Parse one RSS item into a structured ParsedFestival.
 * Returns null if the item is not a call-for-entry post.
 */
export function parseFestivalItem(item: RssItem): ParsedFestival | null {
  const isCallForEntry =
    item.categories.some((c) => /call.?for.?entr/i.test(c)) ||
    /call for entr/i.test(item.title);
  if (!isCallForEntry) return null;

  const year = pubDateYear(item.pubDate);
  const name = extractFestivalName(item.description, item.title);
  if (!name) return null;

  const { early, regular } = extractDeadlines(item.content, item.description, year);
  const { website, filmfreeway } = extractSubmissionUrls(item.content, item.link);

  return {
    name,
    country: extractCountry(item.description, item.categories),
    website: website ?? item.link,
    filmfreeway_url: filmfreeway,
    category: inferCategory(item.categories, item.content),
    early_deadline: early,
    regular_deadline: regular,
    notification_date: extractNotificationDate(item.content, year),
    festival_dates: extractFestivalDates(item.content),
    description: item.description,
    source: 'rss',
  };
}

// ============================================================
// D1 persistence
// ============================================================

/**
 * Save parsed festivals to D1.
 * Skips duplicates by (name, regular_deadline) — same festival can reappear next year.
 */
export async function saveFestivals(
  db: D1Database,
  festivals: ParsedFestival[]
): Promise<ScrapeResult> {
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const f of festivals) {
    try {
      const existing = await db
        .prepare(
          `SELECT id FROM festivals
           WHERE name = ?
             AND (regular_deadline = ? OR (regular_deadline IS NULL AND ? IS NULL))`
        )
        .bind(f.name, f.regular_deadline, f.regular_deadline)
        .first<{ id: number }>();

      if (existing) { skipped++; continue; }

      await db
        .prepare(
          `INSERT INTO festivals
             (name, country, website, filmfreeway_url, category,
              early_deadline, regular_deadline, notification_date,
              festival_dates, description, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          f.name, f.country, f.website, f.filmfreeway_url, f.category,
          f.early_deadline, f.regular_deadline, f.notification_date,
          f.festival_dates, f.description, f.source
        )
        .run();

      saved++;
    } catch (err) {
      errors.push(`${f.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { saved, skipped, errors };
}

// ============================================================
// Main entry point called by cron.ts
// ============================================================

/**
 * Fetch asianfilmfestivals.com RSS, parse call-for-entry items,
 * and persist new festivals to D1. Called daily at 08:00 UTC.
 */
export async function scrapeAsianFilmFestivals(db: D1Database): Promise<ScrapeResult> {
  const items = await fetchRssFeed(ASIAN_FILM_FESTIVALS_FEED);
  console.log(`[Scraper] Fetched ${items.length} RSS items from asianfilmfestivals.com`);

  const festivals: ParsedFestival[] = [];
  for (const item of items) {
    const parsed = parseFestivalItem(item);
    if (parsed) festivals.push(parsed);
  }
  console.log(`[Scraper] Parsed ${festivals.length} call-for-entry items`);

  // Cache raw items so already-processed ones are skipped on future runs
  for (const item of items) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO rss_cache
             (feed_url, item_guid, title, link, pub_date, content, processed)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        )
        .bind(
          ASIAN_FILM_FESTIVALS_FEED, item.guid,
          item.title, item.link, item.pubDate, item.description
        )
        .run();
    } catch { /* cache is non-critical */ }
  }

  const result = await saveFestivals(db, festivals);
  console.log(
    `[Scraper] Done — saved: ${result.saved}, skipped: ${result.skipped}` +
    (result.errors.length ? `, errors: ${result.errors.join('; ')}` : '')
  );
  return result;
}

// Kept for ad-hoc use from monitor commands
export async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'IFT-Bot/1.0 (Indie Filmmaking Tracker)' },
  });
  if (!response.ok) throw new Error(`Scrape failed: ${response.status} ${url}`);
  return response.text();
}
