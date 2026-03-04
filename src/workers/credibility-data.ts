// Hard-coded credibility data — không cần gọi AI cho các festival/fund đã biết rõ
// Nguồn: FIAPF, Academy of Motion Picture Arts and Sciences, BAFTA
// Cập nhật: 2026-03-04

// ─── FIAPF Accredited Competitive Feature Film Festivals ─────────────────────
// Nguồn: https://www.fiapf.org/accredited-film-festivals
export const FIAPF_COMPETITIVE: string[] = [
  // Châu Âu
  'Cannes Film Festival',
  'Festival de Cannes',
  'Venice Film Festival',
  'Venice International Film Festival',
  'Mostra Internazionale d\'Arte Cinematografica',
  'Berlin International Film Festival',
  'Berlinale',
  'San Sebastián International Film Festival',
  'Festival Internacional de Cine de San Sebastián',
  'Zinemaldia',
  'Locarno Film Festival',
  'Locarno International Film Festival',
  'Karlovy Vary International Film Festival',
  'KVIFF',
  'Valladolid International Film Festival',
  'Seminci',
  'Thessaloniki International Film Festival',
  'Warsaw Film Festival',
  'Tallinn Black Nights Film Festival',
  'PÖFF',
  'Moscow International Film Festival',
  'MIFF Moscow',
  // Châu Á / Trung Đông / Châu Phi
  'Tokyo International Film Festival',
  'TIFF Tokyo',
  'Shanghai International Film Festival',
  'SIFF',
  'Cairo International Film Festival',
  'Golden Rooster Film Festival',
  // Châu Mỹ
  'Mar del Plata Film Festival',
  'Festival Internacional de Cine de Mar del Plata',
  'Montreal World Film Festival',
];

// ─── FIAPF Accredited Non-Competitive Feature Film Festivals ─────────────────
export const FIAPF_NON_COMPETITIVE: string[] = [
  'Toronto International Film Festival',
  'TIFF',
  'BFI London Film Festival',
  'London Film Festival',
  'Rotterdam International Film Festival',
  'IFFR',
  'International Film Festival Rotterdam',
  'New York Film Festival',
  'NYFF',
  'Sundance Film Festival',
  'Sundance',
  'Tribeca Film Festival',
  'Tribeca',
];

// ─── FIAPF Accredited Documentary & Short Film Festivals ─────────────────────
export const FIAPF_DOC_SHORT: string[] = [
  'Clermont-Ferrand International Short Film Festival',
  'Clermont-Ferrand',
  'Oberhausen International Short Film Festival',
  'Oberhausen',
  'Tampere Film Festival',
  'Bilbao International Festival of Documentary and Short Films',
  'ZINEBI',
  'International Documentary Film Festival Amsterdam',
  'IDFA',
  'Hot Docs Canadian International Documentary Festival',
  'Hot Docs',
];

// ─── Academy Award (Oscar) Qualifying Festivals ───────────────────────────────
// Nguồn: Academy of Motion Picture Arts and Sciences — Short Film & Documentary
export const OSCAR_QUALIFYING: string[] = [
  // Major USA
  'Sundance Film Festival',
  'Tribeca Film Festival',
  'SXSW',
  'SXSW Film Festival',
  'South by Southwest',
  'AFI Fest',
  'AFI Los Angeles International Film Festival',
  'Palm Springs International ShortFest',
  'Hollyshorts Film Festival',
  'Nashville Film Festival',
  'Urbanworld Film Festival',
  'Rhode Island International Film Festival',
  'Aspen Shortsfest',
  'LA Shorts',
  'LA Shorts International Film Festival',
  'Cleveland International Film Festival',
  'Denver Film Festival',
  'Denver International Film Festival',
  'Heartland International Film Festival',
  'Ann Arbor Film Festival',
  'San Francisco International Film Festival',
  'SFFilm Festival',
  'Full Frame Documentary Film Festival',
  'True/False Film Fest',
  'True/False Film Festival',
  'Camden International Film Festival',
  'DOC NYC',
  'BAMcinemaFest',
  // International
  'Clermont-Ferrand International Short Film Festival',
  'Oberhausen International Short Film Festival',
  'Tampere Film Festival',
  'Edinburgh International Film Festival',
  'Melbourne International Film Festival',
  'BFI London Film Festival',
  'Uppsala Short Film Festival',
  'Drama International Short Film Festival',
  'Vienna Shorts',
  'Leuven International Short Film Festival',
  'Go Short',
  'Go Short - Nijmegen International Short Film Festival',
  'International Short Film Festival Winterthur',
  'Flickerfest',
  'Sheffield Doc/Fest',
  'Sheffield International Documentary Festival',
  'CPH:DOX',
  'Copenhagen International Documentary Film Festival',
  'Visions du Réel',
  'International Documentary Film Festival Amsterdam',
  'IDFA',
  'Hot Docs',
];

