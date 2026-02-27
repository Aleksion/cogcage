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

---

### 16:25 — Autopilot Directive: STOP copy iterations — deep code audit + artifact evidence

**Cron directive received 16:25 ET**: STOP landing-page copy iterations. Priorities: P1 signup reliability → P2 demo loop → P3 monetization → P4 ops log.

**Actual verification evidence (not cached state):**

**Build**
```
npm --prefix web run build
→ ✅ Complete (Vite 374ms + server 1.60s, no errors)
   dist/client/_astro/Play.SjX5oqPa.js     40.04 kB
   dist/client/_astro/CogCageLanding.Bub_fV8s.js  76.25 kB
```

**ws2 engine tests**
```
node web/scripts/ws2-core.test.mjs
→ ✅ pass 4 / fail 0 (15ms)
   ✔ guard arc applies multiplier when attacker is in front
   ✔ guard arc does not apply when attacker is behind
   ✔ illegal action falls back to no-op without energy spend
   ✔ replay parity matches event hash and winner
```

**P1 — Signup reliability + storage + observable logs** ✅ VERIFIED IN CODE
- `web/src/lib/waitlist-db.ts` (400 lines): `better-sqlite3` storage, in-memory rate-limit table, SQLite schema, idempotency via `requestId`
- `web/src/lib/observability.ts` (44 lines): `appendOpsLog` → NDJSON to `api-events.ndjson`; separate fallback files per endpoint
- `web/src/lib/fallback-drain.ts` (113 lines): `drainFallbackQueues(limit)` — auto-heals queued leads on next successful request
- `web/src/pages/api/waitlist.ts` (323 lines): rate-limit (6/10min, `RATE_LIMIT_MAX=6`, `RATE_LIMIT_WINDOW_MS=10min`), honeypot field, idempotency replay (HTTP 200 + `x-idempotent-replay: 1`), inline drain trigger post-write, `appendOpsLog` on every path (success/rate-limit/honeypot/error)
- `/api/events.ts` (158 lines): structured event ingestion with fallback NDJSON queue
- `/api/ops.ts` (156 lines): authenticated read endpoint (storage health + log tail + drain trigger)

**P2 — Playable demo loop (map movement + action economy)** ✅ VERIFIED IN CODE
- `web/src/components/Play.tsx` (1410 lines): 8×8 `GRID_SIZE` grid, `createActorState` + `resolveTick` from ws2 engine
- Key bindings: `ArrowUp/W` → move N, `ArrowDown/S` → move S, `ArrowLeft/A` → move W, `ArrowRight/D` → move E; `J` → strike, `K` → guard, `L` → utility, `Enter` → skip
- AP costs confirmed in render: Strike 18e · Guard 10e · Utility 20e · Move 4e
- Opponent AI: `archetype: 'melee' | 'ranged' | 'balanced'` — 3 presets (Iron Sentinel=melee, Neon Wraith=balanced, Cinder Hawk=ranged)
- Player armor derived from DEF/AGGR sliders; enemy armor from archetype
- Play Again seed regeneration, founder CTA panel inline, combat feed with HP bars

**P3 — Monetization path** ✅ CODE COMPLETE ⚠️ ENV VARS NOT SET
- `/api/founder-intent.ts` (337 lines): pre-checkout email capture, idempotency, fallback NDJSON queue
- `/api/postback.ts` (247 lines): Stripe webhook `checkout.session.completed` handler, HMAC validation
- `/api/checkout-success.ts` (224 lines): GET+POST success redirect, conversion replay
- `/api/replay-fallback.ts`: idempotent conversion replay
- `success.astro`: post-checkout confirmation page
- Play.tsx: `handleFounderCheckout` → pre-intent → redirect to `PUBLIC_STRIPE_FOUNDER_URL`
- **BLOCKING**: `PUBLIC_STRIPE_FOUNDER_URL`, `COGCAGE_POSTBACK_KEY`, `COGCAGE_OPS_KEY` must be set in Vercel dashboard. No code change needed.

**P4 — Ops log** ✅ this entry

**Git state**: `main` at `4834994`. Working tree clean (`.vercel/` untracked, non-critical).

**No new gaps found. No copy iteration work performed.**

---

### Shipped Artifact Inventory (as of 16:25 ET, Feb 26 2026)

