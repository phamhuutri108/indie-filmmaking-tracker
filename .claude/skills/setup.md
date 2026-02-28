# IFT Setup Skill

## Goal
Setup complete Indie Filmmaking Tracker project from scratch on Cloudflare stack.

## Stack
- Cloudflare Workers (API + Cron)
- Cloudflare Pages (React frontend)
- Cloudflare D1 (SQLite database)
- Resend.com (email)
- TypeScript throughout

## Instructions
When user says "setup project" or "init IFT", do the following in order:

### Step 1 — File structure
Create this structure:
```
src/
  workers/
    index.ts        → main Worker entry
    cron.ts         → daily cron job
    scraper.ts      → RSS + HTML scraper
  pages/
    src/
      App.tsx
      components/
      i18n/         → vi.ts + en.ts
  db/
    schema.sql
    seed.sql
wrangler.toml
package.json
tsconfig.json
```

### Step 2 — Database
Run: `wrangler d1 execute ift-db --file=src/db/schema.sql`

### Step 3 — Install dependencies
Run:
```bash
npm init -y
npm install hono react react-dom
npm install -D typescript wrangler @cloudflare/workers-types
```

### Step 4 — Verify
Run: `wrangler dev` to confirm Worker starts locally.

## Rules
- Always TypeScript, never JavaScript
- Cloudflare Workers runtime only (no Node.js APIs)
- Mobile-first UI
- All text bilingual vi/en
- Use Hono.js for Worker routing