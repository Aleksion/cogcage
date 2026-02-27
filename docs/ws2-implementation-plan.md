# WS2 Game Core — Implementation Plan

**Owner:** Daedalus  
**Friday deadline:** Both crawlers driven by LLMs via BYO OpenClaw, proper game engine, TypeScript throughout  
**Thread:** https://discord.com/channels/1476009707037655280/1476620956737863772  
**Spec locked in:** `docs/ws1-mechanics-spec-v1.md`

---

## Architectural Directives (from Aleks — non-negotiable)

1. **TypeScript only.** No `.js` files. Every file in `web/src/lib/ws2/` must be `.ts` with real types.
2. **Proper game engine.** The molt cannot be a React component with `setInterval`. Use Phaser 3.
3. **BYO OpenClaw is the product.** Users bring their own OpenClaw instance (or any compliant crawler endpoint). Built-in GPT-4o-mini is the fallback for users without their own runtime, not the main path.
4. **Users choose their crawler.** The tank lets you configure a webhook URL (your OpenClaw endpoint) OR pick the built-in hosted runner.

---

## TL;DR — What Friday Looks Like

Player opens `/play`. Tank lets them configure **two crawlers**: name, directive, shell (which claws available), armor, and — crucially — **their OpenClaw webhook URL** or the hosted runner. They hit **Start Battle** and **watch** Phaser render two LLM crawlers fighting on the grid. Combat log explains every decision. KO screen at the end.

No keyboard input during molt. No heuristic crawlers as the primary path. Two language models reasoning about tactics in real time.

---

## Tech Stack Decision: Phaser 3

