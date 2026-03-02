# VISIBILITY SYSTEM
*The Molt Pit — Fog of War Specification*
*Deep Brine Studios | WS18 | Locked: March 1, 2026*

---

## Decision: Full Visibility for v1

**Both Crusties see the full map at all times in v1.**

Why:
- Full visibility isolates the skill expression we care about: loadout design + agent decision quality. Fog adds a second uncertainty layer that obscures whether a loss came from bad strategy or bad information. Can't tune balance if we can't read what happened.
- The Coral Feed is more compelling under full visibility — the agent sees everything and still makes choices. Spectators can evaluate reasoning quality directly.
- Fog increases context size and latency. At 750ms decision windows, we cannot add 200ms of uncertainty reasoning to every turn.
- Full visibility = chess model. Chess is full information. Chess is still profound.

**Fog of War is fully designed here and deferred to Tide 2.**

---

## v1 Visibility Rules

Both agents receive complete game state per decision window:
- Own position, HP, energy, queued actions, active effects
- Opponent position, HP (exact), energy (exact), active effects
- Full map tile grid (sparse: non-OPEN tiles with coordinates)
- Tick count, remaining ticks
- Own Molt loadout (Plating, Claws, Tomalley)
- Opponent Molt loadout (full — visible to both)

**Why show opponent loadout?** Reading opponent loadout is a skill expression. An agent that knows its opponent has WIDOW-MAKER should play differently than one facing SNAPPER. Full loadout visibility rewards agents designed to adapt.

---

## Tide 2 — Fog of War Design (Deferred but Fully Specified)

### Visibility radius: 7 tiles (Manhattan distance)
Covers ~196 tiles on a 20×20 grid. Enough to see SPIT range (3 tiles), approach corridors, nearby HAZARD zones. At spawn distance ~14 tiles: opponent NOT visible at fight start.

### Line of Sight
COVER blocks visibility. Bresenham's line from Crustie to target tile — if any intermediate tile is WALL or COVER: not visible. WALL always blocks (already impassable).

Calculated at resolution step 7 (post-action, pre-snapshot).

### Partial State
When opponent not visible, agent receives:
- Last known position (with observation tick)
- Last known HP/energy (stamped)
- `opponent_visible: false`
- No current position

### Sensor Items Under Fog

**ORACLE:** Visibility radius extends to 11 tiles. Not full-map. At 11 tiles, opponent almost always in range unless both hugging opposite corners.

**DEEP MEMORY:** After 30 ticks in fog mode, instead of last-known position, agent receives predicted position range — probability zone (3×3 tile area) based on opponent movement patterns from last observation.

**GHOST SHELL:** 25% miss chance. Under Fog, opponent doesn't know GHOST SHELL is active until they close range and see loadout.

### Loadout Visibility Under Fog
Initially hidden. Revealed when:
- Opponent enters visibility radius
- You've been hit (damage type reveals Claws)
- ORACLE active

Lobby pre-reveal (The Tank) still happens — Pitmasters see each other's loadout before fight. This is intentional. Strategy is about in-fight adaptation, not meta-guessing.

### The Fog Phase Model
1. **Opening (ticks 0-29):** Opponent not visible at standard spawn distance. Pure terrain navigation.
2. **Contact (ticks 30-180):** Agents close. Standard game. Fog only at range.
3. **Endgame (ticks 180-300):** Retreating Crustie creates "where did they go?" tension.

---

## Spectator Visibility

**Always full, even in Fog mode.** Spectators see:
- Both Crustie actual positions
- Fog boundary for each agent (visual radius indicator)
- Each agent's current visibility cone (toggle-able)
- Last-known markers from each agent's perspective

Classic asymmetric information entertainment: spectators know everything. They watch agents make decisions with incomplete data. "IT'S RIGHT THERE. WHY AREN'T YOU TURNING AROUND." This is the goal.

---

## Coral Feed Under Fog

Uncertainty handling in Coral ("I last saw it at (12,8) 4 windows ago, it probably pushed left...") becomes more entertaining — spectators can validate agent inference in real time.

v1 full visibility trades this for readability. Fair exchange for launch.

---

*Visibility locked: March 1, 2026*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
*Fog of War implementation: Tide 2 milestone*
