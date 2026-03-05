-- Migration 015: Add short film duration fields to festival_sections
-- Thêm thời lượng phim ngắn được chấp nhận (phút) cho từng hạng mục

ALTER TABLE festival_sections ADD COLUMN short_film_min_min INTEGER; -- minimum duration in minutes
ALTER TABLE festival_sections ADD COLUMN short_film_max_min INTEGER; -- maximum duration in minutes
