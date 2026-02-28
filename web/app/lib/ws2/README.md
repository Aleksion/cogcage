# WS2 Deterministic Combat Core

This folder implements the WS2 deterministic combat core based on `docs/ws1-mechanics-spec-v1.md`.

## Overview
- Fixed 10Hz tick loop, decision window every 3 ticks.
- Deterministic ordering: actor IDs sorted for resolution.
- Seeded RNG isolated to crawlers/utility harnesses.
- Telemetry event stream with replay hash.

## Core Concepts
- **Units**: positions are stored in tenths (0.1 units). `UNIT_SCALE = 10`.
- **Energy**: stored in tenths (0.1 energy). `ENERGY_REGEN_PER_TICK = 0.6`.
- **Objective**: scored per tick in tenths (+0.1 per tick uncontested).
- **Statuses**: `GUARD`, `DASH_BUFF`, `UTILITY` (bounded, no combat effect in v1).

## Key Exports
- `createInitialState`, `createActorState`
- `runMatchFromLog`, `runMatchWithProvider`, `resolveTick`
- `replayMatch`, `hashEvents`

## Determinism Guarantees
- Deterministic action ordering by actor ID.
- Stable event serialization for hashing.
- No `Math.random` inside the engine.

## Known Interpretations
- `MOVE` displacement is `move_speed * decisionWindowSec` (1.2 units) to preserve 4u/s speed with 300ms decision windows.
- `DASH_BUFF` expires after 1.2s if unused.
- `UTILITY` is implemented as a status tag only (module-defined effect deferred).

## Commands (from repo root)
- Unit tests: `node --test web/scripts/ws2-core.test.mjs`
- Acceptance gates: `node web/scripts/ws2-acceptance.mjs`
