# WS1 Execution Plan v1 — Mechanics → Implementable Core

Owner: Daedalus  
Status: Active (planning locked, implementation handoff next)  
Thread: [WS1] Game Design / Mechanics

## 1) Deliverables

### D1 — Mechanics Spec (locked candidate)
- File: `ws1-mechanics-spec-v1.md`
- Covers: action economy, combat math, ranged-vs-melee counters, complexity budget, acceptance criteria.

### D2 — Visual + Spectator Spec (next)
- File: `ws1-visual-style-spec-v1.md` (to create)
- Covers: comic/manga visual language, HUD readability, VFX/SFX taxonomy, replay/broadcast overlays.

### D3 — Game Core Implementation Checklist
- File: `ws1-game-core-implementation-checklist-v1.md` (to create)
- Covers: module-by-module build plan, test matrix, telemetry contracts, rollout gates.

---

## 2) Implementation Work Breakdown

### Phase A — Engine Contracts
1. Define `GameState`, `AgentAction`, `ResolutionResult` types.
2. Implement pure action resolver pipeline:
   - validation
   - legality fallback (`NO_OP` + `ILLEGAL_ACTION`)
   - state mutation
   - event emission
3. Lock deterministic RNG boundary from seed.

### Phase B — Combat + Objective
1. Implement fixed action costs/cooldowns/durations.
2. Implement damage formula and multipliers exactly as spec.
3. Implement objective zone scoring and timeout tie-breakers.

### Phase C — Telemetry + Replay
1. Emit required event taxonomy.
2. Build replay runner from `(seed, initial_state, action_log)`.
3. Add event-stream hash validator.

### Phase D — Balance + Perf Gates
1. Run matchup harness (2,000 games per pairing target).
2. Validate no archetype >55% sustained WR at equal skill.
3. Ensure p95 tick resolve <= 5ms on target host.

---

## 3) Acceptance Gates (must pass)

1. Determinism: 10,000 seeded reruns => identical winner + event hash.
2. Legality: invalid action always degrades to `NO_OP` and logs illegal.
3. Counter health: ranged/melee archetype WR inside target bounds.
4. Performance: p95 tick <= 5ms.
5. Replay parity: end-state parity on all validated reruns.

---

## 4) Visual Direction (locked intent)

Theme: **Real Steel impact + manga/comic readability + F1 telemetry narrative**

Principles:
- 3-second spectator readability
- Punchy callouts (KAPOW/CRACK/etc.)
- Bold silhouettes and high-contrast archetype identity
- “Why it happened” overlays in replay

---

## 5) Risks + Mitigations

1. **Over-complexity creep**
   - Mitigation: enforce complexity budget hard limits from mechanics spec.
2. **Unreadable combat despite good systems**
   - Mitigation: visual spec includes readability checklist and HUD constraints.
3. **Balance churn**
   - Mitigation: telemetry-first balancing with WR and matchup matrix.
4. **Non-deterministic edge cases**
   - Mitigation: deterministic replay hash test as blocking CI gate.

---

## 6) Immediate Next Actions

1. Create `ws1-visual-style-spec-v1.md`.
2. Create `ws1-game-core-implementation-checklist-v1.md`.
3. Package both with mechanics spec as WS1 handoff bundle for core implementation.

---

## 7) Handoff Bundle (target)

- `ws1-mechanics-spec-v1.md`
- `ws1-visual-style-spec-v1.md`
- `ws1-game-core-implementation-checklist-v1.md`

When these 3 exist and are reviewed, WS1 planning is implementation-ready.
