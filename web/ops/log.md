# The Molt Pit Ops Log

---

## Product-Mode Cron — 21:43 ET Mar 2

Directive enforced: STOP landing-page copy iterations. Priority lock kept P1→P4 (signup reliability/storage/observability → playable demo movement + AP economy → founder checkout/postback path → ops artifacts).

### Pass result
- P1 signup reliability/storage/observability: ✅ verified (idempotent waitlist/founder persistence, receipt replay paths, fallback durability)
- P2 playable demo loop (map movement + AP economy): ✅ verified (movement + AP-spend assertions pass)
- P3 monetization path (founder intent + checkout success + postback idempotency): ✅ verified in code path
- P4 ops artifacts: ✅ updated (`web/ops/log.md`, `docs/ops-log.md`)

### Verification
- `cd web && npm run test:product` ✅ (14/14 pass)
- `cd web && npm run build` ✅

### Scope guard
- No landing-page copy edits and no non-product-critical code in this pass.

## Product-Mode Cron — 21:41 ET Mar 2

Directive enforced in strict order (P1 signup reliability/storage/observability → P2 playable demo movement + AP economy → P3 founder checkout/postback path → P4 ops artifacts).

### Pass result
- P1 signup reliability/storage/observability: ✅ no regression verified
- P2 playable demo loop (map movement + AP economy): ✅ no regression verified
- P3 monetization path (founder intent + checkout success + postback idempotency): ✅ no regression verified in code (env activation still pending)
- P4 ops artifacts: ✅ updated (`web/ops/log.md`, `docs/ops-log.md`)

### Verification
- `cd web && npm run test:product` ✅ (14/14 pass)
- `cd web && npm run build` ✅

### Scope guard
- No landing-page copy work and no non-product-critical edits in this pass.

## Product-Mode Ship — 21:36 ET Mar 2

Directive executed in strict order (P1 signup reliability/storage/observability → P2 playable demo loop movement + AP economy → P3 founder checkout/postback path → P4 ops artifacts).

### Shipped artifacts (product-critical lane)
- Re-verified live paths (no new non-critical code introduced):
  - `app/routes/api/waitlist.ts`
  - `app/routes/api/founder-intent.ts`
  - `app/lib/waitlist-db.ts`
  - `app/lib/waitlist-redis.ts`
  - `app/lib/observability.ts`
  - `app/components/DemoLoop.tsx`
  - `app/lib/demo-loop-economy.ts`
  - `app/components/Play.tsx`
  - `app/routes/api/postback.ts`
  - `app/routes/api/checkout-success.ts`
- Updated ops artifacts:
  - `web/ops/log.md` (this entry)
  - `docs/ops-log.md` (mirror entry)

### Verification
- `cd web && npm run test:product` ✅ (14/14 pass; includes movement + action economy + signup/monetization reliability checks)
- `cd web && npm run build` ✅ (Vite + Nitro vercel output generated)

### Scope guard
- No landing-page copy work and no cosmetic edits in this pass.

## Product-Mode Cron — 21:23 ET Mar 2

Directive reaffirmed: STOP landing-page copy iterations. Priority order enforced P1→P4.

### Pass result
- P1 signup reliability/storage/observability: ✅ no regression (idempotent persistence + fallback drain + receipts intact)
- P2 playable demo loop: ✅ no regression (map movement + AP economy assertions pass)
- P3 monetization path: ✅ no regression (founder intent + checkout success + postback idempotency path intact)
- P4 ops artifacts: ✅ updated (this entry + docs mirror)

### Verification
- `cd web && npm run test:product` ✅ (14/14 pass)

### Scope guard
- No landing-page copy edits in this pass.

## Product-Mode Ship — 23:20 ET Mar 2

Directive executed: product-critical only, in priority order (P1 reliability/storage/logging, P2 playable loop validation, P3 monetization path validation, P4 ops artifacts).

### Shipped artifacts
- `app/lib/waitlist-db.ts`
- `app/lib/observability.ts`
- `app/lib/fallback-drain.ts`
  - Fixed ESM runtime path imports (`./runtime-paths.ts`) so direct Node reliability verification runs without module-resolution failure.

