-- View: monitor_commands with resolved ref_name and deadline
CREATE VIEW IF NOT EXISTS v_monitor_details AS
SELECT
  mc.*,
  CASE mc.ref_table
    WHEN 'festivals'          THEN f.name
    WHEN 'funds_grants'       THEN fg.name
    WHEN 'education_residency' THEN er.name
  END AS ref_name,
  CASE mc.ref_table
    WHEN 'festivals'          THEN f.regular_deadline
    WHEN 'funds_grants'       THEN fg.deadline
    WHEN 'education_residency' THEN er.deadline
  END AS deadline,
  CASE mc.ref_table
    WHEN 'festivals'          THEN f.website
    WHEN 'funds_grants'       THEN fg.website
    WHEN 'education_residency' THEN er.website
  END AS ref_website
FROM monitor_commands mc
LEFT JOIN festivals f          ON mc.ref_table = 'festivals'          AND mc.ref_id = f.id
LEFT JOIN funds_grants fg      ON mc.ref_table = 'funds_grants'       AND mc.ref_id = fg.id
LEFT JOIN education_residency er ON mc.ref_table = 'education_residency' AND mc.ref_id = er.id;

-- View: watchlist with resolved ref_name, deadline, website
CREATE VIEW IF NOT EXISTS v_watchlist_details AS
SELECT
  w.*,
  CASE w.ref_table
    WHEN 'festivals'          THEN f.name
    WHEN 'funds_grants'       THEN fg.name
    WHEN 'education_residency' THEN er.name
  END AS ref_name,
  CASE w.ref_table
    WHEN 'festivals'          THEN f.regular_deadline
    WHEN 'funds_grants'       THEN fg.deadline
    WHEN 'education_residency' THEN er.deadline
  END AS deadline,
  CASE w.ref_table
    WHEN 'festivals'          THEN f.website
    WHEN 'funds_grants'       THEN fg.website
    WHEN 'education_residency' THEN er.website
  END AS website,
  CASE w.ref_table
    WHEN 'festivals'          THEN f.country
    WHEN 'funds_grants'       THEN fg.country
    WHEN 'education_residency' THEN er.country
  END AS ref_country
FROM watchlist w
LEFT JOIN festivals f          ON w.ref_table = 'festivals'          AND w.ref_id = f.id
LEFT JOIN funds_grants fg      ON w.ref_table = 'funds_grants'       AND w.ref_id = fg.id
LEFT JOIN education_residency er ON w.ref_table = 'education_residency' AND w.ref_id = er.id;
