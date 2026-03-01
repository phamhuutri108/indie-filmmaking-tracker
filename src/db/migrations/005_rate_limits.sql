-- Rate limiting for auth endpoints
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  ip TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  first_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME
);
