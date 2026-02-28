# Indie Filmmaking Tracker (IFT)
**URL:** ift.phamhuutri.com  
**Stack:** Cloudflare Pages + Workers + D1 + Cron Triggers  
**Email:** Resend.com  
**Language:** Bilingual VI/EN  

## Project Overview
A personal Film Intelligence Platform for filmmaker Tri Pham.
Automatically monitors international film festivals, funds, grants, 
residencies and sends smart alerts — replacing passive information gathering.

## 4 Core Modules
1. **Festival Tracker** — Deadlines, early bird, results (FilmFreeway + official sites + asianfilmfestivals.com)
2. **Fund & Grant Radar** — International film funds (Hubert Bals, IDFA Bertha, Sundance Doc Fund...)
3. **Education & Residency Hub** — Labs, residencies, scholarships (Berlinale Talents, Cannes Cinéfondation...)
4. **Command Center** — Google Calendar sync, Sheets export, custom monitor commands, email digest

## Monitor Command System
User can set: "Monitor this festival until deadline appears → alert me 7 days before"
System checks daily via Cron → triggers email when info becomes available

## Data Sources
- https://asianfilmfestivals.com/feed (RSS — daily updates)
- https://filmfreeway.com (scrape)
- Official festival websites
- Film fund websites

## File Structure
/src
  /workers       → Cloudflare Workers (API + Cron)
  /pages         → Frontend (React)
  /db            → D1 schema + migrations
/wrangler.toml   → Cloudflare config

## Key Rules for Claude
- Always use TypeScript
- Cloudflare Workers runtime only (no Node.js APIs)
- D1 for all database operations
- All UI components bilingual (vi/en)
- Mobile-first design