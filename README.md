# Card Madness Pulse

Pulse is a mobile-first, full-screen feed for verified trading-card market data and curated real news.

## Current product behavior

- Real market stories are selected from the configured market-data API and stored in Neon Postgres.
- Market pages use verified FMV, 7-day and 30-day movement, sales volume, grade prices, and recent comparable sales.
- Candidate quality checks reject missing images, weak sales samples, stale or low-confidence FMV, inconsistent sales totals, and extreme modern-card values.
- Feed ordering spaces players, page formats, sports, and underlying cards; viewed cards receive a 72-hour soft cooldown.
- Detail pages show the latest sale versus FMV, the recent-sales range, liquidity, sales acceleration, confidence context, and the last three verified sales.
- News is limited to real articles entered through the protected news administrator.

## Automatic daily market sync

Vercel Cron calls `GET /api/cron/market-sync` every day at `12:17 UTC`, as configured in `vercel.json`. During U.S. daylight time this is 8:17 a.m. Eastern; during standard time it is 7:17 a.m. Eastern.

The route requires these production environment variables:

- `CRON_SECRET` — used by Vercel to authorize the scheduled request.
- `CARDHEDGE_API_KEY` — used only by the server-side market sync.
- `DATABASE_URL` — Neon Postgres connection string.

Store all three in Vercel environment settings. Never add their values to this repository or expose them to browser code. The manual sync control remains available as a fallback; normal daily updates do not require it.

## Run locally

Install dependencies with `npm install`, then run `npm run dev` and open http://localhost:3000.
