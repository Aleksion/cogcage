# CogCage Autopilot Ops Log

Maintained by Daedalus. Append-only. Timestamps = ET.

---

## 2026-02-26 — Autopilot Product-Critical Sprint

### 15:46 — Checkpoint (4-lane audit, pre-15:55 session)
- **P1 Signup** ✅ STABLE
  - `waitlist.ts`: idempotency, rate-limit, honeypot, fallback-drain, observability — all on main
  - `waitlist-db.ts`: SQLite storage via `better-sqlite3`, fallback NDJSON queues
  - `observability.ts`: structured NDJSON ops log to `api-events.ndjson`
  - `fallback-drain.ts`: auto-heals queued leads on next successful request
  - `/api/ops`: authenticated read endpoint, storage health, reliability snapshot, log tails
  - `/api/ops` POST: manual drain trigger (up to 500 rows)
- **P2 Demo Loop** ✅ STABLE (pre-arch commit)
  - `Play.tsx` (1392 lines): 8×8 grid map, WASD movement, AP economy
  - `ws2/engine.js`: `resolveTick`, `createActorState`, `createInitialState`
  - `ws2/bots.js`: `createBot(archetype, rng)` — melee/ranged/balanced personalities
  - Bot config panel: name/directive/AGGR/DEF/RISK sliders, combat bonuses
  - 3 opponent presets: Iron Sentinel, Neon Wraith, Cinder Hawk
  - Play Again, founder CTA, feed log with HP bars
- **P3 Monetization** ✅ CODE ON MAIN ⚠️ ENV PENDING
  - `/api/founder-intent`: pre-checkout email capture, idempotency, fallback
  - `/api/postback`: Stripe webhook handler (`checkout.session.completed`)
  - `/api/checkout-success`: GET+POST Stripe success redirect handler
  - `/api/replay-fallback`: idempotent conversion replay endpoint
  - `PUBLIC_STRIPE_FOUNDER_URL` env var → **must be set in Vercel dashboard** to activate checkout
  - `COGCAGE_POSTBACK_KEY` → Stripe webhook secret (set in Vercel + Stripe dashboard)
  - `COGCAGE_OPS_KEY` → ops endpoint auth key
- **P4 Ops Log** → this file

---

### 15:55 — Archetype-based armor + enemy personality committed
- **Commit**: `feat(ws2/play): archetype armor derivation + enemy personality mapping`
- **Changes** (`Play.tsx` +25/-7):
  - Added `archetype: 'melee' | 'ranged' | 'balanced'` field to `BotPreset` type
  - All 3 opponent presets tagged: Iron Sentinel→melee, Neon Wraith→balanced, Cinder Hawk→ranged
  - Player armor derived from slider config: DEF≥65→heavy, AGGR≥65→light, else medium
  - Enemy armor derived from archetype: melee→heavy, ranged→light, balanced→medium
  - `createBot(opponent.archetype, rng)` replaces hardcoded `createBot('balanced', rng)`
  - Feed now shows both bots' full loadout on match start
  - Cinder Hawk tagline updated: "Fast strikes, kites at range, never stops."
- **Effect**: each opponent now plays meaningfully differently; player loadout choices matter for outcome

---

### Env Vars Needed (Vercel — Blocking P3 Activation)

| Var | Purpose | Status |
|-----|---------|--------|
| `PUBLIC_STRIPE_FOUNDER_URL` | Stripe payment link for founder pack | ❌ NOT SET |
| `COGCAGE_POSTBACK_KEY` | Stripe webhook shared secret | ❌ NOT SET |
| `COGCAGE_OPS_KEY` | `/api/ops` auth key | ❌ NOT SET |

---

### Friday Demo Readiness (as of 15:55)

| Feature | Status | Notes |
|---------|--------|-------|
| Signup / waitlist | ✅ | idempotent, SQLite + fallback, observable |
| Map movement (WASD) | ✅ | 8×8 grid, obstacle cells |
| AP economy | ✅ | per-action costs, end-turn, ticks |
| Combat: melee / ranged | ✅ | HP bars, damage calc, armor |
| Opponent AI (3 styles) | ✅ | melee / ranged / balanced archetypes |
| Bot config panel | ✅ | name, directive, sliders, presets |
| Play Again loop | ✅ | seed regeneration |
| Founder CTA in play | ✅ | pre-intent capture + checkout redirect |
| Stripe checkout live | ❌ | env var not set in Vercel |
| Webhook postback | ❌ | env var not set in Vercel |
| WS7 Visual assets | ⬜ | bot sprites, VFX — in checklist |
