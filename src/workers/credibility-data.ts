// Hard-coded credibility data — không cần gọi AI cho các festival/fund đã biết rõ
// Nguồn: FIAPF, Academy of Motion Picture Arts and Sciences, BAFTA

// ─── FIAPF Accredited Competitive Feature Film Festivals ─────────────────────
export const FIAPF_ACCREDITED = [
  'Cannes Film Festival', 'Venice Film Festival', 'Berlin International Film Festival',
  'San Sebastián International Film Festival', 'Tokyo International Film Festival',
  'Locarno Film Festival', 'Karlovy Vary International Film Festival',
  'Mar del Plata Film Festival', 'Cairo International Film Festival',
  'Tallinn Black Nights Film Festival', 'Shanghai International Film Festival',
  'Warsaw Film Festival', 'Montreal World Film Festival',
  'Valladolid International Film Festival', 'Thessaloniki International Film Festival',
];

// ─── Academy Award Qualifying Festivals ──────────────────────────────────────
// Festivals có thể giúp phim đủ điều kiện dự giải Oscar (Short Film / Documentary)
export const OSCAR_QUALIFYING = [
  'Sundance Film Festival', 'Tribeca Film Festival', 'SXSW', 'Hot Docs',
  'Palm Springs International ShortFest', 'Clermont-Ferrand International Short Film Festival',
  'Oberhausen International Short Film Festival', 'Tampere Film Festival',
  'Edinburgh International Film Festival', 'Melbourne International Film Festival',
  'BFI London Film Festival', 'New York Film Festival', 'Toronto International Film Festival',
  'Rotterdam International Film Festival', 'IDFA', 'International Documentary Film Festival Amsterdam',
  'Tribeca', 'BAMcinemaFest', 'Hollyshorts Film Festival', 'Nashville Film Festival',
  'Urbanworld Film Festival', 'SXSW Film Festival', 'AFI Fest',
  'American Film Festival', 'Oscar Qualifying',
];

// ─── Recognized Major Festivals (well-established, industry-known) ────────────
export const RECOGNIZED_MAJOR = [
  'Busan International Film Festival', 'BIFF', 'Hong Kong International Film Festival',
  'Pusan International Film Festival', 'Rotterdam International Film Festival', 'IFFR',
  'Tribeca', 'Sundance', 'TIFF', 'Hot Docs', 'IDFA', 'CPH:DOX',
  'True/False Film Festival', 'Visions du Réel', 'Sheffield Doc/Fest',
  'Sarajevo Film Festival', 'Warsaw International Film Festival',
  'Goteborg Film Festival', 'Gothenburg Film Festival',
  'Vilnius International Film Festival', 'Tallinn Black Nights',
  'Fantasia International Film Festival', 'Sitges', 'Fantasia',
  'Busan', 'Seoul International Women\'s Film Festival',
  'Singapore International Film Festival', 'Beijing International Film Festival',
];

// ─── Known Prestigious Funds (từ KNOWN_FUNDS trong fund-scraper.ts) ──────────
export const PRESTIGIOUS_FUNDS = [
  'Hubert Bals Fund', 'IDFA Bertha Fund', 'Sundance Documentary Fund',
  'World Cinema Fund', 'Asian Cinema Fund', 'SEAFIC', 'Catapult Film Fund',
  'Doha Film Institute', 'Tribeca Documentary Fund', 'Hot Docs Forum',
  'Purin Pictures', 'ITVS', 'CNC Aide aux cinémas du monde',
  'Chicken & Egg Pictures', 'Cinemart',
];

// ─── Known Prestigious Education/Labs ─────────────────────────────────────────
export const PRESTIGIOUS_EDUCATION = [
  'Berlinale Talents', 'Cannes Cinéfondation', 'Sundance Institute',
  'IFFR Rotterdam Lab', 'EAVE', 'Sources 2', 'TorinoFilmLab',
  'Sarajevo Talent Campus', 'ISFF Talents', 'Hot Docs Ted Rogers Fund',
  'Tribeca Film Institute', 'Goteborg Film Festival Industry',
  'Busan Asian Film School', 'Asian Film Academy', 'AFA',
];

// ─── Lookup function ──────────────────────────────────────────────────────────
export function getHardcodedTier(name: string): { tier: string; signals: string[] } | null {
  const lower = name.toLowerCase();

  if (FIAPF_ACCREDITED.some((f) => lower.includes(f.toLowerCase()))) {
    return { tier: 'a-list', signals: ['fiapf-accredited'] };
  }
  if (OSCAR_QUALIFYING.some((f) => lower.includes(f.toLowerCase()))) {
    return { tier: 'a-list', signals: ['oscar-qualifying'] };
  }
  if (RECOGNIZED_MAJOR.some((f) => lower.includes(f.toLowerCase()))) {
    return { tier: 'recognized', signals: ['major-festival'] };
  }
  if (PRESTIGIOUS_FUNDS.some((f) => lower.includes(f.toLowerCase()))) {
    return { tier: 'a-list', signals: ['prestigious-fund'] };
  }
  if (PRESTIGIOUS_EDUCATION.some((f) => lower.includes(f.toLowerCase()))) {
    return { tier: 'a-list', signals: ['prestigious-lab'] };
  }

  return null; // cần AI phân tích
}