// ─── BAFTA Qualifying Festivals ───────────────────────────────────────────────
// Nguồn: BAFTA — Short Film and Short Animation qualifying
export const BAFTA_QUALIFYING: string[] = [
  // UK
  'BFI London Film Festival',
  'London Film Festival',
  'Edinburgh International Film Festival',
  'Cambridge Film Festival',
  'Leeds International Film Festival',
  'Encounters Short Film and Animation Festival',
  'Aesthetica Short Film Festival',
  'Underwire Film Festival',
  'Raindance Film Festival',
  'Glasgow Film Festival',
  'Norwich Film Festival',
  'Flatpack Film Festival',
  'Dublin International Film Festival',
  // International (BAFTA recognized)
  'Tribeca Film Festival',
  'Sundance Film Festival',
  'SXSW',
  'Clermont-Ferrand International Short Film Festival',
  'Oberhausen International Short Film Festival',
  'Tampere Film Festival',
  'Palm Springs International ShortFest',
  'Melbourne International Film Festival',
  'Sydney Film Festival',
  'Uppsala Short Film Festival',
  'Vienna Shorts',
  'Leuven International Short Film Festival',
  'Drama International Short Film Festival',
  'Go Short',
];

// ─── Recognized Major International Festivals ────────────────────────────────
// Well-established, industry-known, trade press covered (5+ years, physical events)
export const RECOGNIZED_MAJOR: string[] = [
  // Châu Á — Tier cao
  'Busan International Film Festival',
  'BIFF',
  'Pusan International Film Festival',
  'Hong Kong International Film Festival',
  'HKIFF',
  'Singapore International Film Festival',
  'SGIFF',
  'Tokyo International Film Festival',
  'Jeonju International Film Festival',
  'Udine Far East Film Festival',
  'Far East Film Festival',
  'Asian World Film Festival',
  'Beijing International Film Festival',
  'BJIFF',
  'Pingyao International Film Festival',
  'PYIFF',
  'Fukuoka International Film Festival',
  'Mumbai Film Festival',
  'MAMI Mumbai Film Festival',
  'Mumbai International Film Festival',
  // Trung Đông
  'Abu Dhabi Film Festival',
  'Dubai International Film Festival',
  'DIFF',
  'El Gouna Film Festival',
  'Carthage Film Festival',
  'JCC',
  'Fajr International Film Festival',
  // Châu Âu — Recognized
  'Sarajevo Film Festival',
  'Göteborg International Film Festival',
  'Gothenburg Film Festival',
  'Göteborg Film Festival',
  'CPH:DOX',
  'CPH: DOX',
  'Sheffield Doc/Fest',
  'Hot Docs',
  'Visions du Réel',
  'Dok Leipzig',
  'DOK Leipzig',
  'International Leipzig Festival for Documentary and Animated Film',
  'Vilnius International Film Festival',
  'Kaunas International Film Festival',
  'Krakow Film Festival',
  'Kraków Film Festival',
  'Łódź Young Cinema Festival',
  'Gdynia Film Festival',
  'International Short Film Festival Hamburg',
  'Fantasia International Film Festival',
  'Sitges Film Festival',
  'Sitges International Fantastic Film Festival',
  'San Sebastián Horror and Fantasy Film Festival',
  'Mostra de Valencia',
  'Seville European Film Festival',
  'Seville Film Festival',
  'Villerupt Film Festival',
  'Amsterdam International Documentary Film Festival',
  'Sundance London',
  'Raindance Film Festival',
  'Glasgow Film Festival',
  'Dublin International Film Festival',
  'Galway Film Fleadh',
  'Cork International Film Festival',
  'Zurich Film Festival',
  'ZFF',
  'Tribeca',
  // Châu Mỹ
  'Full Frame Documentary Film Festival',
  'True/False Film Fest',
  'Camden International Film Festival',
  'DOC NYC',
  'Chicago International Film Festival',
  'Denver International Film Festival',
  'Palm Springs International Film Festival',
  'Newport Beach Film Festival',
  'San Francisco International Film Festival',
  'SFFilm',
  'Seattle International Film Festival',
  'SIFF',
  'Nashville Film Festival',
  'Austin Film Festival',
  'LA Film Festival',
  'Los Angeles Film Festival',
  'New Orleans Film Festival',
  // Châu Đại Dương
  'Melbourne International Film Festival',
  'MIFF',
  'Sydney Film Festival',
  'Brisbane International Film Festival',
  // Châu Phi
  'FESPACO',
  'Pan-African Film and Television Festival',
  'Durban International Film Festival',
  'Cape Town International Film Market and Festival',
];

