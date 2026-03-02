# CogCage Ops Log

---

## 2026-03-02 — WS18 Product Core (Shipped)

### What Shipped

| # | Description | Notes |
|---|---|---|
| P1 | Sign-in reliability | `sign-in.tsx` now uses valid `signIn('resend')` magic-link flow, improved loading/error/success states, and explicit GitHub redirect handling |
| P1 | Auth observability | New `/api/auth-event` route writes persistent Convex `authEvents` records (timestamp, email hash, method, success/fail, error code) |
| P1 | Shell persistence | `/shell` merges local cached shells with Convex on auth (server wins), then persists canonical shells back to local cache |
| P2 | Playable demo loop | `/play` pre-auth now runs a real ~30s autoplay loop with map movement, action economy (ATTACK/DEFEND/CHARGE/STUN), health/energy bars, ticker, winner CTA |
| P3 | Founder fallback | Demo founder CTA now has explicit placeholder behavior when `PUBLIC_STRIPE_FOUNDER_URL` is unset |
| P3 | Purchases recording | `/api/checkout-success` + `/api/postback` now record purchases into Convex `purchases` table (dedupe by Stripe session ID) |
| P4 | Ops visibility | `/api/ops` now returns Convex auth stats/recent events + purchase events; ops page renders both |

### Why / Decisions
- Keep Convex as source of truth for auth and purchase observability; Redis/SQLite remain fallback analytics paths.
- Keep shell merge deterministic: local entries are only created in Convex when missing by `{name,cards}` fingerprint; existing server entries always win.
- Keep monetization resilient: conversion tracking still works without Stripe postback success, and purchase recording failures do not block user-facing success responses.

### Risks / Follow-ups
- `/api/auth-event` is currently open to unauthenticated writes by design for early auth flows; if abuse appears, add lightweight request signing/rate-limits.
- Purchase rows currently store amount as integer from webhook/query payload as provided; if Stripe cents normalization changes, add explicit currency scaling rules.

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
