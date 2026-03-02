# The Molt Pit Ops Log

---

## Autopilot Checkpoint — 00:50 ET Mar 2 (cron 3a2fb22f, pass 48)

**Directive:** STOP landing-page copy. Priorities: (1) signup reliability, (2) playable demo loop, (3) monetization, (4) ops log.

### Verification Audit (this pass)

**Build:** ✅ clean — `✓ built in 1.37s` (Vite + Nitro Vercel output, zero errors or warnings)

**P1 — Signup form reliability + storage + observable logs:** ✅ VERIFIED LIVE
- `app/routes/api/waitlist.ts` — 369 lines, full try/catch stack: Redis primary → SQLite fallback → file fallback → never breaks request flow
- `app/lib/waitlist-redis.ts` — Upstash Redis with `moltpit:waitlist` LIST, idempotency keys, rate limiting per IP/UA
- Honeypot fields (company/website/nickname) blocking bots
- Rate limiting: 6 requests per 10-minute window per IP
- Structured ops log to Redis `moltpit:ops-log` (capped 500 entries) on every auth path
- Observable: `/api/ops` viewer gated by `MOLTPIT_OPS_KEY` env var
- SQLite graceful degradation (NMV mismatch no longer spams logs)

**P2 — Playable demo loop with map movement + action economy:** ✅ VERIFIED LIVE
- `app/components/Play.tsx` — arena map (`arena-map` CSS grid 20×20), bot positions (botAPos/botBPos state), MOVE events with directional deltas, AP economy (action points)
- `app/components/DemoLoop.tsx` — BERSERKER vs TACTICIAN, weighted action selection (ATTACK/DEFEND/CHARGE/STUN), damage rolls 15–25, turn-by-turn combat log
- `app/components/QuickDemo.tsx` — 20×20 SVG grid, cyan/red bot dots, live distance readout, energy bars per bot
- `app/components/BabylonArena.tsx` — Babylon.js 3D engine wired, GLB models at Vercel Blob CDN
- Scripted fallback when LLM unavailable

**P3 — Monetization path:** ✅ CODE COMPLETE / ⚠️ 3 env vars pending from Aleks
- `app/components/Play.tsx` — Founder checkout CTA reads `PUBLIC_STRIPE_FOUNDER_URL`; gracefully degrades to "Reserve intent" flow when URL absent
- `app/routes/api/founder-intent.ts` — captures email + source, writes to Redis + SQLite + Convex
- `app/routes/api/postback.ts` — Stripe webhook handler, HMAC auth via `MOLTPIT_POSTBACK_KEY`, idempotent, writes conversion events
- `app/routes/api/checkout-success.ts` — post-purchase success handler
- **Env vars needed in Vercel dashboard:**
  - `PUBLIC_STRIPE_FOUNDER_URL` — Stripe payment link URL
  - `MOLTPIT_POSTBACK_KEY` — webhook HMAC secret
  - `MOLTPIT_OPS_KEY` — gates /api/ops viewer

**P4 — Ops log:** this entry ✅

**Landing copy:** ✅ HALTED — zero copy changes this pass

### Current Counts
- Waitlist leads: 7 (Redis)
- Founder intents: 2 (Redis)

### Blocking Action (Aleks only)
Set 3 env vars in Vercel dashboard → Stripe checkout + authenticated postback go live instantly. No code changes needed.

---

## 2026-02-27 / 2026-02-28 — Sprint Wrap

### What Shipped

| # | Description | Notes |
|---|---|---|
| PRs 16–22 | TanStack Query migration, rebrand to The Molt Pit | Fully merged to main |
| PR ~17 | BattleHero component wired | Landing page hero section |
| PR ~18 | LLM quick battles (BYO API key flow) | QuickDemo + `/api/agent/decide` |
| PR ~19 | PlayCanvas wiring stubs | Game client integration scaffolding |
| fix | **SQLite graceful degradation** | `waitlist-db.ts` now uses lazy `require('better-sqlite3')` wrapped in try/catch at module init. Binary ABI mismatch (NMV 137 vs 127) no longer spams ops log per-request. All exported functions return safe zero-values when SQLite unavailable. |
| feat | **Arena map + energy bars in QuickDemo** | 20×20 SVG grid (280px), cyan BERSERKER dot, red TACTICIAN dot, objective zone circle, energy bars per bot, live distance readout. No external deps. |

### Current Counts (as of ops check)
- **Waitlist leads**: 7
- **Founder intents**: 2

### Pending from Aleks
- `PUBLIC_STRIPE_FOUNDER_URL` — Stripe founder checkout URL not yet set in Vercel env
- OAuth env vars — Google/GitHub OAuth not yet configured for production

### Known State
- Vercel deploys from `main` automatically
- SQLite on Vercel writes to `/tmp/moltpit.db` (ephemeral, resets on cold start) — Redis fallback handles persistence
- better-sqlite3 binary ABI mismatch was causing every API route to 500; now silently degraded

---
