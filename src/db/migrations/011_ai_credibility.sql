-- Migration 011: AI Credibility System
-- Thêm prestige_tier, prestige_signals, genres, ai_analyzed cho tất cả 3 bảng chính

ALTER TABLE festivals ADD COLUMN prestige_tier TEXT DEFAULT 'unverified';
ALTER TABLE festivals ADD COLUMN prestige_signals TEXT; -- JSON array: ["fiapf","oscar-qualifying","physical-venue",...]
ALTER TABLE festivals ADD COLUMN genres TEXT;           -- JSON array: ["lgbtq","family",...] dùng cho Phase C filter
ALTER TABLE festivals ADD COLUMN ai_analyzed INTEGER DEFAULT 0;

ALTER TABLE funds_grants ADD COLUMN prestige_tier TEXT DEFAULT 'unverified';
ALTER TABLE funds_grants ADD COLUMN genres TEXT;
ALTER TABLE funds_grants ADD COLUMN ai_analyzed INTEGER DEFAULT 0;

ALTER TABLE education_residency ADD COLUMN prestige_tier TEXT DEFAULT 'unverified';
ALTER TABLE education_residency ADD COLUMN genres TEXT;
ALTER TABLE education_residency ADD COLUMN ai_analyzed INTEGER DEFAULT 0;
