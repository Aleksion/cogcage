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

Use a Stripe success URL that points to `/success` and includes the checkout session id so paid conversions can be confirmed server-side:

```text
https://your-domain.com/success?session_id={CHECKOUT_SESSION_ID}
```

## Waitlist Data Ownership

The landing form posts to `POST /api/waitlist` (Astro server route) and writes leads to SQLite via `better-sqlite3`.

- Default DB path: `./data/cogcage.db`
- Override with: `COGCAGE_DB_PATH=/absolute/path/to/cogcage.db`

Stored fields: email, primary game, source, user-agent, IP (from `x-forwarded-for`), created timestamp.

## Funnel Event Tracking

Client tracking now sends events to `POST /api/events` and also mirrors the latest 100 events in `localStorage` as a fallback buffer.

Server-side event data is written to SQLite `conversion_events` with:
- event name + optional event id
- page/source/href/tier context
- optional known email
- JSON metadata payload
- user-agent, IP, timestamp
