// IFT Scraper — RSS + HTML
// Cloudflare Workers runtime only

export interface RssItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
}

export async function fetchRssFeed(url: string): Promise<RssItem[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'IFT-Bot/1.0 (Indie Filmmaking Tracker)' },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${url}`);
  }

  const xml = await response.text();
  return parseRss(xml);
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      guid: extractTag(block, 'guid') || extractTag(block, 'link') || '',
      title: stripCdata(extractTag(block, 'title') || ''),
      link: extractTag(block, 'link') || '',
      pubDate: extractTag(block, 'pubDate') || '',
      content:
        stripCdata(
          extractTag(block, 'content:encoded') ||
            extractTag(block, 'description') ||
            ''
        ),
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function stripCdata(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

export async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'IFT-Bot/1.0 (Indie Filmmaking Tracker)' },
  });

  if (!response.ok) {
    throw new Error(`Scrape failed: ${response.status} ${url}`);
  }

  return response.text();
}

export function extractDeadlines(html: string): string[] {
  const datePatterns = [
    /deadline[:\s]+([A-Za-z]+ \d{1,2},?\s+\d{4})/gi,
    /due[:\s]+([A-Za-z]+ \d{1,2},?\s+\d{4})/gi,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /([A-Za-z]+ \d{1,2},?\s+\d{4})/g,
  ];

  const found: string[] = [];
  for (const pattern of datePatterns) {
    const matches = html.matchAll(pattern);
    for (const m of matches) {
      found.push(m[1] || m[0]);
    }
  }

  return [...new Set(found)].slice(0, 10);
}
