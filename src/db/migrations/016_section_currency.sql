-- Migration 016: Add entry_currency to festival_sections
-- Cho phép lưu phí nộp phim theo tiền tệ gốc của liên hoan

ALTER TABLE festival_sections ADD COLUMN entry_currency TEXT DEFAULT 'USD';
