-- IFT Seed Data
-- Sample data for development (dates in 2026/2027)

-- Clear existing data first
DELETE FROM festivals;
DELETE FROM funds_grants;
DELETE FROM education_residency;

-- Festivals
INSERT INTO festivals (name, name_vi, country, city, website, category, tier, early_deadline, regular_deadline, description, description_vi, source) VALUES
('Sundance Film Festival 2027', 'Liên hoan phim Sundance 2027', 'USA', 'Park City', 'https://sundance.org', 'documentary', 'A-list', '2026-08-15', '2026-09-15', 'One of the most prestigious independent film festivals in the world.', 'Một trong những liên hoan phim độc lập uy tín nhất thế giới.', 'manual'),
('IDFA Amsterdam 2026', 'IDFA Amsterdam 2026', 'Netherlands', 'Amsterdam', 'https://idfa.nl', 'documentary', 'A-list', '2026-06-01', '2026-07-15', 'International Documentary Film Festival Amsterdam.', 'Liên hoan phim tài liệu quốc tế Amsterdam.', 'manual'),
('Busan International Film Festival 2026', 'Liên hoan phim quốc tế Busan 2026', 'South Korea', 'Busan', 'https://biff.kr', 'narrative', 'A-list', '2026-05-01', '2026-06-30', 'Asia''s leading film festival.', 'Liên hoan phim hàng đầu châu Á.', 'manual'),
('Hot Docs 2026', 'Hot Docs 2026', 'Canada', 'Toronto', 'https://hotdocs.ca', 'documentary', 'A-list', '2026-10-01', '2026-11-15', 'North America''s largest documentary festival.', 'Liên hoan phim tài liệu lớn nhất Bắc Mỹ.', 'manual');

-- Funds & Grants
INSERT INTO funds_grants (name, name_vi, organization, country, website, type, focus, region_focus, max_amount, deadline, description, description_vi) VALUES
('Hubert Bals Fund 2026', 'Quỹ Hubert Bals 2026', 'International Film Festival Rotterdam', 'Netherlands', 'https://iffr.com/en/hbf', 'development', 'narrative', 'global', 10000, '2026-09-01', 'Supports script and project development for filmmakers from developing countries.', 'Hỗ trợ phát triển kịch bản và dự án cho các nhà làm phim từ các nước đang phát triển.'),
('IDFA Bertha Fund 2026', 'Quỹ IDFA Bertha 2026', 'IDFA', 'Netherlands', 'https://idfa.nl/en/info/idfa-bertha-fund', 'production', 'documentary', 'global', 40000, '2026-05-01', 'Supports documentary filmmakers from developing countries.', 'Hỗ trợ các nhà làm phim tài liệu từ các nước đang phát triển.'),
('Sundance Documentary Fund 2026', 'Quỹ phim tài liệu Sundance 2026', 'Sundance Institute', 'USA', 'https://sundance.org/funding', 'production', 'documentary', 'global', 30000, '2026-06-15', 'Supports social justice documentaries.', 'Hỗ trợ các phim tài liệu về công bằng xã hội.');

-- Education & Residencies
INSERT INTO education_residency (name, name_vi, organization, country, city, website, type, duration, deadline, description, description_vi) VALUES
('Berlinale Talents 2027', 'Berlinale Talents 2027', 'Berlin International Film Festival', 'Germany', 'Berlin', 'https://berlinale-talents.de', 'lab', '1 week', '2026-10-15', 'International talent development program at the Berlin Film Festival.', 'Chương trình phát triển tài năng quốc tế tại Liên hoan phim Berlin.'),
('Cannes Cinéfondation Residency 2026', 'Khu lưu trú Cinéfondation Cannes 2026', 'Festival de Cannes', 'France', 'Paris', 'https://cinefondation.com', 'residency', '5 months', '2026-03-31', '5-month residency in Paris for filmmakers developing their first or second feature.', 'Khu lưu trú 5 tháng tại Paris cho các nhà làm phim đang phát triển bộ phim dài đầu tiên hoặc thứ hai.'),
('Busan Asian Film School 2026', 'Trường phim châu Á Busan 2026', 'Asian Film Academy', 'South Korea', 'Busan', 'https://asianfilmacademy.kr', 'workshop', '2 weeks', '2026-05-31', 'Intensive filmmaking program during BIFF.', 'Chương trình làm phim chuyên sâu trong BIFF.');
