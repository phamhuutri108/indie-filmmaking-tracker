-- Migration 010: In-app chat / announcement channel
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  channel     TEXT NOT NULL DEFAULT 'announcements', -- 'announcements' | 'feedback'
  content     TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'member',        -- 'owner' | 'member'
  email_sent  INTEGER DEFAULT 0,                    -- 1 if blast email was sent
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_created ON chat_messages(channel, created_at DESC);
