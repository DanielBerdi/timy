# Timy

Single-user time tracking for a consultant (Clockify-style): customers, projects per customer, hourly rates in USD or ILS, a calendar with Google Calendar import, an inline-editable timesheet, and reports with CSV export. Only one Google account can sign in.

Stack: Next.js 15 (App Router), Tailwind 4, SQLite via libSQL/Turso, Auth.js (Google).

## Setup
1. In Google Cloud Console create an **OAuth client (Web)**, enable the **Google Calendar API**, and add the redirect URI `http://localhost:3000/api/auth/callback/google` (plus your production URL).
2. `cp .env.example .env` and fill in `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` (`openssl rand -base64 32`). `ALLOWED_EMAIL` defaults to danielberdy@gmail.com.
3. `npm install && npm run dev` → http://localhost:3000

If the OAuth consent screen is in "Testing" mode, add the allowed email as a test user.

## Notes
- **Rates**: set on the customer (rate + currency). A project may override rate and currency. Entries use the effective rate; non-billable entries/projects count as 0 revenue.
- **Reports** never convert currencies: USD and ILS totals are shown side by side.
- **Calendar import** reads timed events from your primary Google calendar (read-only) and creates entries for a chosen project; re-importing the same event is ignored. The refresh token is stored server-side in SQLite; if access stops working, sign out and in again.
- Durations accept `1:30`, `1.5`, `90m`, `1h30m`. Weeks start on Sunday. Times are wall-clock; Calendar events are converted using `APP_TIMEZONE`.
- Data lives in `TURSO_DATABASE_URL` (default: local file `./data/timy.db`). Tables are created automatically on first request.
- `npm test` (unit tests), `npm run typecheck`, `npm run build`.

## Deploy free on Vercel + Turso
1. **Turso** (turso.tech, free tier): `turso db create timy`, then `turso db show timy --url` and `turso db tokens create timy`.
2. **Vercel**: import this GitHub repo (Hobby plan). Set env vars: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAIL`, `APP_TIMEZONE`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Pick the Vercel function region closest to your Turso database.
3. **Google Cloud**: add `https://<your-project>.vercel.app/api/auth/callback/google` as an authorized redirect URI (use a stable production domain, not preview URLs).
4. Open the site and sign in. Vercel Hobby is for non-commercial use; check their terms for your situation.
