# WS2 Game Core — Implementation Plan

**Owner:** Daedalus  
**Friday deadline:** Playable demo — both bots driven by LLMs, spectator mode, combat explainability  
**Thread:** https://discord.com/channels/1476009707037655280/1476620956737863772  
**Spec locked in:** `docs/ws1-mechanics-spec-v1.md`

---

## TL;DR — What Friday Looks Like

Player opens `/play`, configures their bot (name + directive + sliders), picks an opponent, hits **Enter Arena** and **watches** two LLMs fight. The combat log explains every decision. They can replay it. That's the demo.

---

## Current State Audit

### ✅ DONE — Do Not Touch

| Component | File | Status |
|---|---|---|
| Deterministic engine | `web/src/lib/ws2/engine.js` | Complete. All 6 actions, damage formula, objective, events, replay. Tests pass. |
| Scripted bots | `web/src/lib/ws2/bots.js` | Complete. melee/ranged/balanced archetypes. Used as fallback if LLM fails. |
| Replay system | `web/src/lib/ws2/replay.js` | Complete. Hash-stable event stream. |
| LLM decision endpoint | `web/src/pages/api/agent/decide.ts` | Complete. GPT-4o-mini, formats game state, validates response. 3s timeout → NO_OP fallback. |
| Play.tsx — lobby UI | `web/src/components/Play.tsx` | Complete. Bot config panel (name/directive/AGGR/DEF/RISK), opponent picker, seed input. |
| Play.tsx — result/KO screen | `web/src/components/Play.tsx` | Complete. KO overlay, Play Again, New Match. |
| Bot config sliders → armor/bonuses | `web/src/components/Play.tsx` | Complete. AGGR/DEF/RISK map to actor stats. |

### ❌ NOT BUILT — Friday Blockers

| # | What | Why It Blocks Friday |
|---|---|---|
| **F1** | **Spectator match runner** | Match is still human-controlled. Friday needs both bots LLM-driven, player watches. |
| **F2** | **Directive → system prompt wire** | Directive textarea is rendered but never sent to `/api/agent/decide`. LLMs fight blind. |
| **F3** | **Async tick loop with LLM calls** | No loop that calls `decide` for both bots each decision window and advances engine. |
| **F4** | **Decision explainability in combat log** | Log shows actions but not WHY (no LLM reasoning passed back). |
| **F5** | **Arena position sync** | Arena grid is cosmetic. Bot positions should reflect actual engine `position.x/y` in tenths. |

### 🔧 NICE TO HAVE — Post-Friday

| # | What |
|---|---|
| P1 | Replay viewer (step through action log) |
| P2 | Speed controls (slow / normal / fast) |
| P3 | Win/loss history panel |
| P4 | BYO OpenClaw adapter (Phase B) |
| P5 | Match history persisted to DB |

---

## Friday Execution Plan

### Task F1 + F3: Async Match Runner + Spectator Mode

**Goal:** `startMatch()` in Play.tsx kicks off an async loop. Both bots call `/api/agent/decide` every decision window. Player watches. No buttons during match.

**Approach:** Client-side `setInterval` at 300ms (one decision window). Each tick:
1. Check if `state.tick % DECISION_WINDOW_TICKS === 0`
2. Fire two parallel `fetch('/api/agent/decide', ...)` calls — one per bot
3. Await both (with 3s timeout already baked into the endpoint)
4. Call `resolveTick(state, actionsMap)` with results
5. Update React state for HP bars, positions, energy, log
6. Check `state.ended` → transition to result phase

**Key constraints:**
- LLM calls are async; engine tick must wait for both before resolving
- If LLM takes >3s, endpoint returns `NO_OP` — engine keeps running
- Engine state is a mutable ref (`useRef`), not useState — avoids stale closure issues
- Decision window = 300ms = 3 engine ticks. Render can run at 100ms, actions collected every 300ms.

**Files to change:**
- `web/src/components/Play.tsx` — replace human action handlers with `startAutoLoop()` / `stopLoop()`
- Keep action buttons hidden/disabled in spectator mode (or remove entirely for v1)

**Acceptance:** Hit "Enter Arena" → both bots move and fight autonomously → KO screen appears.

---

### Task F2: Wire Directive → System Prompt

**Goal:** The directive the player types becomes the LLM system prompt for their bot.

**Current:** `playerBotConfig.directive` is stored in state but never sent to `decide`.  
**Fix:** When building the `fetch` payload for the player's bot, include `systemPrompt: playerBotConfig.directive` (+ name/sliders context).

**Files to change:**
- `web/src/components/Play.tsx` — pass `systemPrompt` in the `decide` fetch body for player bot
- `web/src/pages/api/agent/decide.ts` — already reads `systemPrompt` from body ✅

