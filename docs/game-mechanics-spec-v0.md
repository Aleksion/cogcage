# CogCage Game Mechanics Spec v0

Source: Master mechanics panel synthesis + product direction from Aleks.

## Core premise
Players build a roster of AI bots and configure each bot with:
- model selection
- multi-layer system prompt stack
- armory loadout (weapons/utilities)
- tactical behavior constraints

Bots fight in a spatial arena where movement, line-of-sight, cover, range bands, and action economy determine outcomes.

## Key mechanics decisions
1. **Action economy**: every meaningful action costs AP (including defense).
2. **No passive armor advantage**: shield/block/parry are active actions.
3. **Ranged vs melee balance**: ranged dominance at distance, severe close-range penalties.
4. **Complexity budget**: too many tools/prompts increases latency and misexecution.
5. **Deterministic replay**: seed + actions reproduce exact outcomes.

## Friday demo scope (must-have)
- Playable arena with movement + basic LOS/cover
- AP turn loop with move/attack/block/scan
- Bot config panel with prompt stack + loadout
- 2v2 match mode
- replay/log explaining why actions happened

## Open product direction
- Founder pack monetization first
- Marketplace later for armory content
- Add ranked progression once core combat is stable

## New strategic direction: BYO OpenClaws
"People get to bring their own OpenClaws."

Design implication:
- Support external agent runtimes via a secure adapter protocol.
- Match runtime should accept agent decisions from:
  1) native CogCage bot runner,
  2) external OpenClaw-compatible clients.

### BYO OpenClaws constraints
- strict API contract for action schema
- timeout and budget enforcement
- no unauthorized world-state access
- deterministic action ingestion and audit logs

### BYO OpenClaws phases
1. **Phase A**: hosted internal runner only (Friday demo)
2. **Phase B**: private external runner beta (allowlisted clients)
3. **Phase C**: public adapter spec + certification tests

