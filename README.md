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

Vercel Cron runs the daily update in two ordered steps, as configured in `vercel.json`:

- `GET /api/cron/market-sync` at `12:17 UTC` refreshes and quality-filters the card-level market feed.
- `GET /api/cron/player-index-sync` at `12:27 UTC` evaluates the refreshed market, then publishes a rotating Player Index lineup.

During U.S. daylight time these run at 8:17 and 8:27 a.m. Eastern; during standard time they run at 7:17 and 7:27 a.m. Eastern. No daily deployment or manual sync is required.

The Player Index job starts with up to 36 verified player candidates from the current card feed, ranks their 60-day market evidence, validates an exact player portrait, and publishes 6–8 of the strongest signals. It limits each sport to two players when enough sports qualify and normally keeps a player out for three days unless the underlying market changes materially. The fast-scroll page leads with the strongest supported signal—average sale movement, sales activity, traded value, or market breadth—rather than forcing the same metric onto every player.

The route requires these production environment variables:

- `CRON_SECRET` — used by Vercel to authorize the scheduled request.
- `CARDHEDGE_API_KEY` — used only by the server-side market sync.
- `DATABASE_URL` — Neon Postgres connection string.
- `SPORTSDB_API_KEY` — optional dedicated TheSportsDB key for player portraits; when omitted, the documented public v1 test key is used.

Store all three in Vercel environment settings. Never add their values to this repository or expose them to browser code. The manual sync control remains available as a fallback; normal daily updates do not require it.

## Run locally

Install dependencies with `npm install`, then run `npm run dev` and open http://localhost:3000.
