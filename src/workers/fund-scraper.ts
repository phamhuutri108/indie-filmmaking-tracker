// IFT Fund Scraper
// Fetches international film fund websites and extracts deadline info.
// Cloudflare Workers runtime only — no Node.js APIs.

import type { ScrapeResult } from './scraper';

// ============================================================
// Types
// ============================================================

export interface FundSource {
  name: string;
  name_vi: string;
  organization: string;
  country: string;
  website: string;
  type: string;       // development | production | post-production | distribution
  focus: string;      // documentary | narrative | animation | experimental
  region_focus: string; // global | asia | southeast-asia | europe | africa | latin-america
  max_amount?: number; // in USD
  currency?: string;
  eligibility?: string;
  eligibility_vi?: string;
  description?: string;
  description_vi?: string;
  /** Regex to extract deadline text from the fund's web page */
  deadlineRegex?: RegExp;
}

// ============================================================
// Curated list of international film funds
// ============================================================

export const KNOWN_FUNDS: FundSource[] = [
  {
    name: 'Hubert Bals Fund',
    name_vi: 'Quỹ Hubert Bals',
    organization: 'International Film Festival Rotterdam (IFFR)',
    country: 'Netherlands',
    website: 'https://iffr.com/en/professionals/hubert-bals-fund',
    type: 'development',
    focus: 'narrative',
    region_focus: 'global',
    max_amount: 10000,
    currency: 'EUR',
    eligibility: 'Filmmakers from Asia, Africa, Latin America, Middle East, and Eastern Europe.',
    eligibility_vi: 'Nhà làm phim từ châu Á, châu Phi, Mỹ Latinh, Trung Đông và Đông Âu.',
    description:
      'Supports script and project development for feature films and creative documentaries from developing countries.',
    description_vi:
      'Hỗ trợ phát triển kịch bản và dự án phim dài và phim tài liệu sáng tạo từ các nước đang phát triển.',
    deadlineRegex: /(?:deadline|closes?\s+on?|submit\s+by)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'IDFA Bertha Fund',
    name_vi: 'Quỹ IDFA Bertha',
    organization: 'International Documentary Film Festival Amsterdam (IDFA)',
    country: 'Netherlands',
    website: 'https://professionals.idfa.nl/training-funding/funding/',
    type: 'production',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 40000,
    currency: 'EUR',
    eligibility: 'Documentary filmmakers from developing countries.',
    eligibility_vi: 'Nhà làm phim tài liệu từ các nước đang phát triển.',
    description:
      'Supports documentary filmmakers from Africa, Asia, Latin America, Middle East and parts of Europe.',
    description_vi:
      'Hỗ trợ nhà làm phim tài liệu từ châu Phi, châu Á, Mỹ Latinh, Trung Đông và một số nước châu Âu.',
    deadlineRegex: /(?:deadline|applications?\s+(?:close|due))[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'Sundance Documentary Fund',
    name_vi: 'Quỹ phim tài liệu Sundance',
    organization: 'Sundance Institute',
    country: 'USA',
    website: 'https://www.sundance.org/programs/documentary-fund',
    type: 'production',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 30000,
    currency: 'USD',
    eligibility: 'Documentary filmmakers with a focus on social justice issues.',
    eligibility_vi: 'Nhà làm phim tài liệu tập trung vào các vấn đề công bằng xã hội.',
    description:
      'Supports global documentary projects that address pressing social, cultural, and political issues.',
    description_vi:
      'Hỗ trợ các dự án phim tài liệu quốc tế đề cập đến các vấn đề xã hội, văn hóa và chính trị cấp bách.',
    deadlineRegex: /(?:deadline|apply\s+by|submit\s+by|due)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  },
  {
    name: 'World Cinema Fund',
    name_vi: 'Quỹ Điện ảnh Thế giới',
    organization: 'Berlinale — Berlin International Film Festival',
    country: 'Germany',
    website: 'https://www.berlinale.de/en/wcf/home/welcome.html',
    type: 'development',
    focus: 'narrative',
    region_focus: 'global',
    max_amount: 60000,
    currency: 'EUR',
    eligibility:
      'Feature films from Africa, Latin America, Central/Southeast Asia, Middle East, and Eastern Europe.',
    eligibility_vi:
      'Phim dài từ châu Phi, Mỹ Latinh, Trung/Đông Nam Á, Trung Đông và Đông Âu.',
    description:
      'Supports the production and distribution of art-house feature films from underrepresented regions.',
    description_vi:
      'Hỗ trợ sản xuất và phát hành phim dài nghệ thuật từ các khu vực ít được đại diện.',
    deadlineRegex: /(?:deadline|submission\s+deadline|apply\s+by)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'Asian Cinema Fund',
    name_vi: 'Quỹ Điện ảnh châu Á',
    organization: 'Busan International Film Festival (BIFF)',
    country: 'South Korea',
    website: 'https://acf.busan.go.kr',
    type: 'development',
    focus: 'narrative',
    region_focus: 'asia',
    max_amount: 20000,
    currency: 'USD',
    eligibility: 'Filmmakers from Asian countries.',
    eligibility_vi: 'Nhà làm phim từ các quốc gia châu Á.',
    description:
      'Script development and post-production support for Asian cinema projects.',
    description_vi:
      'Hỗ trợ phát triển kịch bản và hậu kỳ cho các dự án điện ảnh châu Á.',
    deadlineRegex: /(?:deadline|application\s+period|apply\s+by)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'Catapult Film Fund',
    name_vi: 'Quỹ Catapult Film',
    organization: 'Catapult Film Fund',
    country: 'USA',
    website: 'https://catapultfilmfund.org',
    type: 'development',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 25000,
    currency: 'USD',
    eligibility: 'Documentary filmmakers in development phase.',
    eligibility_vi: 'Nhà làm phim tài liệu trong giai đoạn phát triển.',
    description:
      'Development funding for documentary films. Provides early-stage funding to help documentarians develop their films.',
    description_vi:
      'Tài trợ phát triển cho phim tài liệu. Cung cấp kinh phí giai đoạn đầu giúp nhà làm phim phát triển tác phẩm.',
    deadlineRegex: /(?:deadline|apply\s+by|due\s+date)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  },
  {
    name: 'Doha Film Institute Development Grant',
    name_vi: 'Tài trợ Phát triển Viện phim Doha',
    organization: 'Doha Film Institute',
    country: 'Qatar',
    website: 'https://www.dohafilm.com/en',
    type: 'development',
    focus: 'narrative',
    region_focus: 'global',
    max_amount: 30000,
    currency: 'USD',
    eligibility: 'Arab filmmakers and global co-productions.',
    eligibility_vi: 'Nhà làm phim Ả Rập và đồng sản xuất quốc tế.',
    description:
      'Script development and production funding for Arab and international filmmakers.',
    description_vi:
      'Tài trợ phát triển kịch bản và sản xuất cho nhà làm phim Ả Rập và quốc tế.',
    deadlineRegex: /(?:deadline|applications?\s+close|apply\s+by)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'SEAFIC Lab',
    name_vi: 'SEAFIC Lab',
    organization: 'Southeast Asian Fiction Film Lab',
    country: 'Thailand',
    website: 'https://seafic.org',
    type: 'development',
    focus: 'narrative',
    region_focus: 'southeast-asia',
    max_amount: 15000,
    currency: 'USD',
    eligibility: 'Filmmakers from ASEAN countries for narrative feature development.',
    eligibility_vi: 'Nhà làm phim từ các nước ASEAN phát triển phim truyện dài.',
    description:
      'Script and project development for Southeast Asian fiction films. Annual lab with mentorship and funding.',
    description_vi:
      'Phát triển kịch bản và dự án phim truyện Đông Nam Á. Lab hàng năm với cố vấn và tài trợ.',
    deadlineRegex: /(?:deadline|applications?\s+(?:close|open|due))[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'Tribeca Film Institute Documentary Fund',
    name_vi: 'Quỹ phim tài liệu Tribeca Film Institute',
    organization: 'Tribeca Film Institute',
    country: 'USA',
    website: 'https://www.tfiny.org',
    type: 'production',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 25000,
    currency: 'USD',
    eligibility: 'Documentary filmmakers working on social-issue films.',
    eligibility_vi: 'Nhà làm phim tài liệu làm phim về vấn đề xã hội.',
    description:
      'Supports documentary films that illuminate contemporary social issues and amplify underrepresented voices.',
    description_vi:
      'Hỗ trợ phim tài liệu phản ánh các vấn đề xã hội đương đại và khuếch đại những tiếng nói ít được đại diện.',
    deadlineRegex: /(?:deadline|apply\s+by|due)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  },
  {
    name: 'Hot Docs Forum',
    name_vi: 'Hot Docs Forum',
    organization: 'Hot Docs Canadian International Documentary Festival',
    country: 'Canada',
    website: 'https://hotdocs.ca/industry/conference/hot-docs-forum',
    type: 'production',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 0,
    currency: 'USD',
    eligibility: 'Documentary projects seeking co-production and financing partners.',
    eligibility_vi: 'Các dự án phim tài liệu tìm kiếm đối tác đồng sản xuất và tài chính.',
    description:
      'Pitching forum connecting documentary filmmakers with international broadcasters and distributors.',
    description_vi:
      'Diễn đàn pitch kết nối nhà làm phim tài liệu với các đài truyền hình và nhà phân phối quốc tế.',
    deadlineRegex: /(?:deadline|submissions?\s+(?:close|due)|apply\s+by)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'Purin Pictures Fund',
    name_vi: 'Quỹ Purin Pictures',
    organization: 'Purin Pictures',
    country: 'Thailand',
    website: 'https://www.purinpictures.com',
    type: 'development',
    focus: 'narrative',
    region_focus: 'southeast-asia',
    max_amount: 20000,
    currency: 'USD',
    eligibility: 'Southeast Asian narrative filmmakers.',
    eligibility_vi: 'Nhà làm phim truyện Đông Nam Á.',
    description:
      'Development and production support for Southeast Asian cinema with focus on emerging voices.',
    description_vi:
      'Hỗ trợ phát triển và sản xuất điện ảnh Đông Nam Á tập trung vào các tiếng nói mới nổi.',
    deadlineRegex: /(?:deadline|applications?\s+close|open\s+call)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
  {
    name: 'ITVS Open Call',
    name_vi: 'ITVS Open Call',
    organization: 'Independent Television Service (ITVS)',
    country: 'USA',
    website: 'https://itvs.org/funding/open-call',
    type: 'production',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 200000,
    currency: 'USD',
    eligibility: 'Independent documentary filmmakers for PBS broadcast.',
    eligibility_vi: 'Nhà làm phim tài liệu độc lập cho đài PBS.',
    description:
      'Funds independent documentary films for broadcast on PBS, with focus on diverse voices and underrepresented communities.',
    description_vi:
      'Tài trợ phim tài liệu độc lập phát sóng trên PBS, tập trung vào tiếng nói đa dạng và cộng đồng ít được đại diện.',
    deadlineRegex: /(?:deadline|submit\s+by|due\s+date|accepts?\s+proposals?)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  },
  {
    name: 'CNC Aide aux cinémas du monde',
    name_vi: 'CNC Aide aux cinémas du monde',
    organization: 'Centre national du cinéma et de limage animée (CNC)',
    country: 'France',
    website: 'https://www.cnc.fr/professionnels/aides-et-financements/international',
    type: 'production',
    focus: 'narrative',
    region_focus: 'global',
    max_amount: 80000,
    currency: 'EUR',
    eligibility: 'French-international co-productions with directors from non-EU countries.',
    eligibility_vi: 'Đồng sản xuất Pháp-quốc tế với đạo diễn từ các nước ngoài EU.',
    description:
      'French co-production fund supporting international films directed by filmmakers from non-EU countries.',
    description_vi:
      'Quỹ đồng sản xuất Pháp hỗ trợ phim quốc tế do đạo diễn từ các nước ngoài EU thực hiện.',
    deadlineRegex: /(?:date\s+limite|deadline|clôture)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{2}\/\d{2}\/\d{4})/i,
  },
  {
    name: 'Chicken & Egg Pictures Fund',
    name_vi: 'Quỹ Chicken & Egg Pictures',
    organization: 'Chicken & Egg Pictures',
    country: 'USA',
    website: 'https://chickeneggfilms.org',
    type: 'production',
    focus: 'documentary',
    region_focus: 'global',
    max_amount: 50000,
    currency: 'USD',
    eligibility: 'Women-identifying and non-binary documentary filmmakers.',
    eligibility_vi: 'Nhà làm phim tài liệu nhận dạng là phụ nữ và phi nhị phân.',
    description:
      'Supports women-identifying and non-binary nonfiction filmmakers who are underrepresented and under-resourced.',
    description_vi:
      'Hỗ trợ nhà làm phim phi hư cấu nhận dạng là phụ nữ và phi nhị phân ít được đại diện và thiếu nguồn lực.',
    deadlineRegex: /(?:deadline|apply\s+by|applications?\s+(?:close|due))[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  },
  {
    name: 'Cinemart Co-Production Market',
    name_vi: 'Cinemart Thị trường Đồng sản xuất',
    organization: 'International Film Festival Rotterdam (IFFR)',
    country: 'Netherlands',
    website: 'https://iffr.com/en/professionals/cinemart',
    type: 'development',
    focus: 'narrative',
    region_focus: 'global',
    max_amount: 0,
    currency: 'EUR',
    eligibility: 'Feature film projects seeking co-production and financing.',
    eligibility_vi: 'Dự án phim dài tìm kiếm đồng sản xuất và tài chính.',
    description:
      'International co-production and finance market for independent feature films at IFFR Rotterdam.',
    description_vi:
      'Thị trường đồng sản xuất và tài chính quốc tế cho phim dài độc lập tại IFFR Rotterdam.',
    deadlineRegex: /(?:deadline|submit|apply\s+by)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  },
];

// ============================================================
// Date parsing helpers
// ============================================================

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(raw: string): string | null {
  const cleaned = raw.replace(/\([^)]*\)/g, '').replace(/\|.*/g, '').trim();

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

  // "DD/MM/YYYY"
  m = cleaned.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ============================================================
// Web scraping
// ============================================================

/** Fetch a fund's website and try to extract the deadline date. Returns YYYY-MM-DD or null. */
async function scrapeFundDeadline(source: FundSource): Promise<string | null> {
  try {
    const resp = await fetch(source.website, {
      headers: { 'User-Agent': 'IFT-Bot/1.0 (Indie Filmmaking Tracker)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;

    const text = stripHtml(await resp.text());

    // Try fund-specific regex first
    if (source.deadlineRegex) {
      const m = text.match(source.deadlineRegex);
      if (m?.[1]) {
        const d = parseDate(m[1]);
        if (d) return d;
      }
    }

    // Generic patterns — search near "deadline" keyword
    const deadlineIdx = text.search(/\bdeadline\b/i);
    if (deadlineIdx !== -1) {
      const window = text.slice(deadlineIdx, deadlineIdx + 200);
      const genericPats = [
        /([A-Za-z]+ \d{1,2},?\s*\d{4})/,
        /(\d{1,2}\s+[A-Za-z]+\s+\d{4})/,
        /(\d{2}\/\d{2}\/\d{4})/,
      ];
      for (const pat of genericPats) {
        const m = window.match(pat);
        if (m) {
          const d = parseDate(m[1]);
          if (d) return d;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// D1 persistence
// ============================================================

/** Upsert a single fund — insert if new, update deadline + last_checked if exists. */
async function upsertFund(
  db: D1Database,
  source: FundSource,
  scrapedDeadline: string | null
): Promise<'inserted' | 'updated' | 'unchanged'> {
  const existing = await db
    .prepare(`SELECT id, deadline FROM funds_grants WHERE name = ?`)
    .bind(source.name)
    .first<{ id: number; deadline: string | null }>();

  if (!existing) {
    await db
      .prepare(
        `INSERT INTO funds_grants
           (name, name_vi, organization, country, website, type, focus, region_focus,
            max_amount, currency, deadline, eligibility, eligibility_vi,
            description, description_vi, status, last_checked)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`
      )
      .bind(
        source.name, source.name_vi, source.organization, source.country,
        source.website, source.type, source.focus, source.region_focus,
        source.max_amount ?? null, source.currency ?? 'USD',
        scrapedDeadline,
        source.eligibility ?? null, source.eligibility_vi ?? null,
        source.description ?? null, source.description_vi ?? null
      )
      .run();
    return 'inserted';
  }

  // Always update last_checked; update deadline only if scraped value differs
  if (scrapedDeadline && scrapedDeadline !== existing.deadline) {
    await db
      .prepare(
        `UPDATE funds_grants
         SET deadline = ?, last_checked = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(scrapedDeadline, existing.id)
      .run();
    return 'updated';
  }

  await db
    .prepare(`UPDATE funds_grants SET last_checked = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(existing.id)
    .run();
  return 'unchanged';
}

// ============================================================
// Main entry point
// ============================================================

/**
 * Iterate KNOWN_FUNDS: scrape each fund's website for deadline info, upsert to D1.
 * Called daily by cron.ts.
 */
export async function scrapeFunds(db: D1Database): Promise<ScrapeResult> {
  let saved = 0;   // new records inserted
  let skipped = 0; // unchanged
  const errors: string[] = [];

  for (const source of KNOWN_FUNDS) {
    try {
      const deadline = await scrapeFundDeadline(source);
      const result = await upsertFund(db, source, deadline);

      console.log(
        `[FundScraper] ${source.name} → ${result}` +
        (deadline ? ` (deadline: ${deadline})` : ' (no deadline found)')
      );

      if (result === 'inserted' || result === 'updated') saved++;
      else skipped++;
    } catch (err) {
      const msg = `${source.name}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error('[FundScraper]', msg);
    }
  }

  console.log(
    `[FundScraper] Done — saved/updated: ${saved}, unchanged: ${skipped}` +
    (errors.length ? `, errors: ${errors.join('; ')}` : '')
  );
  return { saved, skipped, errors };
}
