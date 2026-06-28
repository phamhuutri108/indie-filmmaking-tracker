-- Migration 017: Data quality, provenance and human review queue

CREATE TABLE IF NOT EXISTS data_review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_type TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'festival',
  entity_id INTEGER,
  source_url TEXT,
  source_guid TEXT,
  source_title TEXT,
  candidate_json TEXT NOT NULL,
  ai_model TEXT,
  ai_confidence REAL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewer_id INTEGER REFERENCES users(id),
  UNIQUE(review_type, source_guid)
);

CREATE INDEX IF NOT EXISTS idx_data_review_status
  ON data_review_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_data_review_entity
  ON data_review_queue(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS data_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  status TEXT NOT NULL DEFAULT 'unverified',
  source_url TEXT,
  evidence TEXT,
  access_method TEXT,
  http_status INTEGER,
  final_url TEXT,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  checked_by INTEGER REFERENCES users(id),
  metadata TEXT,
  UNIQUE(entity_type, entity_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_data_verification_status
  ON data_verifications(entity_type, status, checked_at);
