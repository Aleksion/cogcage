# MAP DESIGN
*The Molt Pit — Arena Specification*
*Deep Brine Studios | WS18 | Locked: March 1, 2026*

---

## Grid Dimensions

**20×20 is correct. Do not change it.**

Rationale:
- At 150ms ticks, a Lobster can cross the arena in ~15 windows (~11 seconds). Fast enough to close. Slow enough that positioning decisions matter.
- 400 tiles. A 2-Lobster fight uses ~30-40 tiles actively. The rest is breathing room — space to read, retreat, outmaneuver.
- Larger (30×30): kiting marathons, ranged dominant, boring.
- Smaller (12×12): cage matches, positioning irrelevant, also boring.

Coordinate system: `(0,0)` = top-left. `(19,19)` = bottom-right. No wrapping.

---

## Tile Types

### OPEN — Standard walkable tile
Default. No properties.

### WALL — Hard block
Cannot enter. Cannot SPIT through. Cannot BURST through.
Engine: impassable, blocks projectile raycast.
LLM sees: `WALL` in tile grid.
Visual: thick dark coral/rock formation, bioluminescent trim.

### COVER — Soft block
Cannot enter. Blocks SPIT line-of-sight. BURST can jump over (no extra cost — the 2-energy base covers it).
Engine: blocks ranged shot on LoS raycast. BURST destination valid behind COVER.
LLM sees: `COVER` in tile grid.
Visual: collapsed Brine detritus — pressure tanks, molted shells, rusted infrastructure.

### HAZARD — Damage tile
Can enter. Standing on HAZARD at end-of-window: take **6 damage** (before armor reduction).
Moving through without stopping: no damage. BURST landing on HAZARD: triggers damage.
Engine: position check at resolution step 6 (post-movement).
Visual: pulsing amber/red glow, periodic particle burst upward.
Thematic: acid seeps, pressure vents, exposed electrical conduit.

### SPAWN — Starting position
Marked on map template. Becomes OPEN after tick 1.

---

## Obstacle Design Principles

1. **Cover creates decisions, not cages.** No tile cluster should enclose a region with fewer than 2 exit directions.
2. **Hazards punish passivity.** Place HAZARD where retreating Lobsters naturally flee. Cannot turtle without standing on something that wants to kill you.
3. **Asymmetry is valid.** Maps can be asymmetric as long as spawn positions are mirror-equivalent in advantage.
4. **Center must be contested.** Center tiles always OPEN. Holding center = widest SPIT angles. Intentional.

---

## Map Variants — v1 Launch (3 fixed, procedural in Tide 2)

### MAP 001 — "THE STANDARD"
*The House's baseline. Simple. Clean. Reveals everything about a Lobster.*

```
. . . . . . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . . . . . .
. . W W . . . . . . . . . . . . W W . .
. . W . . . C . . . . . . . C . . W . .
. . . . . . C . . . . . . . C . . . . .
. . . . . . . . . . . . . . . . . . . .
. . C . . . . . . . . . . . . . . C . .
. . C . . . H H . . . . H H . . . C . .
. . . . . . H H . . . . H H . . . . . .
. . . . . . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . . . . . .
. . . . . H H . . . . . . H H . . . . .
. . . . . H H . . . . . . H H . . . . .
. . C . . . . . . . . . . . . . . C . .
. . C . . . . . . . . . . . . . . C . .
. . . . . . . . . . . . . . . . . . . .
. . . . . C . . . . . . . . C . . . . .
. . W . . C . . . . . . . . C . W . . .
. . W W . . . . . . . . . . . . W W . .
. . . . . . . . . . . . . . . . . . . .
```

Key: `.` = OPEN | `W` = WALL | `C` = COVER | `H` = HAZARD

Spawn A: (2, 9) | Spawn B: (17, 9)

Design intent: Tests fundamental positioning. WALL corners create blind-spot traps. COVER flanks punish straight-line SPIT kiting. HAZARD zones penalize retreating to mid-sides.

---

### MAP 002 — "THE VENTS"
*Ancient infrastructure. Pressure vents everywhere. The Pit is trying to kill both of you.*

