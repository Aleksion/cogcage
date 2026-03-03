# The Molt Pit Ops Log

---

## Product-Mode Ship — 00:20 ET Mar 3

Directive executed: ship only product-critical lane (P1 signup reliability, P2 playable loop verification, P3 founder checkout+postback reliability, P4 ops artifacts).

### Shipped artifacts
- `app/routes/api/waitlist.ts`
  - Enforced deterministic API contract across all outcomes (`status`, `storage`, `queued`, `degraded`, `replayed`, `requestId`).
  - Idempotency replay responses now return explicit replay contract metadata (`status: idempotent_replay`, `replayed: true`) with consistent shape.
  - Malformed JSON now deterministically returns `payload_invalid` instead of entering email validation path.
- `app/routes/api/founder-intent.ts`
  - Applied the same deterministic contract and replay contract behavior as waitlist.
  - Malformed JSON now deterministically returns `payload_invalid` instead of entering email validation path.
- `app/routes/api/postback.ts`
  - Added deterministic postback response contract (`recorded`, `recorded_degraded`, `queued_fallback`, `idempotent_replay`, etc.).
  - Added structured completion log event (`postback_request_completed`) with outcome + storage for traceability.
  - Idempotent replay responses now include explicit replay contract metadata and `x-idempotent-replay`.
  - Added GET verification-path logs (`postback_verify_received`, `postback_verify_completed`) and request-id-backed contract for deployment verification.
- `scripts/api-critical-routes.test.mjs` (new)
  - Added route-level reliability tests for malformed signup payload handling, Redis outage degradation path, postback idempotent replay, and GET verification contract/logs.
- `package.json`
  - `test:product` now includes `api-critical-routes.test.mjs`.

### Verification commands
- `npm run test:product` ✅ (16/16 pass)
- `npm run build` ✅

### Scope guard
- No landing-page copy iterations or marketing copy file edits in this pass.

## Product-Mode Ship — 19:02 ET Mar 2

Directive executed: stop copy iteration lane; ship product-critical reliability/demo/monetization checks only.

### Shipped artifacts
- `scripts/demo-loop-core.test.mjs` (new)
  - Playable map loop coverage: movement direction, AP spend, insufficient AP fallback, boundary clamp.
- `package.json`
  - `test:product` now includes `demo-loop-core.test.mjs`.
- `scripts/product-mode-reliability.test.mjs`
  - Added `/api/postback` idempotency receipt test coverage.
- Verified production-critical handlers remain hardened:
  - `app/routes/api/waitlist.ts`
  - `app/routes/api/founder-intent.ts`
  - `app/routes/api/postback.ts`

### Verification
- `npm run test:product` ✅ (12/12 pass)
- `npm run build` ✅

## Product-Mode Audit — 15:31 ET Mar 2

Directive executed: STOP landing-page copy iterations. Priority lock remains P1 signup reliability/storage/logging, P2 playable demo loop, P3 founder checkout + postback, P4 ops artifacts.

### Shipped artifacts this pass
- No new copy or non-critical scope touched.
- Re-verified product-critical lane already shipped and active:
  - Signup reliability path (`/api/waitlist`, `/api/founder-intent`) with Redis → SQLite → fallback queue behavior.
  - Playable demo loop (`DemoLoop` + `Play`) with map movement and AP/action economy.
  - Monetization path (`PUBLIC_STRIPE_FOUNDER_URL`, `/api/postback`, `/api/checkout-success`) and event lifecycle.

### Verification
- `npm run test:product` ✅ (9/9 pass)


## Product-Mode Ship — 16:46 ET Mar 2

Directive executed: prioritize P1 signup reliability, P2 playable loop, P3 monetization postback lifecycle, P4 ops artifacts.

### Shipped artifacts
- `app/lib/waitlist-redis.ts`
  - Corrected Redis rate-limit `resetMs` semantics to relative milliseconds for accurate `Retry-After` handling.
  - Added deterministic Redis dedupe keys:
    - waitlist leads dedupe by normalized email
    - founder intents dedupe by `intentId` (derived fallback when absent)
    - postback/checkout conversion dedupe by `eventId`
- `app/components/OpsLogPage.tsx`
  - Funnel cards now read `counts`/`redisCounts` from `/api/ops`, fixing visibility of live signup/founder/conversion totals.

### Verification
- `npm run test:product` ✅ (9/9 pass)
- `npm run build` ✅

## Product-Mode Ship — 16:18 ET Mar 2

Directive executed: prioritize P1 signup reliability, P2 playable loop, P3 monetization postback lifecycle, P4 ops artifacts.

### Shipped artifacts
- `app/lib/waitlist-redis.ts`
  - Added Redis idempotency receipt APIs with TTL-backed keys.
- `app/routes/api/waitlist.ts`
  - Idempotency replay now checks Redis before SQLite; idempotency receipts are written to both stores.
- `app/routes/api/founder-intent.ts`
  - Same Redis-first idempotency behavior as waitlist.
- `app/routes/api/postback.ts`
  - Paid conversion persistence now runs Redis-first, then SQLite fallback, then file queue.
  - Founder-intent side-write from postback now includes SQLite + fallback path if Redis is down.
- `app/routes/api/checkout-success.ts`
  - Checkout success conversion persistence now runs Redis-first, then SQLite fallback, then file queue.
  - API response includes `degraded` flag when fallback persistence is used.

### Verification
- `npm run test:product` ✅ (9/9 pass)
- `npm run build` ✅
- `npx tsc --noEmit` ⚠️ pre-existing repo-wide failures unrelated to this ship lane (Phaser typings/route typing/import-style errors).

## Product-Mode Ship — 15:40 ET Mar 2

Directive executed in strict order: P1 signup reliability, P2 playable loop, P3 monetization lifecycle, P4 ops artifacts.

### Shipped
- **P1 signup/storage reliability**
  - `app/routes/api/waitlist.ts` now attempts SQLite fallback write if Redis fails, then file queue as final fallback.
  - `app/routes/api/founder-intent.ts` now attempts SQLite fallback write if Redis fails, then file queue as final fallback.
  - `app/routes/api/founder-intent.ts` fixed telemetry runtime bug (missing `redisInsertConversionEvent` import).
  - `app/lib/waitlist-db.ts` uses ESM-safe SQLite load and migrated unique indexes so `ON CONFLICT(intent_id|event_id)` is valid.
- **P2 playable loop verification**
  - `scripts/ws2-core.test.mjs` now includes movement + action-economy assertions (`MOVE_COMPLETED`, energy spend).
- **P3 founder checkout + postback lifecycle**
  - `app/components/Play.tsx` now records checkout lifecycle events and persists founder intent before Stripe redirect.
  - `app/routes/api/postback.ts` now logs `postback_received`, invalid payload, and unsupported type outcomes.
  - `app/routes/api/checkout-success.ts` now logs request receipt + validation failures for both GET and POST.
- **P4 ops/testing artifacts**
  - `scripts/product-mode-reliability.test.mjs` added (idempotent persistence + receipt + rate-limit checks).
  - `package.json` added `test:product`.
  - `scripts/replay-fallback.mjs` updated index migration for reliable replay upserts.

### Verification
- `npm run test:product` ✅ (9/9 pass)
- `npm run build` ✅ (Vite + Nitro Vercel output)

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
