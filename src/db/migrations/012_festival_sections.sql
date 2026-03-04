-- Migration 012: Festival Sections — 2-tier schema
-- Mỗi festival có thể có nhiều hạng mục (sections), mỗi hạng mục có deadline/fee riêng

CREATE TABLE IF NOT EXISTS festival_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,       -- "Feature Films", "Short Films", "General"
  section_name_vi TEXT,             -- "Phim Dài", "Phim Ngắn", "Nộp phim chung"
  category TEXT,                    -- documentary|narrative|short|feature|animation|experimental|student
  early_deadline TEXT,
  regular_deadline TEXT,
  late_deadline TEXT,
  entry_fee_early INTEGER,          -- USD cents
  entry_fee_regular INTEGER,
  entry_fee_late INTEGER,
  filmfreeway_url TEXT,             -- section-specific FilmFreeway link (may differ from festival master)
  notification_date TEXT,
  status TEXT DEFAULT 'active',     -- active|closed|tba
  source TEXT,                      -- rss|manual
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(festival_id, section_name)
);

CREATE INDEX IF NOT EXISTS idx_sections_festival ON festival_sections(festival_id);
CREATE INDEX IF NOT EXISTS idx_sections_deadline ON festival_sections(regular_deadline);

-- Migrate existing festival deadline/category data → tạo section "General" cho từng festival
INSERT OR IGNORE INTO festival_sections
  (festival_id, section_name, category, early_deadline, regular_deadline,
   late_deadline, entry_fee_early, entry_fee_regular, filmfreeway_url,
   notification_date, source)
SELECT
  id, 'General', category, early_deadline, regular_deadline,
  late_deadline, entry_fee_early, entry_fee_regular, filmfreeway_url,
  notification_date, COALESCE(source, 'manual')
FROM festivals
WHERE regular_deadline IS NOT NULL OR early_deadline IS NOT NULL;