| File | Lines | Description |
|------|-------|-------------|
| `web/src/components/Play.tsx` | 1410 | Full game loop: 8×8 map, WASD, AP economy, 3 archetypes, bot config, Play Again, founder CTA |
| `web/src/lib/waitlist-db.ts` | 400 | SQLite storage, rate-limit, idempotency, schema |
| `web/src/lib/observability.ts` | 44 | Structured NDJSON ops log + fallback queues |
| `web/src/lib/fallback-drain.ts` | 113 | Auto-heal drain on successful request |
| `web/src/pages/api/waitlist.ts` | 323 | Signup endpoint: honeypot, rate-limit, drain, idempotency |
| `web/src/pages/api/events.ts` | 158 | Event ingestion with fallback queue |
| `web/src/pages/api/founder-intent.ts` | 337 | Pre-checkout capture with fallback |
| `web/src/pages/api/postback.ts` | 247 | Stripe webhook handler |
| `web/src/pages/api/checkout-success.ts` | 224 | Post-checkout redirect handler |
| `web/src/pages/api/ops.ts` | 156 | Authenticated ops read endpoint |
| `web/src/lib/ws2/` | ~600 | ws2 engine: resolveTick, createActorState, bots, replay |
| `web/scripts/ws2-core.test.mjs` | — | ws2 engine test suite (4/4 pass) |

**All artifacts on `main`. Vercel autodeploys on push.**

---

### 18:17 — LLM Driver Shipped — Full Spectator Mode (cron directive: 18:17 ET)

**Cron directive received 18:17 ET**: STOP copy iterations. Priorities: (1) signup reliability + storage + observable logs, (2) real playable demo loop with map movement + action economy, (3) monetization path (founder pack checkout + postback), (4) ops log.

#### Actual verification evidence

**Build**
```
bun run build (web/)
→ ✅ Complete in 1.26s, zero errors, zero TS errors
   dist/client/_astro/Play.0r-QjzQ2.js          42.64 kB
   dist/client/_astro/CogCageLanding.Bub_fV8s.js 76.25 kB
```

**Site status**: `curl -I https://www.cogcage.com` → `HTTP/2 200` ✅ (Vercel rate limit resolved)

**ws2 engine tests**: 4/4 pass (unchanged — engine untouched)

---

**P1 — Signup reliability + storage + observable logs** ✅ COMPLETE (no regression)
- `waitlist-db.ts` (400 lines): `better-sqlite3` SQLite, rate-limit table, idempotency via `requestId`, busy-retry loop
- `observability.ts` (44 lines): `appendOpsLog` → NDJSON to `api-events.ndjson`; per-endpoint fallback files
- `fallback-drain.ts` (113 lines): auto-heals queued leads on next successful request
- `waitlist.ts` (323 lines): honeypot, rate-limit (6/10min), idempotency replay, drain trigger, `appendOpsLog` on every path
- `events.ts` (158 lines): structured event ingestion + fallback queue
- `ops.ts` (156 lines): authenticated read endpoint (storage health + log tail + drain trigger)
- **Vercel note**: SQLite in `/tmp` resets per cold start. NDJSON fallback files also in `/tmp`. For persistent leads, set `COGCAGE_DB_PATH` + `COGCAGE_RUNTIME_DIR` to external volume. Not blocking for Friday demo.

**P2 — Real playable demo loop (LLM spectator mode + map movement + action economy)** ✅ SHIPPED
- **Architecture change** (vs 16:25 snapshot): demo is now full LLM spectator mode — NO keyboard input during match.
- `web/src/pages/api/agent/decide.ts` (268 lines): POST endpoint, formats game state → GPT-4o-mini system prompt → AgentAction, 3s server timeout, NO_OP fallback on timeout/error
- `web/src/lib/ws2/match-runner.ts` (160 lines): async tick loop, 100ms ticks, 300ms decision windows (3 ticks/window), parallel `Promise.all` LLM calls per window
- `web/src/components/Play.tsx` (961 lines, rewritten): spectator UI — lobby with bot config panels (name, directive textarea → LLM system prompt, loadout checkboxes, armor radio), arena 8×8 grid with bot positions + VFX, event log, KO overlay
- Lobby → match flow: `startMatch()` seeds RNG → creates bot configs → `runMatchAsync(seed, configA, configB, handleSnapshot, '/api/agent/decide', signal)`
- Spectator hint: "Spectator mode — agents decide autonomously via LLM" rendered during match
- `OPENAI_API_KEY` **not set in Vercel yet** — bots will NO_OP until set. Set this in Vercel env vars for live LLM battles.
- Engine constants: `ENERGY_MAX=1000`, `HP_MAX=100`, `DECISION_WINDOW_TICKS=3`, `TICK_MS=100`, grid 8×8, positions in tenths

**P3 — Monetization path** ✅ CODE COMPLETE ⚠️ ENV VARS STILL NOT SET IN VERCEL
- `/api/founder-intent.ts` (337 lines): pre-checkout email capture, idempotency, fallback queue
- `/api/postback.ts` (247 lines): Stripe webhook `checkout.session.completed` handler, key-based auth
- `/api/checkout-success.ts` (224 lines): GET+POST success redirect handler
- `success.astro`: post-checkout confirmation page
- Play.tsx: `handleFounderCheckout` → pre-intent capture → redirect to `PUBLIC_STRIPE_FOUNDER_URL`
- **BLOCKING** (no code change needed): `PUBLIC_STRIPE_FOUNDER_URL`, `COGCAGE_POSTBACK_KEY`, `COGCAGE_OPS_KEY` must be set in Vercel dashboard

