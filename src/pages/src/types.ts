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
}

export interface Monitor {
  id: number;
  target_url: string;
  target_name?: string;
  monitor_type: string;
  watch_for?: string;
  alert_days_before: number;
  is_active: number;
  last_triggered?: string;
  created_at: string;
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
}