**Acceptance:** Player sets directive "be aggressive early". LLM bot fires more early strikes. Combat log confirms.

---

### Task F4: Decision Explainability in Combat Log

**Goal:** Combat log shows what each bot chose and a one-line reason.

**Current:** Log shows action type only (e.g. `RANGED_SHOT`).  
**Fix:** 
1. The `decide` endpoint already has full game state context. Add a `reasoning` field to the response JSON — ask the LLM to include it alongside the action.
2. In the match runner loop, capture `action.reasoning` and push it to the feed.

**LLM prompt change in decide.ts:**
```
Respond with JSON:
{"type":"RANGED_SHOT","reasoning":"enemy is in optimal range band, I have energy"}
```

**Files to change:**
- `web/src/pages/api/agent/decide.ts` — add `reasoning` to response format prompt; return it in response body
- `web/src/components/Play.tsx` — display `reasoning` in feed alongside action

**Acceptance:** Combat log reads: `[alpha] RANGED_SHOT — "optimal distance, full energy"`.

---

### Task F5: Arena Position Sync

**Goal:** Bot sprites on the arena grid reflect actual engine positions.

**Current:** Player and enemy positions are tracked manually in Play.tsx state (`playerPos`, `enemyPos`) as grid cells. These may drift from the engine's actual `position.x/y` (in tenths, 0–200).

**Fix:** After each `resolveTick`, read `state.actors.alpha.position` and `state.actors.beta.position`, convert from tenths to grid coords (`Math.round(x / UNIT_SCALE)`), and sync to display state.

**Conversion:** `gridX = Math.round(pos.x / UNIT_SCALE)`, `gridY = Math.round(pos.y / UNIT_SCALE)`. Arena is 20x20.

**Files to change:**
- `web/src/components/Play.tsx` — derive display positions from engine state post-tick, not from manual tracking

**Acceptance:** Bots visually approach each other and land on correct cells matching engine state.

---

## Build Order (Friday sequence)

```
F5 (position sync) → F2 (directive wire) → F1+F3 (match runner) → F4 (explainability)
```

Rationale: position sync is isolated + unblocks visual correctness. Directive wire is one-line. Match runner is the big chunk. Explainability is a polish pass.

**Estimated scope:** F1+F3 is ~100–150 lines in Play.tsx. F2 is ~5 lines. F4 is ~20 lines in each file. F5 is ~10 lines.

---

## Definition of Done (Friday)

- [ ] F1: Enter Arena → both bots fight autonomously, no player input required
- [ ] F2: Directive text drives player bot's LLM behavior
- [ ] F3: Tick loop runs correctly; match ends with KO/timeout → result screen
- [ ] F4: Combat log shows action + one-line LLM reasoning per decision
- [ ] F5: Bot sprites track true engine positions on the 20x20 grid
- [ ] Deploy: Vercel deployment live at cogcage.com, `OPENAI_API_KEY` set in env
- [ ] Smoke test: Full match runs start to finish without console errors

---

## Post-Friday Backlog (parking lot)

- Speed controls (0.5x / 1x / 2x) for the match loop
- Step-through replay viewer using `runMatchFromLog` + event timeline
- Win/loss record stored in KV or DB
- Bot archetype counter balance validation (2,000-game test suite against spec §11 AC#3)
- BYO OpenClaw adapter spec (Phase B — separate WS3 track)
- Map obstacles/LOS (deferred per spec §12)
- Team modes 2v2 (deferred per spec §12)

---

## Key Invariants (from spec — never regress)

1. Engine is deterministic: same `(seed, actionLog)` → same winner always
2. Invalid actions → `NO_OP` + `ILLEGAL_ACTION` event (never throws)
3. Match always ends: either KO or tick timeout
4. No `Math.random()` inside engine — seeded RNG only
5. LLM timeout → graceful `NO_OP` fallback, match continues

---

## Handoff Contract (for implementing agent)

When you get this task:
1. Read this doc fully
2. Read `docs/ws1-mechanics-spec-v1.md` — locked spec
3. Check `web/src/lib/ws2/README.md` — engine interface
4. Run existing tests first: `node --test web/scripts/ws2-core.test.mjs`
5. Build in order: F5 → F2 → F1+F3 → F4
6. After each task, smoke test in browser before moving to next
7. Don't refactor engine.js — it's tested and locked
8. Branch: `feat/ws2-llm-spectator-mode` off main

When reporting back:
- Link to PR
- Confirm which Definition of Done items are checked
- Note any scores <9 with gaps

---

*Last updated: 2026-02-26 by Daedalus*
