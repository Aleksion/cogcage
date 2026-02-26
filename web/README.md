# CogCage Web

Conversion-focused Astro landing site for CogCage.

## Run

```bash
npm install
npm run dev
npm run build
```

## Revenue Configuration

Set these optional public env vars in `.env` (or deployment env):

```bash
PUBLIC_STRIPE_FOUNDER_URL="https://buy.stripe.com/..."
PUBLIC_PRO_WAITLIST_URL="#join"
PUBLIC_TOURNAMENT_WAITLIST_URL="#join"
```

If `PUBLIC_STRIPE_FOUNDER_URL` is set, Founder checkout now captures email first, logs a server-side founder intent (`POST /api/founder-intent`), and opens Stripe with `prefilled_email` to reduce checkout friction.

## Waitlist Data Ownership

The landing form posts to `POST /api/waitlist` (Astro server route) and writes leads to SQLite via `better-sqlite3`.

- Default DB path: `./data/cogcage.db`
- Override with: `COGCAGE_DB_PATH=/absolute/path/to/cogcage.db`

Stored fields: email, primary game, source, user-agent, IP (from `x-forwarded-for`), created timestamp.
