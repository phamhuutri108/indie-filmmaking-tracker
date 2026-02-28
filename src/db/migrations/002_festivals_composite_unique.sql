-- Migration 002: Change festivals UNIQUE constraint from (name) to (name, regular_deadline)
-- Allows the same festival to appear in multiple years with different deadlines.
-- SQLite does not support DROP CONSTRAINT, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS festivals_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_vi TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  filmfreeway_url TEXT,
  category TEXT,
  tier TEXT,
  submission_open DATE,
  early_deadline DATE,
  regular_deadline DATE,
  late_deadline DATE,
  notification_date DATE,
  festival_dates TEXT,
  entry_fee_early INTEGER,
  entry_fee_regular INTEGER,
  entry_fee_late INTEGER,
  accepts_short_film INTEGER DEFAULT 1,
  accepts_feature INTEGER DEFAULT 1,
  accepts_documentary INTEGER DEFAULT 1,
  description TEXT,
  description_vi TEXT,
  status TEXT DEFAULT 'active',
  source TEXT,
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, regular_deadline)
);

INSERT OR IGNORE INTO festivals_v2 SELECT * FROM festivals;

DROP TABLE festivals;

ALTER TABLE festivals_v2 RENAME TO festivals;

CREATE INDEX IF NOT EXISTS idx_festivals_deadline ON festivals(regular_deadline);
CREATE INDEX IF NOT EXISTS idx_festivals_status ON festivals(status);

PRAGMA foreign_keys = ON;
