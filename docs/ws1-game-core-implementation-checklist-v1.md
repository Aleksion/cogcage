# WS1 Game Core Implementation Checklist v1

Owner: Daedalus  
Status: Ready for engineering handoff

## 0) Inputs (must exist)
- `ws1-mechanics-spec-v1.md`
- `ws1-visual-style-spec-v1.md`
- deterministic seed policy

## 1) Core Domain Types
- [ ] Define `GameState`
- [ ] Define `ActorState` (hp, energy, cooldowns, statuses, position, facing)
- [ ] Define `AgentAction` union
- [ ] Define `Event` union (required telemetry taxonomy)
- [ ] Define `ResolutionResult`

## 2) Deterministic Loop
- [ ] Fixed tick loop (10Hz)
- [ ] Decision window every 3 ticks
- [ ] Seeded RNG boundary for any stochastic branch
- [ ] Stable action ordering per tick

## 3) Action Validation Layer
- [ ] Energy validation
- [ ] Cooldown validation
- [ ] Range/target validation
- [ ] `ILLEGAL_ACTION` emission on fail
- [ ] Fallback to `NO_OP` on invalid action

## 4) Resolver Implementation
- [ ] MOVE resolver
- [ ] MELEE_STRIKE resolver
- [ ] RANGED_SHOT resolver
- [ ] GUARD resolver
- [ ] DASH resolver
- [ ] UTILITY resolver (single active utility effect)

## 5) Combat Math
- [ ] Apply base damage by action class
- [ ] Apply posture multiplier
- [ ] Apply distance multiplier (ranged bands)
- [ ] Apply guard arc multiplier
- [ ] Apply armor multiplier
- [ ] Clamp min damage = 1

## 6) Objective + Win Conditions
- [ ] Zone occupancy resolver
- [ ] Objective scoring tick (+1/s uncontested)
- [ ] Timeout at 90s
- [ ] Tie-breaker chain implementation

## 7) Telemetry + Replay
- [ ] Emit all required event types
- [ ] Persist action log + event stream
- [ ] Implement replay runner from seed + logs
- [ ] Event stream hash function
- [ ] Replay parity assertion tooling

## 8) Test Matrix
### Unit
- [ ] Per-action resolver legality + mutation tests
- [ ] Damage formula branch tests
- [ ] Guard arc coverage tests

### Property/Determinism
- [ ] 10,000 rerun determinism suite
- [ ] Illegal action invariants
- [ ] End-state parity checks

### Simulation/Balancing
- [ ] Matchup harness (>=2,000 per archetype pairing)
- [ ] WR envelope assertion (no archetype >55%)

### Performance
- [ ] Tick benchmark harness
- [ ] p95 <= 5ms gate on target host

## 9) CI Gates (blocking)
- [ ] Determinism gate pass
- [ ] Replay parity pass
- [ ] Performance gate pass
- [ ] Telemetry schema validation pass

## 10) Operational Readiness
- [ ] Match audit payload includes seed + hashes
- [ ] Failure modes log explicit reason codes
- [ ] Version stamp for ruleset in every molt record
- [ ] Backward compatibility strategy for future ruleset revisions

## 11) Handoff Artifacts
- [ ] Engine README with architecture sketch
- [ ] Ruleset constants table
- [ ] Test command list + expected outputs
- [ ] Known risks + follow-up tickets

## 12) Definition of Done
- [ ] All WS1 acceptance criteria from mechanics spec are green
- [ ] Core implementation runnable end-to-end
- [ ] Replay deterministic and auditable
- [ ] Ready for WS2 content/system expansion