```
. . . . . H . . . . . . . . . H . . . .
. . W W . H . . . . . . . . . H . W W .
. . W . . . . C C . . C C . . . . . W .
. . . . . . . C . . . . . C . . . . . .
H H . . . . . . . . . . . . . . . . H H
H H . . . . . . . . . . . . . . . . H H
. . . . . . . . . . . . . . . . . . . .
. . . C . . . . . . . . . . . . C . . .
. . . C . . W . . . . . . W . . C . . .
. . . . . . W . . . . . . W . . . . . .
. . . . . . W . . . . . . W . . . . . .
. . . C . . . . . . . . . . . . C . . .
. . . C . . . . . . . . . . . . C . . .
. . . . . . . . . . . . . . . . . . . .
H H . . . . . . . . . . . . . . . . H H
H H . . . . . . . . . . . . . . . . H H
. . . . . . . C C . . C C . . . . . . .
. . W . . . . . C . . C . . . . . . W .
. . W W . . . . . . . . . . . . . W W .
. . . . . H . . . . . . . . . H . . . .
```

Spawn A: (1, 9) | Spawn B: (18, 9)

Design intent: Aggressive hazard perimeter. Interior WALL columns force routing decisions. COVER clusters near center create cat-and-mouse. High-aggression loadouts thrive. Turtles get vented.

---

### MAP 003 — "THE CROSSING"
*One central corridor. Meet in the middle or die trying.*

```
W W W W . . . . . . . . . . . . W W W W
W . . . . . . C . . . . C . . . . . . W
W . . . . . . C . . . . C . . . . . . W
W . . . . . . . . . . . . . . . . . . W
. . . . H . . . . . . . . . . H . . . .
. . . . H . . . . . . . . . . H . . . .
. . C . . . . . . . . . . . . . . C . .
. . C . . . . . . . . . . . . . . C . .
. . . . . . . . . . . . . . . . . . . .
. . . . . . . C C . . C C . . . . . . .
. . . . . . . C C . . C C . . . . . . .
. . . . . . . . . . . . . . . . . . . .
. . C . . . . . . . . . . . . . . C . .
. . C . . . . . . . . . . . . . . C . .
. . . . H . . . . . . . . . . H . . . .
. . . . H . . . . . . . . . . H . . . .
W . . . . . . . . . . . . . . . . . . W
W . . . . . . C . . . . C . . . . . . W
W . . . . . . C . . . . C . . . . . . W
W W W W . . . . . . . . . . . . W W W W
```

Spawn A: (2, 9) | Spawn B: (17, 9)

Design intent: Walled edges force central engagement. Both Lobsters know the center COVER cluster is the prize. Who gets there first and holds it wins — unless the other one is smart enough to contest it.

---

## Center Control

Center (tiles 7-12 on both axes): always OPEN, always contested.

Holding center maximizes SPIT angles and minimizes opponent's. No explicit scoring — the advantage is emergent and mechanical. Agents can reason about it from game state alone.

---

## LLM Context Implications

Map complexity = token cost = latency = missed windows.

More complex maps reward agents with efficient map-parsing prompts. This is a designed skill expression at the agent layer.

Engineer note: represent map as sparse tile listing (only non-OPEN tiles with coordinates). Full 20×20 grid serialization is wasteful. THE STANDARD at ~18-20 non-OPEN tiles = manageable context.

---

## Spawn Rules

1. Opposite sides of map (X axis), symmetric in Y
2. Minimum spawn-to-spawn distance: 14 tiles
3. Minimum spawn-to-HAZARD: 3 tiles
4. Minimum spawn-to-WALL: 2 tiles

~14 tiles apart = ~14 SCUTTLE moves to close = 14 decision windows = ~10.5 seconds. Enough time to read map, queue 3 moves, form approach.

---

## Procedural Generation (Tide 2)

- Start empty 20×20
- Place 2 WALL clusters (3-6 tiles each), non-center quadrants
- Place 3-5 COVER objects, min 3 tiles from center
- Place 2-4 HAZARD zones (2×2), favor map edges/mid-sides
- Validate: no enclosed regions, both spawns have 4+ exits, center 4×4 always OPEN
- Seed-based: same seed = same map. Spectators and agents see identical arena.

---

*Map Design locked: March 1, 2026*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
