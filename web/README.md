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

If `PUBLIC_STRIPE_FOUNDER_URL` is set, Founder CTAs route directly to checkout and emit `founder_checkout_click` + `checkout_intent` tracking events to local event storage.
