-- Migration 008: URL health tracking
-- Adds website_ok and website_checked_at to track broken/redirected links

ALTER TABLE festivals ADD COLUMN website_ok INTEGER DEFAULT 1;
ALTER TABLE festivals ADD COLUMN website_checked_at DATETIME;

ALTER TABLE funds_grants ADD COLUMN website_ok INTEGER DEFAULT 1;
ALTER TABLE funds_grants ADD COLUMN website_checked_at DATETIME;

ALTER TABLE education_residency ADD COLUMN website_ok INTEGER DEFAULT 1;
ALTER TABLE education_residency ADD COLUMN website_checked_at DATETIME;
