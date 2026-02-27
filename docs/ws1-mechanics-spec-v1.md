# WS1 Mechanics Spec v1 (Core-Implementable)

Status: **LOCK CANDIDATE**
Owner: Daedalus
Scope: action economy, combat math, ranged-vs-melee counters, complexity budget, acceptance criteria

## 1) Simulation Invariants
1. Deterministic from `(seed, initial_state, action_log)`.
2. Single-winner or timeout objective; no ambiguous outcomes.
3. All legal actions are validated before state mutation.
4. No hidden side effects outside declared action resolver.

## 2) Match Structure
- Duration: `90s` hard cap
- Tick rate: `10 Hz` (every `100ms`)
- Arena: `20x20` grid units
- Timeout win condition: higher Objective Score; tie-breakers below.

### Timeout Tie-breakers (ordered)
1. Higher Objective Score
2. Higher HP%
3. Higher Damage Dealt
4. Fewer Illegal Action Attempts
5. Draw

## 3) Actor Stats (MVP)
- `hp_max`: 100
- `energy_max`: 100
- `energy_regen`: 6/sec
- `move_speed`: 4 units/sec
- `facing`: 8-direction discrete

Derived:
- `hp_pct = hp / hp_max`
- `distance(a,b)` Euclidean, quantized to 0.1

## 4) Action Economy
Each decision window is every `300ms` (3 ticks). Crawler may emit one claw.

### Action Costs / Cooldowns
- `MOVE(dir)` — cost 4 energy, no cooldown
- `MELEE_STRIKE` — cost 18, cooldown 1.2s, range <= 1.5
- `RANGED_SHOT` — cost 14, cooldown 0.9s, range 2.5–10
- `GUARD` — cost 10, cooldown 1.5s, lasts 0.8s
- `DASH(dir)` — cost 22, cooldown 3.0s, displacement 3 units
- `UTILITY` — cost 20, cooldown 5.0s (module-defined bounded effect)

If action invalid (range/cd/energy), engine records `ILLEGAL_ACTION` and substitutes `NO_OP`.

## 5) Damage Model
Base damage:
- Melee: 22
- Ranged: 16

Final damage formula:
`final = floor(base * posture_mult * distance_mult * guard_mult * armor_mult)`

Multipliers:
- `posture_mult`: attacker state (normal 1.0, after dash attack 1.15 for next hit only)
- `distance_mult`:
  - Melee: always 1.0 (if in range)
  - Ranged: 1.10 at [4,7], 0.85 at [2.5,4), 0.80 at (7,10]
- `guard_mult`: 0.65 when defender has active guard vs frontal arc (120°), else 1.0
- `armor_mult`: light 1.0, medium 0.9, heavy 0.82

Minimum hit damage: 1

## 6) Ranged vs Melee Counter System
Design target: neither archetype exceeds 55% sustained winrate at equal MMR.

Counter levers:
1. **Melee gap-close** via `DASH` + higher burst (22 base).
2. **Ranged kiting** via cheaper cadence (14 cost, 0.9s cd) but falloff outside optimal band.
3. **Guard frontal skill-check** rewards positioning; ranged can flank to bypass.
4. **Energy pressure**: sustained spam forces no-op windows.

Expected matchup texture:
- Melee wins if it forces repeated close engagements.
- Ranged wins if it preserves 4–7 distance band and rotates angle around guard.

## 7) Objective System
- Neutral objective zone centered at (10,10), radius 2.5
- Score gain: +1 point per second while uncontested in zone
- Contested occupancy: no score gain

## 8) Complexity Budget (MVP hard limits)
To keep core implementable + testable:
- Max 6 action types (current: 6)
- Max 5 multiplicative terms in damage formula (current: 4)
- Max 1 utility module effect active at once
- Max 3 status effects total per actor (guard, dash-buff, utility-tag)
- Decision payload size <= 512 bytes
- Per decision compute budget <= 20ms

## 9) Engine Interfaces (for game core)
### Action Input (from crawler)
```ts
interface AgentAction {
  tick: number
  type: "MOVE"|"MELEE_STRIKE"|"RANGED_SHOT"|"GUARD"|"DASH"|"UTILITY"
  dir?: "N"|"NE"|"E"|"SE"|"S"|"SW"|"W"|"NW"
  targetId?: string
}
```

### Resolver Contract
```ts
resolveAction(state: GameState, action: AgentAction, actorId: string): ResolutionResult
```
- Must be pure (no IO)
- Must emit deterministic events only

## 10) Telemetry + Replay Requirements
Required event types:
- `ACTION_ACCEPTED`
- `ILLEGAL_ACTION`
- `DAMAGE_APPLIED`
- `STATUS_APPLIED`
- `OBJECTIVE_TICK`
- `MATCH_END`

Replay validator passes if full event stream hash is identical across reruns with same seed.

## 11) Acceptance Criteria (Definition of Done)
1. **Determinism:** 10,000 seeded reruns => 100% identical winners + event hashes.
2. **Legality handling:** Invalid action always degrades to `NO_OP` + emits `ILLEGAL_ACTION`.
3. **Counter health:** In mirror-skill bots over 2,000 games each pairing, no archetype >55% WR.
4. **Performance:** p95 tick resolve <= 5ms on target host.
5. **Replayability:** 100% molts produce complete action timeline and end-state parity.

## 12) Open Questions (explicitly deferred)
- Utility module catalog breadth (post-v1)
- Map obstacles/LOS for ranged line breaks
- Team modes (2v2) interactions

---

## Ready-for-Implementation Checklist
- [x] Tick rate and decision windows fixed
- [x] Action set fixed
- [x] Costs/cooldowns fixed
- [x] Combat formula fixed
- [x] Objective and tie-breakers fixed
- [x] Acceptance tests fixed