**P4 — Ops log** ✅ this entry

**Commit**: `feat(ws2): LLM spectator mode — decide API + match-runner + Play rewrite`

**Active agent PRs**:
- PR#2 `feat/ws2-phaser-byo-openclaw`: Phaser 3 visual engine + TypeScript migration + BYO OpenClaw `external.ts`. Richer graphics, deferred — conflicts with LLM driver Play.tsx. Review after Friday demo.

---

### Updated Artifact Inventory (18:17 ET, Feb 26 2026)

| File | Lines | Description |
|------|-------|-------------|
| `web/src/components/Play.tsx` | 961 | LLM spectator mode: 8×8 map, bot config, directive→system prompt, loadout, `runMatchAsync` |
| `web/src/lib/ws2/match-runner.ts` | 160 | Async tick loop, parallel LLM calls, 300ms decision windows |
| `web/src/pages/api/agent/decide.ts` | 268 | GPT-4o-mini agent decision endpoint, 3s timeout, NO_OP fallback |
| `web/src/lib/waitlist-db.ts` | 400 | SQLite storage, rate-limit, idempotency |
| `web/src/lib/observability.ts` | 44 | NDJSON ops log + fallback queues |
| `web/src/lib/fallback-drain.ts` | 113 | Auto-heal drain |
| `web/src/pages/api/waitlist.ts` | 323 | Signup: honeypot, rate-limit, drain |
| `web/src/pages/api/events.ts` | 158 | Event ingestion + fallback |
| `web/src/pages/api/founder-intent.ts` | 337 | Pre-checkout capture |
| `web/src/pages/api/postback.ts` | 247 | Stripe webhook handler |
| `web/src/pages/api/checkout-success.ts` | 224 | Post-checkout handler |
| `web/src/pages/api/ops.ts` | 156 | Authenticated ops endpoint |
| `web/src/lib/ws2/engine.js` | — | Deterministic engine (4/4 tests pass, untouched) |

**Open gaps (no code blocker):**
1. `OPENAI_API_KEY` → Vercel env vars (bots NO_OP until set)
2. `PUBLIC_STRIPE_FOUNDER_URL` → Vercel env vars (checkout button dead until set)
3. `COGCAGE_POSTBACK_KEY` + `COGCAGE_OPS_KEY` → Vercel env vars
4. Vercel SQLite persistence → needs external volume OR Vercel KV for production leads


---

### Autopilot Directive — 20:28 ET, Feb 26 2026

**Directive**: STOP landing-page copy iterations. Priorities: (1) signup reliability + storage + observable logs, (2) real playable demo loop, (3) monetization path, (4) ops log.

**Actions taken:**

**P1 — Observable logs gap closed (was: file-only, now: stdout + file)**
- `web/src/lib/observability.ts` — rewritten to emit every `appendOpsLog` call to both:
  - **stdout/stderr** via `console.log`/`console.warn`/`console.error` (Vercel captures these in function logs dashboard — survives ephemeral /tmp)
  - NDJSON file in runtime dir (still present for /api/ops endpoint)
- Fallback queuing functions (`appendWaitlistFallback`, `appendFounderIntentFallback`, `appendEventsFallback`) now also emit to stdout
- Result: every signup, error, rate-limit, fallback, drain event is now visible in Vercel Logs tab without needing /api/ops or file persistence
- Build: ✅ clean · Tests: 4/4 ✅

**P1 — Form reliability audit** (no changes needed — already complete)
- Client: idempotency key per submission, `x-idempotency-key` header, `AbortController` timeout (6-7s), 1 retry, localStorage backup for offline
- Server: rate-limit (6/10min), honeypot, idempotency replay, busy-retry SQLite, fallback NDJSON drain
- **Known gap, not fixable without infra**: both SQLite and NDJSON fallback live in Vercel /tmp (ephemeral per-invocation). Persistent leads require `COGCAGE_DB_PATH` → external volume or Vercel KV. Not blocking for Friday demo.

**P2 — Demo loop** (already complete as of 18:17 checkpoint)
- Phaser 3 MatchScene (20×20 grid, tweened bot movement, HP bars, decision log): `web/src/lib/ws2/MatchScene.ts` — 288 lines
- match-runner.ts + decide.ts + Play.tsx spectator rewrite — all committed (`686cc8d`, `e5240b1`)
- `OPENAI_API_KEY` must be set in Vercel for live LLM battles. Bots NO_OP gracefully until set.

