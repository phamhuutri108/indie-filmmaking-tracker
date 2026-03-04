// IFT AI Scraper — Claude Haiku credibility analysis
// Cloudflare Workers runtime only (no Node.js, no SDK)

import { getHardcodedTier } from './credibility-data';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_PER_BATCH = 20; // Max items to analyze per cron run (cost control)

interface AnalysisResult {
  tier: string;
  signals: string[];
  genres: string[];
}

interface AiEnv {
  ANTHROPIC_API_KEY: string;
}

// ─── Core AI call ─────────────────────────────────────────────────────────────
async function analyzeWithClaude(
  name: string,
  description: string | null,
  country: string | null,
  type: 'festival' | 'fund' | 'education',
  apiKey: string
): Promise<AnalysisResult> {
  const typeContext = {
    festival: 'film festival',
    fund: 'film fund or grant',
    education: 'film education program, lab, or residency',
  }[type];

  const prompt = `You are an expert in international cinema and film industry credibility assessment.
Analyze this ${typeContext} and respond with ONLY valid JSON (no explanation, no markdown):

Name: ${name}
Country: ${country ?? 'unknown'}
Description: ${description ? description.slice(0, 400) : 'not available'}

Respond with this exact JSON structure:
{
  "tier": "a-list" | "recognized" | "credible" | "not-recommended",
  "signals": ["signal1", "signal2"],
  "genres": ["genre1", "genre2"]
}

Tier criteria:
- "a-list": World-renowned, FIAPF accredited, or Oscar/BAFTA qualifying. Examples: Cannes, Venice, Sundance, IDFA, Berlinale
- "recognized": Well-established (5+ years), industry-known, has physical screenings/events, covered by trade press
- "credible": Legitimate festival/fund/program, smaller or newer but genuine
- "not-recommended": No verifiable physical presence, no jury information, suspicious fee structure, likely vanity festival

Valid signals: fiapf-accredited, oscar-qualifying, bafta-qualifying, physical-venue, long-history, industry-press, cash-prize, distribution-deal, prestigious-jury, government-backed, university-affiliated, major-fund, international-scope

Valid genres (only include if clearly relevant): documentary, narrative, short-film, animation, experimental, lgbtq, family, horror, political, environmental, asian-cinema, women-filmmakers, student-film, indigenous, diaspora, human-rights, sci-fi, thriller`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json() as { content: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';

  try {
    const parsed = JSON.parse(text) as AnalysisResult;
    return {
      tier: ['a-list', 'recognized', 'credible', 'not-recommended'].includes(parsed.tier)
        ? parsed.tier
        : 'unverified',
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
    };
  } catch {
    console.error('[AI Scraper] Failed to parse Claude response:', text);
    return { tier: 'unverified', signals: [], genres: [] };
  }
}

// ─── Apply result to DB ───────────────────────────────────────────────────────
async function applyTierToRow(
  db: D1Database,
  table: string,
  id: number,
  result: AnalysisResult
): Promise<void> {
  await db
    .prepare(
      `UPDATE ${table} SET prestige_tier = ?, prestige_signals = ?, genres = ?, ai_analyzed = 1 WHERE id = ?`
    )
    .bind(
      result.tier,
      JSON.stringify(result.signals),
      JSON.stringify(result.genres),
      id
    )
    .run();
}

// ─── Batch process one table ──────────────────────────────────────────────────
async function batchAnalyzeTable(
  db: D1Database,
  apiKey: string,
  table: string,
  nameCol: string,
  descCol: string,
  countryCol: string,
  type: 'festival' | 'fund' | 'education',
  limit: number
): Promise<number> {
  const rows = await db
    .prepare(
      `SELECT id, ${nameCol} as name, ${descCol} as description, ${countryCol} as country
       FROM ${table}
       WHERE ai_analyzed = 0
       LIMIT ?`
    )
    .bind(limit)
    .all<{ id: number; name: string; description: string | null; country: string | null }>();

  if (!rows.results.length) return 0;

  let processed = 0;
  for (const row of rows.results) {
    try {
      // Check hard-coded list first — saves API call
      const hardcoded = getHardcodedTier(row.name);
      if (hardcoded) {
        await applyTierToRow(db, table, row.id, {
          tier: hardcoded.tier,
          signals: hardcoded.signals,
          genres: [],
        });
      } else {
        const result = await analyzeWithClaude(row.name, row.description, row.country, type, apiKey);
        await applyTierToRow(db, table, row.id, result);
      }
      processed++;
    } catch (err) {
      console.error(`[AI Scraper] Error analyzing ${table} id=${row.id}:`, err);
      // Mark as analyzed to avoid infinite retry loop
      await db.prepare(`UPDATE ${table} SET ai_analyzed = 1 WHERE id = ?`).bind(row.id).run();
    }
  }

  return processed;
}

// ─── Public exports (called from cron) ───────────────────────────────────────
export async function batchAnalyzeFestivals(db: D1Database, env: AiEnv): Promise<void> {
  const count = await batchAnalyzeTable(
    db, env.ANTHROPIC_API_KEY,
    'festivals', 'name', 'description', 'country',
    'festival', MAX_PER_BATCH
  );
  console.log(`[AI Scraper] Analyzed ${count} festivals`);
}

export async function batchAnalyzeFunds(db: D1Database, env: AiEnv): Promise<void> {
  const count = await batchAnalyzeTable(
    db, env.ANTHROPIC_API_KEY,
    'funds_grants', 'name', 'description', 'country',
    'fund', Math.floor(MAX_PER_BATCH / 3)
  );
  console.log(`[AI Scraper] Analyzed ${count} funds`);
}

export async function batchAnalyzeEducation(db: D1Database, env: AiEnv): Promise<void> {
  const count = await batchAnalyzeTable(
    db, env.ANTHROPIC_API_KEY,
    'education_residency', 'name', 'description', 'country',
    'education', Math.floor(MAX_PER_BATCH / 3)
  );
  console.log(`[AI Scraper] Analyzed ${count} education items`);
}
