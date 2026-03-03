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
  website_ok?: number;       // 1 = OK, 0 = broken, null = unchecked
  website_checked_at?: string;
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
  website_ok?: number;
  website_checked_at?: string;
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
  website_ok?: number;
  website_checked_at?: string;
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
