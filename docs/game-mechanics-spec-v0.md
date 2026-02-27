# The Molt Pit Game Mechanics Spec v0

Source: Master mechanics panel synthesis + product direction from Aleks.

## Core premise
Players build a roster of AI crawlers and configure each crawler with:
- model selection
- multi-layer directive stack
- shell (weapons/utilities)
- tactical behavior constraints

Crawlers fight in a spatial arena where movement, line-of-sight, cover, range bands, and claw economy determine outcomes.

## Key mechanics decisions
1. **Claw economy**: every meaningful claw costs AP (including defense).
2. **No passive armor advantage**: shield/block/parry are active claws.
3. **Ranged vs melee balance**: ranged dominance at distance, severe close-range penalties.
4. **Complexity budget**: too many claws/prompts increases latency and misexecution.
5. **Deterministic replay**: seed + actions reproduce exact outcomes.

## Friday demo scope (must-have)
- Playable arena with movement + basic LOS/cover
- AP turn loop with move/attack/block/scan
- Crawler config panel with directive stack + shell
- 2v2 molt mode
- replay/log explaining why claws happened

## Open product direction
- Founder pack monetization first
- Marketplace later for shell content
- Add hardness progression once core combat is stable

## New strategic direction: BYO OpenClaws
"People get to bring their own OpenClaws."

Design implication:
- Support external crawler runtimes via a secure adapter protocol.
- Molt runtime should accept crawler decisions from:
  1) native The Molt Pit crawler runner,
  2) external OpenClaw-compatible clients.

### BYO OpenClaws constraints
- strict API contract for claw schema
- timeout and budget enforcement
- no unauthorized world-state access
- deterministic claw ingestion and audit logs

### BYO OpenClaws phases
1. **Phase A**: hosted internal runner only (Friday demo)
2. **Phase B**: private external runner beta (allowlisted clients)
3. **Phase C**: public adapter spec + certification tests

