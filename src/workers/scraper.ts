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
  fee_early: number | null;    // cents
  fee_regular: number | null;  // cents
  fee_late: number | null;     // cents
  entry_currency: string;      // ISO 4217, e.g. 'USD', 'EUR', 'CHF'
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
const CINEUROPA_RSS_FEED = 'https://cineuropa.org/rss/?lang=en';

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

/**
 * Extract entry fees from content HTML.
 * Looks for "Entry Fee:" / "Submission Fee:" sections and parses
 * early/regular/late tiers and currency (CHF, EUR, GBP, etc.).
 * Returns amounts in cents.
 */
function extractFees(content: string): {
  fee_early: number | null;
  fee_regular: number | null;
  fee_late: number | null;
  currency: string;
} {
  const none = { fee_early: null, fee_regular: null, fee_late: null, currency: 'USD' };
  const text = stripHtml(content);

  // Free / no fee
  if (/no\s+entry\s+fee|free\s+(?:submission|entry|to\s+submit)|entry\s+fee\s*:\s*free/i.test(text)) {
    return none;
  }

  // Find fee section
  const feeIdx = text.search(/(?:entry|submission)\s+fee[s]?\s*:/i);
  if (feeIdx === -1) return none;

  const section = text.slice(feeIdx, feeIdx + 600);

  // Detect currency (order matters: specific codes before generic $)
  let currency = 'USD';
  if (/\bCHF\b/i.test(section)) currency = 'CHF';
  else if (/€|\bEUR\b/i.test(section)) currency = 'EUR';
  else if (/£|\bGBP\b/i.test(section)) currency = 'GBP';
  else if (/\bA\$|\bAUD\b/i.test(section)) currency = 'AUD';
  else if (/\bCA\$|\bCAD\b/i.test(section)) currency = 'CAD';
  else if (/\bHK\$|\bHKD\b/i.test(section)) currency = 'HKD';
  else if (/\bS\$|\bSGD\b/i.test(section)) currency = 'SGD';
  else if (/₩|\bKRW\b/i.test(section)) currency = 'KRW';
  else if (/¥|\bJPY\b|\bCNY\b/i.test(section)) currency = 'JPY';
  else if (/\bNOK\b|\bSEK\b|\bDKK\b/i.test(section)) currency = 'SEK';

  // Amount pattern: optional symbol + number, or number + code
  const amtPat = '(?:[€$£¥₩]|CHF|USD|EUR|GBP|AUD|CAD|HKD|SGD|JPY|KRW|NOK|SEK|DKK)?\\s*(\\d+(?:\\.\\d{1,2})?)\\s*(?:CHF|USD|EUR|GBP|AUD|CAD|HKD|SGD|JPY|KRW|NOK|SEK|DKK)?';

  const earlyRe  = new RegExp(`early(?:\\s*bird)?\\s*[:\\-–]\\s*${amtPat}`, 'i');
  const regularRe = new RegExp(`regular\\s*[:\\-–]\\s*${amtPat}`, 'i');
  const lateRe   = new RegExp(`late\\s*[:\\-–]\\s*${amtPat}`, 'i');

  const earlyMatch   = section.match(earlyRe);
  const regularMatch = section.match(regularRe);
  const lateMatch    = section.match(lateRe);

  if (earlyMatch || regularMatch || lateMatch) {
    return {
      fee_early:   earlyMatch   ? Math.round(parseFloat(earlyMatch[1])   * 100) : null,
      fee_regular: regularMatch ? Math.round(parseFloat(regularMatch[1]) * 100) : null,
      fee_late:    lateMatch    ? Math.round(parseFloat(lateMatch[1])    * 100) : null,
      currency,
    };
  }

  // Single fee amount (no tiers)
  const singleRe = new RegExp(
    '(?:[€$£¥₩]|CHF|USD|EUR|GBP|AUD|CAD|HKD|SGD|JPY|KRW|NOK|SEK|DKK)\\s*(\\d+(?:\\.\\d{1,2})?)' +
    '|(\\d+(?:\\.\\d{1,2})?)\\s*(?:CHF|USD|EUR|GBP|AUD|CAD|HKD|SGD|JPY|KRW|NOK|SEK|DKK)', 'i'
  );
  const singleMatch = section.match(singleRe);
  if (singleMatch) {
    const amt = parseFloat(singleMatch[1] ?? singleMatch[2]);
    if (!isNaN(amt) && amt > 0 && amt < 10000) {
      return { fee_early: null, fee_regular: Math.round(amt * 100), fee_late: null, currency };
    }
  }

  return none;
}

