-- 005: Multi-user auth
-- users table + user_id scoping for per-user data

CREATE TABLE IF NOT EXISTS users (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE,
  email   TEXT NOT NULL,
  name    TEXT,
  avatar  TEXT,
  role    TEXT NOT NULL DEFAULT 'member',   -- 'owner' | 'member'
  status  TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved'
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Seed owner row (id=1). Password-based auth, not Google.
INSERT OR IGNORE INTO users (id, email, name, role, status)
VALUES (1, 'owner@ift.internal', 'Tri Pham', 'owner', 'approved');

-- Add user_id to per-user tables; existing rows belong to owner (id=1)
ALTER TABLE watchlist        ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE films            ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE submissions      ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE monitor_commands ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_watchlist_user  ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_films_user      ON films(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_user   ON monitor_commands(user_id);