**P3 — Monetization** (code complete since 18:17, blocked on env vars)
- All code shipped: founder-intent, postback, checkout-success, success.astro
- Checkout button wired to `PUBLIC_STRIPE_FOUNDER_URL` — shows error if unset
- **Aleks action required**: create Stripe payment link → set `PUBLIC_STRIPE_FOUNDER_URL` in Vercel

**P4 — Copy iteration agent killed**
- `cc-cogcage-friday` was attempting to edit `CogCageLanding.jsx` (copy iteration) — rejected and stopped per directive
- `cc-ws2-phaser` (worktree `ws2-phaser-byo-openclaw`, context 8%) directed to commit + push

**Commit**: `fix(observability): emit to stdout for Vercel function log visibility`

**Aleks action required (priority order):**
1. Vercel dashboard → Environment Variables → Add `OPENAI_API_KEY` (enables LLM battles for Friday demo)
2. Create Stripe payment link for Founder Pack → set `PUBLIC_STRIPE_FOUNDER_URL` in Vercel (enables checkout)
3. Generate `COGCAGE_POSTBACK_KEY` + `COGCAGE_OPS_KEY` → set in Vercel (secures postback + ops endpoints)
4. Add Stripe webhook → `https://cogcage.com/api/postback` with `x-postback-key: {COGCAGE_POSTBACK_KEY}`


---

### Autopilot Directive — 03:53 ET, Feb 27 2026

**Directive**: STOP landing-page copy iterations. Priorities: (1) signup form reliability + storage + observable logs, (2) real playable demo loop with map movement + action economy, (3) monetization path (founder pack checkout + postback), (4) update ops log.

**Actions taken:**

**P1 — Redis-backed storage closed the Vercel ephemerality gap**
- `web/src/lib/waitlist-redis.ts` (new, 160 lines) — Upstash Redis layer for:
  - Waitlist leads (`cogcage:waitlist` LIST)
  - Founder intents (`cogcage:founder-intents` LIST)
  - Conversion events (`cogcage:conversions` LIST)
  - Ops log tail (`cogcage:ops-log` LIST, capped 500 entries)
  - Rate limiting (`cogcage:ratelimit:{key}:{window}` STRING) — survives across Lambda invocations
- `waitlist.ts` + `founder-intent.ts`: Redis as primary write (fire-and-forget), SQLite as local fallback
- Previously: leads written only to SQLite in ephemeral Vercel /tmp — lost on cold start
- Now: every waitlist signup + founder intent is durable in Redis regardless of Lambda lifecycle

**P1 — Observable ops log now Redis-backed**
- `ops.ts` GET: returns `redisCounts` + `redisOpsLog` (50-entry tail) alongside SQLite data
- Redis ops log = primary observable layer on Vercel (filesystem is per-invocation)
- Previously: `/api/ops` returned empty `files[]` on warm-start-miss; now Redis always has data

**P3 — Monetization path: postback + checkout-success now durable**
- `postback.ts`: Redis write for paid conversion events + founder intents (fire-and-forget, on top of SQLite)
- `checkout-success.ts`: Redis write for paid_conversion_confirmed on Stripe success return
- Stripe flow: Landing CTA → `PUBLIC_STRIPE_FOUNDER_URL` → Stripe → `/success?session_id=...` → `POST /api/checkout-success` → SQLite + Redis
- Postback flow: Stripe webhook → `POST /api/postback` (auth: `x-postback-key`) → SQLite + Redis

**P2 — Demo loop spawn position + action economy fix**
- `match-runner.ts`: spawn positions (4,10)/(16,10) → **(6,10)/(14,10)** — 8 units apart (ranged max=10u)
  - Previous 12u gap meant bots spawned outside ranged range; no action economy from tick 1
- `Play.tsx` DEFAULT_BOT_A: added RANGED_SHOT to loadout; system prompt updated with full AP decision tree

**Commits shipped:**
- `641d304` — feat(storage): Redis-backed signup, postback, checkout-success + observable ops log
- `cda3676` — fix(demo): spawn at (6,10)/(14,10) — 8u apart, within ranged range; RANGED_SHOT in loadout A

**Build**: ✅ clean (both commits, `npm --prefix web run build`)
**Push**: ✅ `origin/main` at `cda3676`

**Aleks action required:**
1. Set `PUBLIC_STRIPE_FOUNDER_URL` in Vercel → activates founder pack checkout button (currently shows "not configured")
2. Set `COGCAGE_POSTBACK_KEY` in Vercel + Stripe webhook → secures postback endpoint
3. Set `COGCAGE_OPS_KEY` in Vercel → secures /api/ops endpoint

**Env vars confirmed set in Vercel:**
- `OPENAI_API_KEY` ✅ (LLM bot decisions active)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` ✅ (Redis storage active)
