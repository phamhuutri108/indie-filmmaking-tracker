-- IFT Database Schema
-- Cloudflare D1 (SQLite)

-- ============================================================
-- MODULE 1: Festival Tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS festivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_vi TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  filmfreeway_url TEXT,
  category TEXT, -- narrative, documentary, short, animation, experimental
  tier TEXT, -- A-list, regional, emerging
  submission_open DATE,
  early_deadline DATE,
  regular_deadline DATE,
  late_deadline DATE,
  notification_date DATE,
  festival_dates TEXT, -- e.g. "Oct 1-10, 2025"
  entry_fee_early INTEGER, -- in USD cents
  entry_fee_regular INTEGER,
  entry_fee_late INTEGER,
  accepts_short_film INTEGER DEFAULT 1,
  accepts_feature INTEGER DEFAULT 1,
  accepts_documentary INTEGER DEFAULT 1,
  description TEXT,
  description_vi TEXT,
  status TEXT DEFAULT 'active', -- active, closed, cancelled
  source TEXT, -- filmfreeway, rss, manual
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, regular_deadline)
);

-- ============================================================
-- MODULE 2: Fund & Grant Radar
-- ============================================================
CREATE TABLE IF NOT EXISTS funds_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  name_vi TEXT,
  organization TEXT,
  country TEXT,
  website TEXT,
  type TEXT, -- development, production, post-production, distribution
  focus TEXT, -- documentary, narrative, animation, experimental
  region_focus TEXT, -- global, asia, southeast-asia, europe, etc.
  max_amount INTEGER, -- in USD
  currency TEXT DEFAULT 'USD',
  open_date DATE,
  deadline DATE,
  notification_date DATE,
  eligibility TEXT,
  eligibility_vi TEXT,
  description TEXT,
  description_vi TEXT,
  status TEXT DEFAULT 'active',
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MODULE 3: Education & Residency Hub
-- ============================================================
CREATE TABLE IF NOT EXISTS education_residency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  name_vi TEXT,
  organization TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  type TEXT, -- lab, residency, workshop, scholarship, masterclass
  duration TEXT, -- e.g. "2 weeks", "3 months"
  application_open DATE,
  deadline DATE,
  program_dates TEXT,
  stipend INTEGER, -- in USD
  covers_travel INTEGER DEFAULT 0,
  covers_accommodation INTEGER DEFAULT 0,
  eligibility TEXT,
  eligibility_vi TEXT,
  description TEXT,
  description_vi TEXT,
  status TEXT DEFAULT 'active',
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MODULE 4: Monitor Commands (Command Center)
-- ============================================================
CREATE TABLE IF NOT EXISTS monitor_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_url TEXT NOT NULL,
  target_name TEXT,
  monitor_type TEXT NOT NULL, -- festival, fund, education, custom
  ref_id INTEGER, -- references festivals/funds_grants/education_residency.id
  ref_table TEXT, -- festivals, funds_grants, education_residency
  watch_for TEXT, -- deadline, early_bird, results, announcement
  alert_days_before INTEGER DEFAULT 7,
  check_frequency TEXT DEFAULT 'daily',
  is_active INTEGER DEFAULT 1,
  last_triggered DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email alert log
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT,
  template TEXT, -- digest, alert, reminder
  ref_table TEXT,
  ref_id INTEGER,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  sent_at DATETIME,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RSS feed cache
CREATE TABLE IF NOT EXISTS rss_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_url TEXT NOT NULL,
  item_guid TEXT NOT NULL,
  title TEXT,
  link TEXT,
  pub_date DATETIME,
  content TEXT,
  processed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feed_url, item_guid)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_festivals_deadline ON festivals(regular_deadline);
CREATE INDEX IF NOT EXISTS idx_festivals_status ON festivals(status);
CREATE INDEX IF NOT EXISTS idx_funds_deadline ON funds_grants(deadline);
CREATE INDEX IF NOT EXISTS idx_education_deadline ON education_residency(deadline);
CREATE INDEX IF NOT EXISTS idx_monitor_active ON monitor_commands(is_active);
CREATE INDEX IF NOT EXISTS idx_rss_processed ON rss_cache(processed);
