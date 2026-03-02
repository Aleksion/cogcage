# MOVEMENT SYSTEM
*The Molt Pit — Movement & Positioning Specification*
*Deep Brine Studios | WS18 | Locked: March 1, 2026*

---

## Grid Movement

**8-directional.** N, S, E, W, NE, NW, SE, SW.

Direction vectors:
```
N=(0,-1)  S=(0,+1)  E=(+1,0)  W=(-1,0)
NE=(+1,-1)  NW=(-1,-1)  SE=(+1,+1)  SW=(-1,+1)
```

Diagonal movement costs same as cardinal (1 energy per SCUTTLE). Diagonal flanking is a valid and efficient strategy — no tax.

---

## Actions

### SCUTTLE (MOVE)
- Cost: 1 energy (modified by Plating — see below)
- Move 1 tile in specified direction
- Blocked by: WALL, COVER, opponent's current tile
- HAZARD destination: 6 damage at resolution step 6

### BURST (DASH)
- Cost: 2 energy (modified by Plating)
- Move exactly 2 tiles in specified direction (hydraulic jump)
- **Can pass over COVER** (jump mechanic — no extra cost)
- **Cannot pass through WALL** (hard barrier even jumping)
- Cardinal directions only for v1: N, S, E, W (±2 on one axis)
- HAZARD at destination: damage triggers. HAZARD at intermediate tile: no damage.
- BURST into opponent's tile: BURST HIT (see below)
- BURST through opponent's tile (intermediate): no interaction

**Why cardinal BURST only?** Diagonal 2-tile movement creates collision ambiguity and complicates LoS calculation. Clean for v1. Revisit Tide 2.

### BURST HIT
If BURST destination is occupied by opponent: 8 damage (before armor), both stay — opponent knocked to nearest open tile (or stays if none adjacent).

If both agents simultaneously BURST to each other's tiles: both take 8 damage, both return to origin.

---

## Simultaneous Collision Resolution

Two Lobsters cannot occupy the same tile.

| Scenario | Resolution |
|----------|-----------|
| Both SCUTTLE to same tile | Both stay in place. No damage. Mutual block. |
| Both BURST to same tile | Both take 8 BURST HIT damage, both return to origin. |
| One SCUTTLE + one BURST to same tile | BURST wins. BURST Lobster lands. SCUTTLE Lobster stays. |

**Why mutual block for SCUTTLE?** Forces commitment — if you want to take a contested tile, pay 2 energy for BURST.

---

## Knockback

**PINCH has no knockback.** Position unchanged for both parties.

TENDERHOOK: HOLD (immobile for 2 windows), not knockback.
BUZZ: STUN (next action is NO_OP), not knockback.
Knockback as a mechanic deferred — requires wall-interaction rules not needed in v1.

---

## Terrain Effects

### HAZARD (damage tile)
- Standing at end of window: **6 damage**, armor-reduced normally
- Moving through without stopping: no damage
- BURST landing: damage triggers
- SHELL UP + HAZARD: damage reduced to 3
- Environmental — does NOT trigger ECHO counter or BLEED BACK reflect

### WALL
- Impassable. Blocks SPIT raycast. Blocks BURST.
- Map edge treated as WALL.

### COVER
- Impassable for movement (treated as WALL)
- Blocks SPIT line-of-sight
- BURST can pass over (intermediate tile only)
- No damage reduction from adjacent positioning

---

## Plating Movement Modifiers

### BLOCK-7 (Common Plating)
Speed −15% → **SCUTTLE costs 2 energy. BURST costs 3 energy.**

Agent reads energy depletion naturally from game state. Sustainable rate: 1 SCUTTLE/window (costs 2, regens 2). Cannot SCUTTLE + PINCH in same window without deficit.

### THE PATRIARCH (Legendary Plating)
Speed −25%, no BURST → **SCUTTLE costs 2 energy. BURST unavailable.**

`available_actions` excludes BURST. Agent never needs to know why — it just isn't offered.

### HARDCASE (Common Plating)
No BURST, movement costs energy → **SCUTTLE costs 2 energy. BURST unavailable.**

### PAPER-MACHÉ (Common Plating)
Speed +30% → **SCUTTLE costs 0 energy. BURST costs 1 energy.**

60 HP. Dies to anything. But it can cross the map in 2 windows for free. High-mobility glass cannon.

**Implementation: Option B (energy cost model).** All movement penalties expressed as energy cost changes, not queue cap changes. Emergent — the LLM adapts by reading energy. No special-casing needed.

---

## Energy Economy (Movement Context)

| Plating | SCUTTLE cost | BURST cost | Sustainable rate |
|---------|-------------|-----------|-----------------|
| Standard | 1 | 2 | 2 moves/window |
| BLOCK-7/PATRIARCH/HARDCASE | 2 | 3/unavail | 1 move/window |
| PAPER-MACHÉ | 0 | 1 | unlimited SCUTTLE |

Energy regen: 2/window. Base: 10.

An agent that only moves without attacking: net-zero energy indefinitely (standard Plating). SHELL UP costs 0. Pure turtle = valid but makes zero progress. MAX_TICKS ensures attrition can't run forever.

---

## Movement State for LLM

Minimal state representation:
```json
{
  "my_position": [x, y],
  "opponent_position": [x, y],
  "my_energy": 7,
  "non_open_tiles": [
    {"pos": [5, 5], "type": "WALL"},
    {"pos": [8, 8], "type": "COVER"},
    {"pos": [10, 3], "type": "HAZARD"}
  ],
  "queued_actions": ["SCUTTLE_N", "SCUTTLE_NE"],
  "available_actions": ["SCUTTLE", "BURST", "PINCH", "SPIT", "SHELL_UP"]
}
```

`available_actions` dynamically excludes BURST for PATRIARCH/HARDCASE. The LLM gets a clean action set — no need to reason about why something is missing.

---

*Movement locked: March 1, 2026*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