// ─── Notable Documentary Festivals ───────────────────────────────────────────
export const RECOGNIZED_DOCUMENTARY: string[] = [
  'IDFA',
  'International Documentary Film Festival Amsterdam',
  'Hot Docs',
  'Hot Docs Canadian International Documentary Festival',
  'Sheffield Doc/Fest',
  'CPH:DOX',
  'Visions du Réel',
  'Dok Leipzig',
  'DOK Leipzig',
  'Thessaloniki Documentary Festival',
  'Full Frame Documentary Film Festival',
  'True/False Film Fest',
  'Camden International Film Festival',
  'DOC NYC',
  'Ambulante',
  'Docaviv',
  'Docaviv Tel Aviv International Documentary Film Festival',
  'Ji.hlava International Documentary Film Festival',
  'Yamagata International Documentary Film Festival',
  'YIDFF',
  'DMZ International Documentary Film Festival',
  'Cinéma du Réel',
];

// ─── Notable Short Film Festivals ─────────────────────────────────────────────
export const RECOGNIZED_SHORT: string[] = [
  'Clermont-Ferrand International Short Film Festival',
  'Oberhausen International Short Film Festival',
  'Tampere Film Festival',
  'Palm Springs International ShortFest',
  'Encounters Short Film and Animation Festival',
  'Uppsala Short Film Festival',
  'Vienna Shorts',
  'Drama International Short Film Festival',
  'Leuven International Short Film Festival',
  'Go Short',
  'International Short Film Festival Winterthur',
  'Flickerfest',
  'LA Shorts',
  'Hollyshorts Film Festival',
  'Rhode Island International Film Festival',
  'Ann Arbor Film Festival',
  'Aesthetica Short Film Festival',
  'Aspen Shortsfest',
];

// ─── Known Prestigious Funds ──────────────────────────────────────────────────
export const PRESTIGIOUS_FUNDS: string[] = [
  'Hubert Bals Fund',
  'IDFA Bertha Fund',
  'Bertha IDFA Forum',
  'Sundance Documentary Fund',
  'Sundance Institute Documentary Fund',
  'World Cinema Fund',
  'WCF',
  'Asian Cinema Fund',
  'ACF',
  'SEAFIC',
  'Catapult Film Fund',
  'Doha Film Institute',
  'DFI',
  'Tribeca Documentary Fund',
  'Hot Docs Forum',
  'Purin Pictures',
  'ITVS',
  'CNC Aide aux cinémas du monde',
  'Chicken & Egg Pictures',
  'Cinemart',
  'IFFR Rotterdam Cinemart',
  'Jan Vrijman Fund',
  'Berlinale World Cinema Fund',
  'Göteborg Film Fund',
  'EWA Network',
  'Creative Europe',
  'MEDIA Programme',
  'Eurimages',
  'Sundance Institute Feature Film Program',
  'Sundance Institute',
  'Coppola Film Program',
  'San Francisco Film Society',
  'SFFilm',
  'Jerome Foundation',
  'Gucci Tribeca Documentary Fund',
  'Impact Documentary Film Fund',
  'BRITDOC Foundation',
  'Documentary Fund',
];

