// ─── Festival Insights (AI-generated profile) ─────────────────────────────────

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

export interface FestivalInsights {
  festival_id: number;
  confidence: 'high' | 'medium' | 'low';
  summary?: string;
  what_they_look_for?: string;
  eligibility?: string;
  industry_presence?: string;
  tips?: string;
  summary_vi?: string;
  what_they_look_for_vi?: string;
  eligibility_vi?: string;
  industry_presence_vi?: string;
  tips_vi?: string;
  past_selections: PastFilm[];
  prizes: FestivalPrize[];
  useful_links: UsefulLink[];
  acceptance_stats: AcceptanceStat | null;
  generated_at?: string;
  model_used?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface FestivalSection {
  id: number;
  festival_id: number;
  section_name: string;
  section_name_vi?: string;
  category?: string;
  early_deadline?: string;
  regular_deadline?: string;
  late_deadline?: string;
  entry_fee_early?: number;
  entry_fee_regular?: number;
  entry_fee_late?: number;
  filmfreeway_url?: string;
  notification_date?: string;
  status?: string;
  source?: string;
  short_film_min_min?: number; // minimum short film duration (minutes)
  short_film_max_min?: number; // maximum short film duration (minutes)
  entry_currency?: string;    // e.g. 'USD', 'EUR', 'CHF'
}

export interface Festival {
  id: number;
  name: string;
  name_vi?: string;
  country?: string;
  city?: string;
  website?: string;
  filmfreeway_url?: string;
  category?: string;
  tier?: string;
  early_deadline?: string;
  regular_deadline?: string;
  late_deadline?: string;
  notification_date?: string;
  festival_dates?: string;
  entry_fee_early?: number;
  entry_fee_regular?: number;
  entry_fee_late?: number;
  description?: string;
  description_vi?: string;
  status?: string;
  source?: string;
  prestige_tier?: string;     // 'a-list' | 'recognized' | 'credible' | 'unverified' | 'not-recommended'
  prestige_signals?: string;  // JSON string array
  genres?: string;            // JSON string array
  sections?: FestivalSection[];
}

export interface Fund {
  id: number;
  name: string;
  name_vi?: string;
  organization?: string;
  country?: string;
  website?: string;
  type?: string;
  focus?: string;
  region_focus?: string;
  max_amount?: number;
  currency?: string;
  deadline?: string;
  open_date?: string;
  eligibility?: string;
  description?: string;
  status?: string;
  last_checked?: string;
  prestige_tier?: string;
  genres?: string;
}

export interface Education {
  id: number;
  name: string;
  name_vi?: string;
  organization?: string;
  country?: string;
  city?: string;
  website?: string;
  type?: string;
  duration?: string;
  deadline?: string;
  program_dates?: string;
  stipend?: number;
  covers_travel?: number;
  covers_accommodation?: number;
  eligibility?: string;
  description?: string;
  status?: string;
  prestige_tier?: string;
  genres?: string;
}

export interface Monitor {
  id: number;
  target_url: string;
  target_name?: string;
  monitor_type: string;
  ref_table?: string;
  ref_id?: number;
  ref_name?: string;
  deadline?: string;
  watch_for?: string;
  alert_days_before: number;
  is_active: number;
  last_triggered?: string;
  created_at: string;
}

export interface WatchlistItem {
  id: number;
  ref_table: string; // 'festivals' | 'funds_grants' | 'education_residency'
  ref_id: number;
  ref_name?: string;
  deadline?: string;
  website?: string;
  country?: string;
  notes?: string;
  starred_at: string;
}

export interface DashboardItem {
  type: 'festival' | 'fund' | 'education';
  id: number;
  name: string;
  deadline?: string;
  website?: string;
  status?: string;
}

export interface Stats {
  festivals: number;
  funds: number;
  education: number;
  upcoming7: number;
  upcoming30: number;
  films: number;
  submissions: number;
}

export interface Film {
  id: number;
  title: string;
  title_vi?: string;
  year?: number;
  genre?: string;
  duration_min?: number;
  logline?: string;
  logline_vi?: string;
  director?: string;
  producer?: string;
  status?: string; // in-production | completed | released
  poster_url?: string;
  trailer_url?: string;
  notes?: string;
  created_at?: string;
}

export interface Submission {
  id: number;
  film_id: number;
  film_title?: string;
  ref_table: string; // festivals | funds_grants | education_residency
  ref_id: number;
  ref_name?: string;
  deadline?: string;
  submitted_at?: string;
  submission_platform?: string;
  submission_url?: string;
  entry_fee_paid?: number;
  status: string; // draft | submitted | accepted | rejected | waitlisted | withdrawn
  result_date?: string;
  notes?: string;
  created_at?: string;
}
