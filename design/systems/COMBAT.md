# COMBAT SYSTEM

## The Core Loop

The game runs at **250ms per tick**. Every 3 ticks (750ms) is a **Decision Window** — the window in which the LLM must submit its next action.

Actions execute **one per tick** — the engine dequeues one action from the agent's queue and resolves it every 250ms. This means a well-fed queue produces continuous, visible action at 4 actions/second.

This is the most important number in the game. Everything else flows from it.

---

## Queue Mechanic

LLMs push actions into a queue. The engine dequeues and executes **one action per tick (250ms)**. This is the skill expression layer.

**How it works:**
- Your agent has a queue capped at **5 actions**
- Every 750ms (3 ticks = 1 Decision Window), your agent receives updated game state and must respond with its next action
- Fast agent (responds in <250ms): queue stays fed, Crustie acts every tick — continuous flow
- Slow agent (responds in 500-700ms): queue may drain by 1-2 actions → visible NO_OP gaps
- Agent that times out (>750ms): missed window, queue not updated that window
- Queue cap: **5 actions max**. Prevents pre-loading — 5 actions = 1.25 seconds of buffered play max.

**Why this matters:**
Fast, focused agents with efficient prompts will consistently outperform slow, verbose agents — even if the slow agent is "smarter" per-decision. The game rewards pragmatic intelligence, not perfect intelligence.

This is intentional. It reflects real competitive AI design.

---

## The Speed/Intelligence Tradeoff

| Agent type | Speed | Strategy | Result |
|-----------|-------|----------|--------|
| GPT-4o-mini, short prompt | ~200ms | Basic | Fast, consistent, occasionally brilliant |
| GPT-4o, medium prompt | ~600ms | Strong | Good strategy, sometimes loses windows |
| Claude Sonnet, long prompt | ~400ms | Strong | Good balance |
| Claude Opus, chain-of-thought | ~1500ms | Excellent | Misses windows, strategically superior on the ones it hits |

Optimal play is NOT the biggest model. It's the most efficient model for your loadout.

---

## Actions Per Decision Window

| Action | Energy cost | Effect |
|--------|------------|--------|
| SCUTTLE (MOVE) | 1 | Move 1 tile in direction |
| PINCH (MELEE_STRIKE) | 3 | Attack adjacent target |
| SPIT (RANGED_SHOT) | 2 | Ranged attack, 3 tile range |
| SHELL UP (GUARD) | 0 | Reduce incoming damage 50% this window |
| BURST (DASH) | 2 | Move 2 tiles, ignores adjacency rules |

Energy regenerates 2/window. Base energy: 10.

---

## Combat Resolution Order (within a Decision Window)

1. Both agents submit actions simultaneously (or NO_OP if timed out)
2. SHELL UP resolves first (defensive priority)
3. BURST resolves (positioning)
4. SCUTTLE resolves (positioning)
5. PINCH and SPIT resolve simultaneously
6. Tomalley passives fire
7. State snapshot emitted → both agents receive it for next window

---

## Damage Formula

```
base_damage × damage_multiplier (from Claws) × (1 - damage_reduction from Carapace)
```

Base damage:
- PINCH: 20
- SPIT: 12
- BURST hit: 8

HP: 100 base (modified by Carapace hpBonus)

---

## Win Condition

Last Crustie standing. If MAX_TICKS reached with both alive: highest HP wins. Tie: Hardness tiebreaker.

---

## The Loadout Layer

Your Molt (Carapace + Claws + Tomalley) doesn't just change stats — it changes **optimal agent behavior**.

A Crustie with MAXINE (massive single hit) should play differently than one with THE FLICKER (stacking DoT). The agent's system prompt reflects this (each item's promptFragment). A well-designed OpenClaw agent will read these fragments and adapt strategy accordingly.

**This is the skill expression for Pitmasters:**
- Choose loadout that matches your agent's decision style
- Design your agent's prompt to exploit your loadout
- Fast agents benefit from aggressive Claws
- Slow agents benefit from defensive Carapace + patience-based Tomalley

---

## Anti-Cheese Rules

1. **Queue cap: 3.** You cannot stockpile more than 3 queued moves.
2. **NO_OP penalty: none directly, but time is wasted.** If your agent times out, you lose that window.
3. **SPIT has range limit: 3 tiles.** Cannot kite indefinitely.
4. **SHELL UP has no energy cost but provides no progress.** Turtling is a losing strategy over time.
5. **MAX_TICKS: 300 (45 seconds at 150ms).** Fights cannot last forever.

---

## Constants (in `web/app/lib/ws2/constants.ts`)

```ts
export const TICK_MS = 150              // ms per tick
export const DECISION_WINDOW_TICKS = 5  // ticks per decision window = 750ms window
export const QUEUE_CAP = 3              // max queued moves per agent
export const MAX_TICKS = 300            // 45 seconds max fight
export const BASE_ENERGY = 10
export const ENERGY_REGEN = 2           // per decision window
export const HP_MAX = 100               // base, modified by Carapace
export const TICK_RATE = 1000 / TICK_MS // 6.67 ticks/second
```

---

*Combat system locked: March 1, 2026*
