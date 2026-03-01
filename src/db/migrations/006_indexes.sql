-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_films_user ON films(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_user ON monitor_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_festivals_deadline ON festivals(regular_deadline);
CREATE INDEX IF NOT EXISTS idx_funds_deadline ON funds_grants(deadline);
CREATE INDEX IF NOT EXISTS idx_education_deadline ON education_residency(deadline);
CREATE INDEX IF NOT EXISTS idx_email_logs_ref ON email_logs(template, ref_table, ref_id, created_at);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
