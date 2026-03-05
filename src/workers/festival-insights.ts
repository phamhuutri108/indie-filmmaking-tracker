// Festival Insights — AI-generated profile data using Claude Sonnet
// Called once per festival, result cached in festival_insights table

const SONNET_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface PastFilm {
  year: number;
  title: string;
  director: string;
  country?: string;
  award?: string | null;
  imdb_url?: string | null;
  letterboxd_url?: string | null;
  notes?: string;
}

export interface FestivalPrize {
  name: string;
  amount_usd?: number | null;
  description?: string;
}

export interface UsefulLink {
  label: string;
  url: string;
  type: 'official' | 'wiki' | 'imdb' | 'letterboxd' | 'press' | 'other';
}

export interface AcceptanceStat {
  submissions?: number;
  selected?: number;
  rate_pct?: number;
  note?: string;
}

export interface FestivalInsightsAI {
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  what_they_look_for: string;
  eligibility: string;
  industry_presence: string;
  tips: string;
  summary_vi: string;
  what_they_look_for_vi: string;
  eligibility_vi: string;
  industry_presence_vi: string;
  tips_vi: string;
  past_selections: PastFilm[];
  prizes: FestivalPrize[];
  useful_links: UsefulLink[];
  acceptance_stats: AcceptanceStat | null;
}

interface FestivalData {
  name: string;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  description?: string | null;
  prestige_tier?: string | null;
  category?: string | null;
  tier?: string | null;
}

export async function generateFestivalInsights(
  festival: FestivalData,
  apiKey: string
): Promise<FestivalInsightsAI> {
  const systemPrompt = `You are an expert in international film festivals with deep knowledge of the global cinema industry. You provide accurate, filmmaker-centric intelligence.

When you lack specific knowledge about a festival, acknowledge this honestly with confidence=low rather than fabricating data. Never invent film titles, director names, award amounts, or submission statistics you are not certain about. It is better to return an empty array for past_selections than to guess.`;

  const userPrompt = `Generate a comprehensive filmmaker intelligence profile for this festival.

Festival: ${festival.name}
Country: ${festival.country ?? 'unknown'}
City: ${festival.city ?? 'unknown'}
Website: ${festival.website ?? 'unknown'}
Category: ${festival.category ?? 'unknown'}
Prestige tier: ${festival.prestige_tier ?? 'unverified'}
Description: ${festival.description ? festival.description.slice(0, 600) : 'not available'}

Respond ONLY with valid JSON matching this exact structure (no markdown, no explanation):

{
  "confidence": "high",
  "summary": "2-3 paragraph narrative about the festival's identity, history, reputation, and significance to the global film community...",
  "summary_vi": "Bản dịch tiếng Việt của summary...",
  "what_they_look_for": "Paragraph describing curatorial taste: thematic focus, aesthetic preferences, what kind of stories they champion, common threads in programming, filmmaker profiles they tend to select...",
  "what_they_look_for_vi": "Bản dịch tiếng Việt của what_they_look_for...",
  "eligibility": "Paragraph covering premiere requirements (world/international/regional/Asian etc), nationality or citizenship restrictions if any, film length and type constraints, completion year requirements, language/subtitle requirements, submission window timing...",
  "eligibility_vi": "Bản dịch tiếng Việt của eligibility...",
  "industry_presence": "Paragraph about buyers, sales agents, distributors present, press and trade media coverage, any attached industry market or forum, co-production meetings, networking opportunities for filmmakers...",
  "industry_presence_vi": "Bản dịch tiếng Việt của industry_presence...",
  "tips": "Paragraph of practical application advice specific to this festival: which section to enter, how to make your submission stand out, common mistakes applicants make, optimal timing, DCP vs digital requirements if known...",
  "tips_vi": "Bản dịch tiếng Việt của tips...",
  "past_selections": [
    {
      "year": 2023,
      "title": "Film Title",
      "director": "Director Name",
      "country": "Country of Production",
      "award": "Award name, or null if no award",
      "imdb_url": "https://www.imdb.com/title/tt... or null",
      "letterboxd_url": "https://letterboxd.com/film/... or null",
      "notes": "Brief note about the film's significance or journey"
    }
  ],
  "prizes": [
    {
      "name": "Prize name",
      "amount_usd": 10000,
      "description": "What winning this prize means for a filmmaker"
    }
  ],
  "acceptance_stats": {
    "submissions": 3000,
    "selected": 120,
    "rate_pct": 4,
    "note": "Based on 2023 public data"
  },
  "useful_links": [
    { "label": "Official Submission Page", "url": "https://...", "type": "official" },
    { "label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/...", "type": "wiki" },
    { "label": "IMDb Events", "url": "https://www.imdb.com/event/...", "type": "imdb" }
  ]
}

Rules:
- Set confidence=high only if this is a well-documented major festival you know in detail
- Set confidence=low for regional or emerging festivals with limited public data
- past_selections: list 3-8 notable selections from recent years (last 5 years preferred); OMIT this array entry entirely if you are not certain the film was actually selected
- prizes: list ALL prizes you know about including non-cash ones; set amount_usd to null if unknown
- acceptance_stats: set to null if you don't know real numbers — never guess submission counts
- useful_links: always include Wikipedia, IMDb Events page, and official website if you know them
- All text must be useful to an independent filmmaker deciding whether to submit their film
- For every narrative field (summary, what_they_look_for, eligibility, industry_presence, tips), also provide a Vietnamese translation in the corresponding _vi field. Write natural, professional Vietnamese — do not machine-translate word for word`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: SONNET_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { content: Array<{ text: string }> };
  const text = (data.content?.[0]?.text ?? '').trim();

  // Strip markdown code fences if present
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(jsonText) as FestivalInsightsAI;
    return {
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
      summary: parsed.summary ?? '',
      what_they_look_for: parsed.what_they_look_for ?? '',
      eligibility: parsed.eligibility ?? '',
      industry_presence: parsed.industry_presence ?? '',
      tips: parsed.tips ?? '',
      summary_vi: parsed.summary_vi ?? '',
      what_they_look_for_vi: parsed.what_they_look_for_vi ?? '',
      eligibility_vi: parsed.eligibility_vi ?? '',
      industry_presence_vi: parsed.industry_presence_vi ?? '',
      tips_vi: parsed.tips_vi ?? '',
      past_selections: Array.isArray(parsed.past_selections) ? parsed.past_selections : [],
      prizes: Array.isArray(parsed.prizes) ? parsed.prizes : [],
      useful_links: Array.isArray(parsed.useful_links) ? parsed.useful_links : [],
      acceptance_stats: parsed.acceptance_stats ?? null,
    };
  } catch {
    console.error('[FestivalInsights] JSON parse failed:', jsonText.slice(0, 300));
    return {
      confidence: 'low',
      summary: 'Profile generation encountered a parsing error. Please regenerate.',
      what_they_look_for: '',
      eligibility: '',
      industry_presence: '',
      tips: '',
      summary_vi: '',
      what_they_look_for_vi: '',
      eligibility_vi: '',
      industry_presence_vi: '',
      tips_vi: '',
      past_selections: [],
      prizes: [],
      useful_links: festival.website ? [{ label: 'Official Website', url: festival.website, type: 'official' }] : [],
      acceptance_stats: null,
    };
  }
}
