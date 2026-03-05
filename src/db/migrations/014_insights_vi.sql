-- Migration 014: Add Vietnamese text columns to festival_insights
ALTER TABLE festival_insights ADD COLUMN summary_vi TEXT;
ALTER TABLE festival_insights ADD COLUMN what_they_look_for_vi TEXT;
ALTER TABLE festival_insights ADD COLUMN eligibility_vi TEXT;
ALTER TABLE festival_insights ADD COLUMN industry_presence_vi TEXT;
ALTER TABLE festival_insights ADD COLUMN tips_vi TEXT;