**Chosen framework: [Phaser 3](https://phaser.io/)** — `npm install phaser`

**Why:**
- Full-fledged 2D game engine: scene management, tweens, particles, input, asset loader, WebGL/Canvas renderer
- Runs at 60fps with its own `requestAnimationFrame` game loop — sim ticks at 10Hz, visual interpolation at 60fps
- TypeScript types: `npm install --save-dev @types/phaser` (or use Phaser 3.8+ which includes types)
- Battle-tested for exactly this kind of arena game
- Handles the 300ms decision window cleanly: Phaser `update()` fires at 60fps, sim only advances state on decision window ticks

**Integration pattern (Astro + Phaser):**
- Tank/result: React components (fast to build, works with existing code)
- Molt: Phaser canvas, launched from React via `useEffect` when `phase === 'molt'`
- Phaser creates its own `<canvas>` inside a container `div`
- Molt end → Phaser scene emits event → React transitions to result screen

**Bundle note:** Phaser adds ~3MB to the bundle. Acceptable for a game. Use dynamic import (`const Phaser = await import('phaser')`) to keep it out of the tank/landing page.

---

## Current State Audit

### ✅ DONE — Do Not Touch (but needs TS migration)

| Component | File | Status |
|---|---|---|
| Deterministic sim engine | `ws2/engine.js` → **must become `engine.ts`** | Logic correct. Tests pass. Port to TS, don't change logic. |
| Crawler archetypes (fallback) | `ws2/crawlers.js` → **`crawlers.ts`** | Scripted heuristics for non-LLM fallback. Port to TS. |
| Async molt runner | `ws2/molt-runner.ts` | Already TypeScript ✅. Wire to Phaser game loop. |
| Replay system | `ws2/replay.js` → **`replay.ts`** | Port to TS. |
| Geometry helpers | `ws2/geometry.js` → **`geometry.ts`** | Port to TS. |
| Constants | `ws2/constants.js` → **`constants.ts`** | Port to TS with `as const`. |
| RNG | `ws2/rng.js` → **`rng.ts`** | Port to TS. |
| Barrel export | `ws2/index.js` → **`index.ts`** | Port to TS. |
| LLM decision endpoint | `pages/api/agent/decide.ts` | TypeScript ✅. Needs BYO relay support (Task B2). |
| Play.tsx tank | `components/Play.tsx` | Needs tank redesign for BYO OpenClaw config (Task B3). |
| Play.tsx result/KO | `components/Play.tsx` | Keep. Wire to Phaser molt end event (Task B4). |

### ❌ NOT BUILT — Friday Blockers

| # | Task | What | Scope |
|---|---|---|---|
| **A** | JS → TS migration | Port 6 `.js` files to `.ts` with real types | ~2–3 hours |
| **B1** | Phaser 3 molt scene | `MoltScene.ts` — renders the arena, crawlers, VFX, HP bars at 60fps | ~150–200 lines |
| **B2** | BYO OpenClaw relay | `/api/agent/external` endpoint that proxies to user's OpenClaw webhook | ~50 lines |
| **B3** | Tank: BYO config | Add webhook URL field, model selector, shell checkboxes to tank | ~80 lines in Play.tsx |
| **B4** | Wire molt-runner ↔ Phaser | `molt-runner.ts` drives sim, Phaser `MoltScene` visualizes it | ~100 lines |
| **B5** | Decision explainability | LLM returns `reasoning` field; Phaser combat log displays it | ~30 lines total |

---

## BYO OpenClaw Protocol (the product)

### What "BYO OpenClaw" means

The user configures their **own OpenClaw instance** as the crawler for their fighter. Their OpenClaw receives game state on each decision window and returns a claw.

### Adapter Contract v1

**Inbound (game → crawler):**
```json
POST <user_webhook_url>
{
  "schema": "cogcage.turn.v1",
  "matchId": "uuid",
  "tick": 42,
  "actorId": "alpha",
  "opponentId": "beta",
  "gameState": {
    "tick": 42,
    "actors": { ... },
    "objectiveScore": { ... }
  },
  "shell": ["MOVE", "MELEE_STRIKE", "RANGED_SHOT", "GUARD"],
  "meta": {
    "arenaSize": 20,
    "tickRateHz": 10,
    "decisionWindowMs": 300
  }
}
```

**Outbound (crawler → game):**
```json
{
  "schema": "cogcage.action.v1",
  "type": "RANGED_SHOT",
  "dir": null,
  "targetId": "beta",
  "reasoning": "enemy is in optimal range band (6.2u), I have full energy"
}
```

**Rules:**
- Game waits max 4s for response. Timeout → `NO_OP`.
- `type` must be in the actor's `shell`. Invalid action → `ILLEGAL_ACTION` + `NO_OP`.
- `reasoning` field optional but encouraged (shown in combat log if present).
- Requests are unauthenticated in Phase A. Phase B adds HMAC signing.

### Server-side relay (CORS + security)

Because user-configured external URLs can't be called directly from the browser (CORS), the game routes all external crawler calls through:

```
browser → POST /api/agent/external → user's OpenClaw webhook
```

`/api/agent/external` body:
```json
{
  "webhookUrl": "https://user.openclaw.ai/molt/decide",
  "payload": { ...cogcage.turn.v1 payload... }
}
```

This endpoint:
1. Validates `webhookUrl` is a valid HTTPS URL
2. Forwards the payload to the webhook
3. Returns the response or `{ action: { type: "NO_OP" } }` on timeout/error

### Hosted runner (built-in fallback)

For users without their own OpenClaw, the hosted runner uses GPT-4o-mini via `/api/agent/decide`. Same interface, just different URL. Users can still configure the directive and shell.

---

## Task Breakdown (Friday execution order)

### Task A: TypeScript Migration
**Priority: First** — nothing else can be built on top of `.js` files.

Files to migrate (all in `web/src/lib/ws2/`):

| From | To | Notes |
|---|---|---|
| `constants.js` | `constants.ts` | Add `as const` to all enums/arrays, export types |
| `geometry.js` | `geometry.ts` | Type `Position`, `Direction`, all function signatures |
| `rng.js` | `rng.ts` | Type the `Rng` class |
| `engine.js` | `engine.ts` | Type `GameState`, `ActorState`, `AgentAction`, `ResolutionResult` |
| `bots.js` | `bots.ts` | Type `Bot`, `Archetype`, `BotDecision` |
| `replay.js` | `replay.ts` | Type `ReplayHash`, `EventStream` |
| `index.js` | `index.ts` | Re-export everything |

**Critical constraint:** Do not change logic during the port. Logic is tested. Change types, not behavior.  
**Verification:** `node --test web/scripts/ws2-core.test.mjs` must still pass 4/4 after migration.

Note: `molt-runner.ts` imports from `./engine.js` with `.js` extension — update all imports after rename.

---

### Task B1: Phaser 3 Molt Scene

**File:** `web/src/lib/ws2/MoltScene.ts`

```typescript
// Phaser Scene that renders the molt
// Driven externally by molt-runner.ts via applySnapshot(snap: MoltSnapshot)
export class MoltScene extends Phaser.Scene {
  // Grid: 20×20, each cell = 32px → 640×640 canvas
  // Crawler sprites: colored rectangles or loaded SVG
  // HP bars: Graphics objects, updated each snapshot
  // VFX: Phaser particles for hits, Phaser tweens for movement
  // Combat log: BitmapText or Text objects, scrolling
}
```

**Key design:** The scene does NOT drive the game loop. It only renders what `molt-runner.ts` feeds it. This preserves the deterministic simulation contract.

**Scene interface:**
```typescript
interface SceneEvents {
  'snapshot': (snap: MoltSnapshot) => void  // from molt-runner → scene
  'molt-ended': (winnerId: string | null) => void  // from scene → React
}
```

**Integration:**
```typescript
// In Play.tsx, when phase transitions to 'molt':
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 640,
  height: 640,
  scene: [MoltScene],
});
```

---

### Task B2: BYO OpenClaw Relay Endpoint

**File:** `web/src/pages/api/agent/external.ts`

Simple proxy with timeout and validation. ~50 lines.

```typescript
export const POST: APIRoute = async ({ request }) => {
  const { webhookUrl, payload } = await request.json();
  // validate webhookUrl is HTTPS
  // forward payload with 4s timeout
  // return response or { action: { type: 'NO_OP' } }
}
```

---

### Task B3: Tank — BYO OpenClaw Config

**File:** `web/src/components/Play.tsx` (tank section)

Add per-crawler configuration:
1. **Crawler mode**: radio — `hosted` (GPT-4o-mini) | `byo-openclaw` (custom webhook)
2. **Webhook URL** (shown when `byo-openclaw`): text input for OpenClaw endpoint
3. **Directive**: large textarea (wired to `directive` in API call — currently unhooked)
4. **Shell**: checkboxes — MOVE locked, 5 others optional. More = harder reasoning.
5. **Armor**: radio — light / medium / heavy

The `directive` field currently exists but is never sent. Wire it to `directive` in the decide call.

---

### Task B4: Wire molt-runner ↔ Phaser

**File:** `web/src/components/Play.tsx` (molt section)

```typescript
// Replace the current manual action loop with:
const runnerRef = useRef<AbortController | null>(null);

async function startMolt() {
  setPhase('molt');
  const abort = new AbortController();
  runnerRef.current = abort;
  
  const apiBase = crawlerAConfig.mode === 'byo' 
    ? '/api/agent/external' 
    : '/api/agent/decide';

  const final = await runMoltAsync(seed, crawlerA, crawlerB, (snap) => {
    // Push snapshot to Phaser scene via event emitter
    phaserGame.events.emit('snapshot', snap);
    // Update React state for HP bars in sidebar (optional)
    setPlayerHp(snap.state.actors[crawlerA.id].hp);
    setEnemyHp(snap.state.actors[crawlerB.id].hp);
  }, apiBase, abort.signal);

  // Molt ended
  setWinner(final.winnerId);
  setPhase('result');
}
```

---

### Task B5: Decision Explainability

**In `/api/agent/decide.ts`:** Add `reasoning` to the JSON response format prompt:
```
{"type":"RANGED_SHOT","reasoning":"enemy at 6.2u, optimal band, full energy"}
```
Return `reasoning` in the API response alongside `action`.

**In `/api/agent/external.ts`:** Pass through any `reasoning` field from the external crawler.

**In `molt-runner.ts`:** Capture `action.reasoning` per decision, include in `MoltSnapshot.events` or a separate `decisions` log.

**In `MoltScene.ts`:** Render last N decisions in a scrolling combat log panel.

---

## Definition of Done (Friday)

**TypeScript:**
- [ ] All 7 `.js` files in `ws2/` migrated to `.ts` with real types
- [ ] No TypeScript errors (`tsc --noEmit` clean)
- [ ] Engine tests still pass 4/4 after migration

**Game engine:**
- [ ] Phaser 3 installed and working in the Astro project
- [ ] `MoltScene.ts` renders 20×20 grid, two crawlers, HP bars, VFX on hits
- [ ] Molt-runner drives the scene via snapshot events (no direct `resolveTick` calls in React)
- [ ] Crawler movement animated with Phaser tweens (smooth, not teleport)

**BYO OpenClaw:**
- [ ] `/api/agent/external` relay endpoint live
- [ ] Tank has crawler mode toggle (hosted / BYO webhook URL)
- [ ] BYO webhook call works end-to-end (can test with a simple echo server)
- [ ] Directive is wired to the LLM call (not dead UI)
- [ ] Shell checkboxes gate which claws the LLM can use

**Molt loop:**
- [ ] Both crawlers fight autonomously — zero keyboard input during molt
- [ ] Combat log shows each decision + `reasoning` field when available
- [ ] Molt ends correctly → result/KO screen

**Deploy:**
- [ ] `npm run build` clean, no TypeScript errors
- [ ] `OPENAI_API_KEY` set in Vercel dashboard
- [ ] cogcage.com serves the updated `/play` page

---

## Scope Reality Check

The TS migration + Phaser integration is 2–4 hours of solid work on top of the original plan. Friday is still achievable if we execute in order:

```
A (TS migration, ~2h) 
→ B1 (Phaser molt scene, ~3h) 
→ B2 (relay endpoint, ~1h) 
→ B3 (tank BYO config, ~1h)
→ B4 (wire runner ↔ Phaser, ~1h) 
→ B5 (reasoning log, ~0.5h)
```

If time runs short, ship in this priority:
1. TS migration + Phaser rendering + molt-runner wired = **you can watch crawlers fight**
2. BYO relay + tank config = **you can plug in your own OpenClaw**
3. Reasoning log = **polish**

---

## Post-Friday Backlog

- Speed controls (0.5x / 1x / 2x)
- Replay step-through viewer using `runMoltFromLog`
- HMAC auth for BYO webhook calls (Phase B)
- Win/loss history in DB
- Crawler counter-balance validation (2,000-game suite per spec §11 AC#3)
- Map obstacles and LOS (deferred per spec §12)
- 2v2 mode (deferred per spec §12)
- MCP adapter spec + public certification tests (Phase C)

---

## Key Invariants — Never Regress

1. Engine is deterministic: `(seed, actionLog)` → identical winner always
2. Invalid action → `NO_OP` + `ILLEGAL_ACTION` event, never throws
3. Molt always terminates: KO or tick timeout
4. No `Math.random()` inside engine — `Rng` class only
5. LLM/crawler timeout → `NO_OP` fallback, molt continues

---

## Handoff Contract (for implementing crawler)

Before writing code:
1. Read this doc fully
2. Read `docs/ws1-mechanics-spec-v1.md` — locked spec
3. Run existing tests: `node --test web/scripts/ws2-core.test.mjs`

Work in order:
1. Task A: migrate JS → TS (do not change logic, verify tests still pass)
2. Tasks B1–B5 in order

Hard rules:
- Do not change engine logic during TS migration — types only
- Phaser game loop drives visual rendering; `molt-runner.ts` drives simulation
- Never call `resolveTick` directly from React components
- Branch: `feat/ws2-phaser-byo-openclaw` off main
- Push early, PR when done

Report back format:
```
## Task Complete: [title]
- Done: [what]
- Evidence: [commands + outputs]
- Artifacts: [PR/branch, files changed]
- DoD checklist: [items checked]
- Scores (correctness/completeness/coverage/regression/prod): [X/X/X/X/X]
- Follow-up: [any gaps]
```

---

*Last updated: 2026-02-26 by Daedalus — revised per Aleks architecture directives (TS-only, Phaser 3, BYO OpenClaw primary)*