/**
 * Fetch a festival website and return stripped plain text (max 4000 chars).
 * Returns empty string on any error or timeout.
 * Skips known useless URLs (article aggregators, JS-rendered platforms).
 */
async function fetchWebsiteText(url: string): Promise<string> {
  const SKIP = ['asianfilmfestivals.com', 'filmfreeway.com', 'cineuropa.org', 'festhome.com'];
  if (SKIP.some((h) => url.includes(h))) return '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'IFT-Bot/1.0 (Indie Filmmaking Tracker)' },
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const html = await res.text();
    const text = stripHtml(html).slice(0, 4000);
    return text.length > 200 ? text : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Claude Haiku to extract entry fees from text when regex extraction fails.
 * Uses raw fetch (no SDK) — Cloudflare Workers compatible.
 * Returns amounts in cents; currency as ISO 4217.
 */
async function extractFeesWithAI(
  text: string,
  festivalName: string,
  apiKey: string
): Promise<{ fee_early: number | null; fee_regular: number | null; fee_late: number | null; currency: string }> {
  const none = { fee_early: null, fee_regular: null, fee_late: null, currency: 'USD' };
  const snippet = text.slice(0, 2500);
  if (!snippet.trim()) return none;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Extract entry submission fees for film festival "${festivalName}" from the text below.
Return ONLY valid JSON — no explanation:
{"fee_early":null,"fee_regular":null,"fee_late":null,"currency":"USD"}
Rules: amounts in cents (integer), ISO 4217 currency, null if not found.
Text: ${snippet}`,
        }],
      }),
    });

    if (!res.ok) return none;
    const data = await res.json() as { content?: Array<{ type: string; text: string }> };
    const raw = data?.content?.[0]?.text?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return none;

    const p = JSON.parse(jsonMatch[0]);
    return {
      fee_early:   typeof p.fee_early   === 'number' ? Math.round(p.fee_early)   : null,
      fee_regular: typeof p.fee_regular === 'number' ? Math.round(p.fee_regular) : null,
      fee_late:    typeof p.fee_late    === 'number' ? Math.round(p.fee_late)    : null,
      currency:    typeof p.currency    === 'string' && p.currency.length >= 3 ? p.currency.toUpperCase() : 'USD',
    };
  } catch {
    return none;
  }
}

/**
 * Use Claude + web_search to find entry fees for a festival.
 * Handles pause_turn continuation loop (max 3 iterations).
 * Returns amounts in cents; all null if not found.
 */
export async function searchFestivalFeeWithAI(
  festivalName: string,
  country: string | null,
  apiKey: string
): Promise<{ fee_early: number | null; fee_regular: number | null; fee_late: number | null; currency: string }> {
  const none = { fee_early: null, fee_regular: null, fee_late: null, currency: 'USD' };
  type Msg = { role: 'user' | 'assistant'; content: unknown };

  const messages: Msg[] = [{
    role: 'user',
    content: `Search for the current entry/submission fee for "${festivalName}" film festival${country ? ` (${country})` : ''}. Return ONLY this JSON, no explanation:
{"fee_early":null,"fee_regular":null,"fee_late":null,"currency":"USD"}
Rules: amounts in dollars as a number (e.g. $25→25, €10→10), ISO 4217 currency code, null if not found.`,
  }];

  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages,
        }),
      });
      // On rate limit, wait and retry
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') ?? '30', 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      if (!res.ok) return none;

      const data = await res.json() as {
        stop_reason: string;
        content: Array<{ type: string; text?: string }>;
      };

      if (data.stop_reason === 'end_turn') {
        // Concatenate ALL text blocks (JSON often appears in a later block)
        const text = (data.content ?? [])
          .filter((b) => b.type === 'text')
          .map((b) => (b as { text: string }).text)
          .join('\n');
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) return none;
        const p = JSON.parse(jsonMatch[0]);
        // Model returns dollar amounts — convert to cents
        const toCents = (v: unknown) =>
          typeof v === 'number' && v > 0 ? Math.round(v * 100) : null;
        return {
          fee_early:   toCents(p.fee_early),
          fee_regular: toCents(p.fee_regular),
          fee_late:    toCents(p.fee_late),
          currency:    typeof p.currency === 'string' && p.currency.length >= 3 ? p.currency.toUpperCase() : 'USD',
        };
      }

      if (data.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: data.content });
        continue;
      }

      break;
    } catch {
      return none;
    }
  }
  return none;
}

/**
 * Post-process parsed festivals: for entries whose regex found no fees,
 * call Claude AI on the original RSS content to attempt extraction.
 * Runs up to 5 requests concurrently; failures are silently skipped.
 */
async function enrichFeesWithAI(
  entries: Array<{ festival: ParsedFestival; content: string }>,
  apiKey: string
): Promise<void> {
  const noFees = (f: ParsedFestival) =>
    f.fee_early === null && f.fee_regular === null && f.fee_late === null;

  const applyFees = (festival: ParsedFestival, fees: ReturnType<typeof extractFees>) => {
    if (fees.fee_early !== null || fees.fee_regular !== null || fees.fee_late !== null) {
      festival.fee_early   = fees.fee_early;
      festival.fee_regular = fees.fee_regular;
      festival.fee_late    = fees.fee_late;
      festival.entry_currency = fees.currency;
      return true;
    }
    return false;
  };

  const missing = entries.filter((e) => noFees(e.festival));
  if (missing.length === 0) return;
  console.log(`[Scraper] AI fee enrichment for ${missing.length} festivals…`);

  const CONCURRENCY = 5;

  // Pass 1: AI on RSS content
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    await Promise.allSettled(
      missing.slice(i, i + CONCURRENCY).map(async ({ festival, content }) => {
        const fees = await extractFeesWithAI(stripHtml(content), festival.name, apiKey);
        if (applyFees(festival, fees)) {
          console.log(`[Scraper] AI(RSS) fees for "${festival.name}": ${JSON.stringify(fees)}`);
        }
      })
    );
  }

  // Pass 2: fetch official website for festivals still missing fees
  const stillMissing = missing.filter((e) => noFees(e.festival) && e.festival.website);
  if (stillMissing.length > 0) {
    console.log(`[Scraper] Fetching ${stillMissing.length} festival websites for fee data…`);
    for (let i = 0; i < stillMissing.length; i += CONCURRENCY) {
      await Promise.allSettled(
        stillMissing.slice(i, i + CONCURRENCY).map(async ({ festival }) => {
          const text = await fetchWebsiteText(festival.website!);
          if (!text) return;
          const fees = await extractFeesWithAI(text, festival.name, apiKey);
          if (applyFees(festival, fees)) {
            console.log(`[Scraper] AI(web) fees for "${festival.name}": ${JSON.stringify(fees)}`);
          }
        })
      );
    }
  }

  // Pass 3: web search for festivals still missing fees (limit 5 per run to avoid cost)
  const searchNeeded = missing.filter((e) => noFees(e.festival)).slice(0, 5);
  if (searchNeeded.length === 0) return;
  console.log(`[Scraper] Web search for fees: ${searchNeeded.length} festivals…`);

  for (let i = 0; i < searchNeeded.length; i += CONCURRENCY) {
    await Promise.allSettled(
      searchNeeded.slice(i, i + CONCURRENCY).map(async ({ festival }) => {
        const fees = await searchFestivalFeeWithAI(festival.name, festival.country, apiKey);
        if (applyFees(festival, fees)) {
          console.log(`[Scraper] AI(search) fees for "${festival.name}": ${JSON.stringify(fees)}`);
        }
      })
    );
  }
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
  const { fee_early, fee_regular, fee_late, currency } = extractFees(item.content);

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
    fee_early,
    fee_regular,
    fee_late,
    entry_currency: currency,
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

      if (existing) {
        // Festival đã tồn tại — cập nhật section "General" nếu cần
        await db.prepare(`
          INSERT INTO festival_sections
            (festival_id, section_name, category, early_deadline, regular_deadline,
             filmfreeway_url, notification_date, source,
             entry_fee_early, entry_fee_regular, entry_fee_late, entry_currency)
          VALUES (?, 'General', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(festival_id, section_name) DO UPDATE SET
            category = excluded.category,
            early_deadline = excluded.early_deadline,
            regular_deadline = excluded.regular_deadline,
            filmfreeway_url = COALESCE(excluded.filmfreeway_url, filmfreeway_url),
            entry_fee_early = COALESCE(excluded.entry_fee_early, entry_fee_early),
            entry_fee_regular = COALESCE(excluded.entry_fee_regular, entry_fee_regular),
            entry_fee_late = COALESCE(excluded.entry_fee_late, entry_fee_late),
            entry_currency = COALESCE(excluded.entry_currency, entry_currency)
        `).bind(
          existing.id, f.category, f.early_deadline, f.regular_deadline,
          f.filmfreeway_url, f.notification_date, f.source,
          f.fee_early, f.fee_regular, f.fee_late, f.entry_currency
        ).run();
        skipped++;
        continue;
      }

      const insertResult = await db
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

      // Tạo section "General" cho festival mới
      const festivalId = insertResult.meta.last_row_id;
      await db.prepare(`
        INSERT OR IGNORE INTO festival_sections
          (festival_id, section_name, category, early_deadline, regular_deadline,
           filmfreeway_url, notification_date, source,
           entry_fee_early, entry_fee_regular, entry_fee_late, entry_currency)
        VALUES (?, 'General', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        festivalId, f.category, f.early_deadline, f.regular_deadline,
        f.filmfreeway_url, f.notification_date, f.source,
        f.fee_early, f.fee_regular, f.fee_late, f.entry_currency
      ).run();

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
export async function scrapeAsianFilmFestivals(db: D1Database, apiKey?: string): Promise<ScrapeResult> {
  const items = await fetchRssFeed(ASIAN_FILM_FESTIVALS_FEED);
  console.log(`[Scraper] Fetched ${items.length} RSS items from asianfilmfestivals.com`);

  const entries: Array<{ festival: ParsedFestival; content: string }> = [];
  for (const item of items) {
    const parsed = parseFestivalItem(item);
    if (parsed) entries.push({ festival: parsed, content: item.content });
  }
  console.log(`[Scraper] Parsed ${entries.length} call-for-entry items`);

  // AI fee enrichment for festivals where regex found nothing
  if (apiKey) await enrichFeesWithAI(entries, apiKey);

  const festivals = entries.map((e) => e.festival);

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

// ============================================================
// Cineuropa RSS scraper (European festivals & funds)
// ============================================================

/**
 * Parse one Cineuropa RSS item into a ParsedFestival.
 * Only processes "call for entries / open call" articles.
 */
export function parseCineuropaItem(item: RssItem): ParsedFestival | null {
  const titleLower = item.title.toLowerCase();
  const isCallForEntry =
    titleLower.includes('call for entries') ||
    titleLower.includes('call for submissions') ||
    titleLower.includes('open for submissions') ||
    titleLower.includes('submissions open') ||
    titleLower.includes('open call');

  if (!isCallForEntry) return null;

  const year = pubDateYear(item.pubDate);

  // Extract festival name: remove trailing action phrase from title
  const name = item.title
    .replace(/\s*[–—:]\s*(call for entries|call for submissions|open call|submissions open).*/i, '')
    .replace(/\s+(opens?|launches?|announces?|invites?)\s+(call for|submissions?|applications?).*/i, '')
    .replace(/\s*\d{4}$/, '')
    .trim();

  if (!name || name.length < 4) return null;

  const { early, regular } = extractDeadlines(item.content, item.description, year);
  const { fee_early, fee_regular, fee_late, currency } = extractFees(item.content);

  return {
    name,
    country: null,
    website: item.link,
    filmfreeway_url: null,
    category: inferCategory(item.categories, item.content),
    early_deadline: early,
    regular_deadline: regular,
    notification_date: null,
    festival_dates: null,
    description: stripHtml(item.description).slice(0, 300),
    source: 'rss',
    fee_early,
    fee_regular,
    fee_late,
    entry_currency: currency,
  };
}

/**
 * Fetch Cineuropa RSS, parse call-for-entry items,
 * and persist new European festivals to D1.
 */
export async function scrapeCineuropaRss(db: D1Database, apiKey?: string): Promise<ScrapeResult> {
  const items = await fetchRssFeed(CINEUROPA_RSS_FEED);
  console.log(`[Scraper] Fetched ${items.length} RSS items from cineuropa.org`);

  const entries: Array<{ festival: ParsedFestival; content: string }> = [];
  for (const item of items) {
    const parsed = parseCineuropaItem(item);
    if (parsed) entries.push({ festival: parsed, content: item.content });
  }
  console.log(`[Scraper] Parsed ${entries.length} call-for-entry items from Cineuropa`);

  if (apiKey) await enrichFeesWithAI(entries, apiKey);

  const festivals = entries.map((e) => e.festival);

  for (const item of items) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO rss_cache
             (feed_url, item_guid, title, link, pub_date, content, processed)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        )
        .bind(CINEUROPA_RSS_FEED, item.guid, item.title, item.link, item.pubDate, item.description)
        .run();
    } catch { /* cache is non-critical */ }
  }

  const result = await saveFestivals(db, festivals);
  console.log(
    `[Scraper] Cineuropa — saved: ${result.saved}, skipped: ${result.skipped}` +
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
