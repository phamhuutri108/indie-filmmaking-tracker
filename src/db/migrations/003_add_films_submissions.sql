-- Migration 003: Add films & submissions tables (Phase 2 — Submission Tracker)

-- Tri's own films
CREATE TABLE IF NOT EXISTS films (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  title_vi TEXT,
  year INTEGER,
  genre TEXT, -- documentary, narrative, short, animation, experimental
  duration_min INTEGER, -- in minutes
  logline TEXT,
  logline_vi TEXT,
  director TEXT DEFAULT 'Tri Pham',
  producer TEXT,
  status TEXT DEFAULT 'in-production', -- in-production, completed, released
  poster_url TEXT,
  trailer_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Submission records: which film → which festival/fund/education
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  film_id INTEGER NOT NULL REFERENCES films(id),
  film_title TEXT, -- cached for quick display
  ref_table TEXT NOT NULL, -- festivals | funds_grants | education_residency
  ref_id INTEGER NOT NULL,
  ref_name TEXT, -- cached target name
  deadline TEXT, -- cached deadline date
  submitted_at DATE,
  submission_platform TEXT DEFAULT 'direct', -- filmfreeway | direct | email | other
  submission_url TEXT,
  entry_fee_paid INTEGER, -- in USD cents
  status TEXT DEFAULT 'draft', -- draft | submitted | accepted | rejected | waitlisted | withdrawn
  result_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_film ON submissions(film_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_films_status ON films(status);
