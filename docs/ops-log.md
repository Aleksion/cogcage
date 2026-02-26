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

---

### 16:10 — Cron directive re-applied (4:10 PM ET)
**Directive**: STOP landing-page copy iterations. Priorities in order: P1 signup reliability → P2 demo loop → P3 monetization → P4 ops log.

**Full validation pass — all lanes confirmed stable:**

**P1 — Signup form reliability + storage + observable logs** ✅ VERIFIED
- Build: ✅ clean (`npm --prefix web run build`)
- ws2 tests: ✅ 4/4 pass (`node web/scripts/ws2-core.test.mjs`)
- SQLite (24h window): `waitlist_submitted=6`, `founder_intent_submitted=4`, `paid_conversion_confirmed=2`, `play_match_started=2`, `founder_intent_queued_fallback=1`
- Fallback backlog: ✅ clean (only `api-events.ndjson` active; no waitlist/founder/events queues pending)
- Idempotency, rate-limit (6/10min), honeypot, multi-content-type parse, in-band drain, ops-log on every path — all on `main` at `4ed9a93`.

**P2 — Playable demo loop (map movement + action economy)** ✅ VERIFIED
- `Play.tsx` (1392 lines): 8×8 grid, WASD+Arrow+action keys, AP economy (MOVE=1, ATTACK=2, GUARD=1, UTILITY=1), enemy AI with archetype-specific behavior (melee/ranged/balanced), bot config panel (name/directive/AGGR/DEF/RISK sliders).
- Real ws2 engine (`resolveTick`, `createActorState`) integrated; guard-before-offense phase ordering; deterministic RNG replay.
- Archetype-derived armor: DEF/AGGR sliders → player armor; opponent archetype → enemy armor. All 3 opponent presets have distinct personalities.
- Play Again loop, founder CTA panel inline, opponent loadout cards.

**P3 — Monetization path (founder pack checkout + postback)** ✅ CODE ⚠️ ENV PENDING (unchanged)
- `/api/founder-intent`, `/api/postback`, `/api/checkout-success`, `success.astro` — all on `main`.
- `PUBLIC_STRIPE_FOUNDER_URL` must be set in Vercel dashboard to activate live checkout. No code change needed.

**P4 — Ops log updated** ✅ — this entry.

**Git state**: `main` at `4ed9a93` — working tree clean (`.vercel/` untracked, non-critical).
No new product-critical gaps found. No landing-page copy iteration work performed.

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