// ─── Known Prestigious Education / Labs ───────────────────────────────────────
export const PRESTIGIOUS_EDUCATION: string[] = [
  'Berlinale Talents',
  'Berlinale Talent Campus',
  'Cannes Cinéfondation',
  'Cinéfondation',
  'Sundance Institute',
  'Sundance Labs',
  'Sundance Screenwriters Lab',
  'Sundance Directors Lab',
  'IFFR Rotterdam Lab',
  'EAVE',
  'Sources 2',
  'TorinoFilmLab',
  'Sarajevo Talent Campus',
  'ISFF Talents',
  'Busan Asian Film School',
  'Asian Film Academy',
  'AFA',
  'Locarno Film Festival Academy',
  'Locarno Open Doors',
  'Tribeca Film Institute',
  'Film Independent',
  'Independent Spirit Awards',
  'TIFF Talent Lab',
  'TIFF Industry',
  'Göteborg Film Festival Industry',
  'Rotterdam Lab',
  'Nipkow Program',
  'Cannes Cinéfondation Residency',
  'La Fémis',
  'NFTS',
  'National Film and Television School',
  'AFI Conservatory',
  'American Film Institute',
  'NYU Tisch',
  'Columbia University Film',
  'USC School of Cinematic Arts',
  'Cannes Short Film Corner',
  'Festival de Cannes Cinéfondation',
  'Jan Vrijman Fund Documentary Lab',
  'DOC LAB Poland',
  'Visions du Réel Doc Outlook',
  'IDFA Academy',
  'Hot Docs Doc Accelerator',
  'IDA Documentary Lab',
];

// ─── Lookup function ──────────────────────────────────────────────────────────
export function getHardcodedTier(name: string): { tier: string; signals: string[] } | null {
  const lower = name.toLowerCase();

  const inList = (list: string[]) =>
    list.some((f) => {
      const fl = f.toLowerCase();
      // Match if name contains the festival name or vice versa (for abbreviations)
      return lower.includes(fl) || fl.includes(lower);
    });

  if (inList(FIAPF_COMPETITIVE)) {
    return { tier: 'a-list', signals: ['fiapf-accredited', 'physical-venue', 'long-history'] };
  }
  if (inList(FIAPF_DOC_SHORT)) {
    return { tier: 'a-list', signals: ['fiapf-accredited', 'physical-venue'] };
  }
  if (inList(FIAPF_NON_COMPETITIVE)) {
    return { tier: 'a-list', signals: ['fiapf-accredited', 'physical-venue', 'industry-press'] };
  }

  // Oscar OR BAFTA qualifying → a-list
  const isOscar = inList(OSCAR_QUALIFYING);
  const isBafta = inList(BAFTA_QUALIFYING);
  if (isOscar || isBafta) {
    const signals: string[] = [];
    if (isOscar) signals.push('oscar-qualifying');
    if (isBafta) signals.push('bafta-qualifying');
    signals.push('physical-venue');
    return { tier: 'a-list', signals };
  }

  if (inList(RECOGNIZED_MAJOR) || inList(RECOGNIZED_DOCUMENTARY) || inList(RECOGNIZED_SHORT)) {
    return { tier: 'recognized', signals: ['physical-venue', 'long-history', 'industry-press'] };
  }
  if (inList(PRESTIGIOUS_FUNDS)) {
    return { tier: 'a-list', signals: ['prestigious-fund', 'international-scope'] };
  }
  if (inList(PRESTIGIOUS_EDUCATION)) {
    return { tier: 'a-list', signals: ['prestigious-lab', 'university-affiliated'] };
  }

  return null; // cần AI phân tích
}
