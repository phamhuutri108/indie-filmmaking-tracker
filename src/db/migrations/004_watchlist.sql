-- Migration 004: Add watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_table TEXT NOT NULL, -- 'festivals' | 'funds_grants' | 'education_residency'
  ref_id INTEGER NOT NULL,
  notes TEXT,
  starred_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(ref_table, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_ref ON watchlist(ref_table, ref_id);
