# MOVEMENT SYSTEM
*The Molt Pit — Movement & Positioning Specification*
*Deep Brine Studios | WS18 | Locked: March 2, 2026 (WS18.1 hand update)*

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

## Core Timing Constants (Locked)

- Tick rate: **150ms**
- Decision window: **5 ticks = 750ms**
- Action queue cap: **3 actions**
- Hand swap duration: **1 full decision window = 750ms**

These constants are lock-level. Hand swap design is built around them, not the other way around.

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

### SWAP_HAND
- Cost: 0 energy
- Payload: `slot` (`main_hand` or `off_hand`) + `item_id` from carried hand inventory
- Duration: **exactly 1 decision window (5 ticks / 750ms)**
- Validation: `main_hand` accepts weapons only; attempting to swap a shield into `main_hand` is NO_OP.
- Behavior:
  - Swap starts immediately when action resolves for the window.
  - The currently equipped hand item remains active during the swap window.
  - At end-of-window, the new item is equipped into the target slot and the replaced item moves to reserve.
  - The swap action consumes the action slot for that window. No SCUTTLE/BURST/PINCH/SPIT/SHELL_UP in the same window.
- Invalid swap payload (item not carried, slot invalid): NO_OP.

### BURST HIT
If BURST destination is occupied by opponent: 8 damage (before armor), both stay — opponent knocked to nearest open tile (or stays if none adjacent).

If both agents simultaneously BURST to each other's tiles: both take 8 damage, both return to origin.

---

## Simultaneous Collision Resolution

Two Crusties cannot occupy the same tile.

| Scenario | Resolution |
|----------|-----------|
| Both SCUTTLE to same tile | Both stay in place. No damage. Mutual block. |
| Both BURST to same tile | Both take 8 BURST HIT damage, both return to origin. |
| One SCUTTLE + one BURST to same tile | BURST wins. BURST Crustie lands. SCUTTLE Crustie stays. |

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
  "queue_cap": 3,
  "non_open_tiles": [
    {"pos": [5, 5], "type": "WALL"},
    {"pos": [8, 8], "type": "COVER"},
    {"pos": [10, 3], "type": "HAZARD"}
  ],
  "hands": {
    "main_hand": {"item_id": "MAXINE", "class": "weapon", "weapon_tag": "melee"},
    "off_hand": {"item_id": "REVERSAL", "class": "shield"},
    "reserve": ["THE_REACH", "WIDOW_MAKER"],
    "swap_pending": {
      "active": false,
      "slot": null,
      "item_id": null,
      "complete_at_tick": null
    }
  },
  "queued_actions": ["SCUTTLE_N", "SCUTTLE_NE"],
  "available_actions": ["SCUTTLE", "BURST", "PINCH", "SPIT", "SHELL_UP", "SWAP_HAND"]
}
```

`available_actions` dynamically excludes BURST for PATRIARCH/HARDCASE. The LLM gets a clean action set — no need to reason about why something is missing.

---

## Example Turn: Swap Timing + Resolution

**Window 22 (ticks 110-114):**
- Crustie A queue head: `SWAP_HAND(slot=main_hand, item_id=WIDOW_MAKER)`
- Crustie B queue head: `SPIT`

**Resolution:**
1. Tick 110: swap starts (`swap_pending.active=true`, `complete_at_tick=114`)
2. Ticks 110-113: A still has old main-hand stats (MAXINE) for this window
3. Tick 114 end-of-window: swap commits (`main_hand=WIDOW_MAKER`, old main-hand moved to reserve)

**Window 23 (ticks 115-119):**
- Crustie A queue head: `PINCH`
- `PINCH` now resolves using WIDOW-MAKER numbers, because swap completed at the previous window boundary.

This is intentional pacing: the crowd sees the weapon change coming, and the opponent gets one 750ms window to react.

---

*Movement locked: March 2, 2026 (WS18.1 hand update)*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