### Verification
- `cd web && node scripts/product-mode-reliability.test.mjs` ✅ (3/3 pass)
- `cd web && npm run test:product` ✅ (14/14 pass)
  - Includes demo loop movement/action economy assertions and fallback reliability checks.
- `cd web && npm run build` ✅

## Product-Mode Ship — 21:05 ET Mar 2

Directive executed: product-critical lane only (signup/founder reliability + playable loop guardrails + monetization postback/checkout reliability + ops artifacts).

### Shipped artifacts
- `app/routes/api/checkout-success.ts`
  - Added idempotency receipt read/write (Redis + SQLite) and replay handling for `x-idempotency-key`.
  - Added `x-request-id` on responses for traceability.
- `app/routes/api/postback.ts`
  - Added deterministic postback idempotency keying (`x-idempotency-key` override, otherwise `postback:${eventType}:${eventId}`).
  - Added idempotency receipt replay/write logs and response wrapper with request id.
- `app/routes/api/waitlist.ts`
- `app/routes/api/founder-intent.ts`
  - Added explicit fallback-drain failure log events (`fallback_drain_after_*_failed`) for observability.
- `app/components/MoltPitLanding.jsx`
  - Submission idempotency now derives stable keys for founder intent (`intentId`) and waitlist (`email+source+day`) instead of always-random per submit.
- `scripts/demo-loop-economy.test.mjs` (new)
- `scripts/fallback-drain.test.mjs` (new)
- `package.json`
  - `test:product` now runs reliability + demo-economy + fallback-drain coverage.

### Verification
- `cd web && npm run test:product` ✅ (14/14 pass)
- `cd web && npx tsc --noEmit` ⚠️ fails due pre-existing repo-wide typing issues (Phaser/types/router/import-extension paths), not introduced by this ship.

## Product-Mode Cron — 20:58 ET Mar 2

Directive executed: no landing copy work. Product-critical lane only (signup reliability/storage/logs → playable demo loop/action economy → founder checkout/postback path → ops artifacts).

### Shipped artifacts
- `app/lib/fallback-drain.ts`
  - Drain is now async and awaits Redis/SQLite writes per row before removing fallback lines.
  - Prevents silent drop when Redis calls are still in-flight.
- `app/routes/api/waitlist.ts`
- `app/routes/api/founder-intent.ts`
- `app/routes/api/ops.ts`
  - Updated to `await drainFallbackQueues(...)` so API responses reflect actual replay results.
- `app/components/DemoLoop.tsx`
- `app/lib/demo-loop-economy.ts`
  - Playable demo now uses explicit AP costs + WAIT action and deterministic affordability checks in both watch and play modes.
- `app/components/Play.tsx`
  - Founder-intent request path now supports stable idempotency key wiring for retries.

### Verification
- `npm run test:product` ✅ (9/9 pass)
- `npm run build` ✅

### Notes
- No landing-page copy edits in this pass.

---

## Product-Mode Cron — 20:43 ET Mar 2

Directive executed: stop landing-page copy iteration and enforce product priority order.

### Status
- P1 signup reliability/storage/logging: ✅ shipped, re-verified
- P2 playable demo loop (map movement + action economy): ✅ shipped, re-verified
- P3 monetization path (founder checkout + postback): ✅ shipped in code; env-gated activation still pending
- P4 ops artifacts: ✅ updated in this pass

### Verification
- `cd web && npm run test:product` ✅ (9/9 pass)

### Artifacts
- Updated: `web/ops/log.md` (this entry)
- Updated: `docs/ops-log.md` (autopilot mirror)

## Product-Mode Cron — 20:32 ET Mar 2

Directive executed: stop landing-page copy iteration and enforce product priority order.

### Status
- P1 signup reliability/storage/logging: ✅ already shipped and re-verified
- P2 playable demo loop (map movement + action economy): ✅ already shipped and re-verified
- P3 monetization path (founder checkout + postback): ✅ code shipped; env-gated activation remains
- P4 ops artifacts: ✅ updated in this pass

### Verification
- `npm run test:product` ✅ (9/9 pass)

### Artifacts
- Updated: `web/ops/log.md` (this entry)


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
