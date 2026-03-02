# CogCage Ops Log

---

## 2026-03-02 — Product-mode autopilot execution

### Shipped Artifacts

| Area | Artifact | Outcome |
|---|---|---|
| Signup reliability | `web/app/routes/api/waitlist.ts` | Added payload guards, source normalization, storage-tier observability, and degraded acceptance path (`sqlite-only` salvage + fallback queue) so leads are not lost when Redis is unavailable. |
| Runtime/storage observability | `web/app/lib/runtime-paths.ts` | Added runtime path resolution metadata (`env` / `workspace` / `tmp-fallback`) for actionable ops diagnostics. |
| Rate-limit correctness | `web/app/lib/waitlist-redis.ts` | Fixed `resetMs` to report time remaining, not absolute timestamp-style value. |
| Playable demo loop | `web/app/components/PlayableDemo.tsx`, `web/app/routes/demo.tsx` | `/demo` now ships a playable, turn-gated loop with map movement, action economy controls, and combat telemetry. |
| Monetization path | `web/app/routes/api/founder-checkout.ts` | Added founder checkout init API (idempotent intent logging + conversion event + checkout URL handoff + fallback queue behavior). |

### Verification Run
- `npm run build` (from `web/`) ✅ pass

### Notes
- Existing `/api/postback` remains payment reconciliation sink; founder checkout init now has its own hardened entrypoint for better observability and idempotency.

## 2026-02-27 / 2026-02-28 — Sprint Wrap

### What Shipped

| # | Description | Notes |
|---|---|---|
| PRs 16–22 | TanStack Query migration, rebrand to CogCage/MoltPit | Fully merged to main |
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
