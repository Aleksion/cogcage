# WS18 — LEAD GAME DESIGNER
**Lead: Game Design Director**
**Studio: Deep Brine Studios**

## Your Job

You are the Lead Game Designer at Deep Brine Studios. Your job is to make The Molt Pit fun, engaging, and addictive. Not just mechanically sound — genuinely compelling.

The core promise: two or more Chelae enter The Pit. Last one standing wins. The skill expression is: optimal OpenClaw agent design + optimal loadout choice. Both matter. Neither alone is enough.

Read these first:
- `design/systems/COMBAT.md` — what's already decided (150ms ticks, queue cap 3, 750ms windows)
- `design/items/REGISTRY.md` — all 40 items with effects
- `design/world/ONTOLOGY.md` — vocabulary
- `design/README.md` — mandatory PR rules

## What Needs Answering

The current codebase has a basic engine (see `web/app/lib/ws2/engine.ts`). It works but the map is flat and empty. No obstacles. No terrain. No fog. No depth.

You are writing the full game design spec that lets an engineer build the real engine.

## Deliverables

### 1. `design/systems/MAP-DESIGN.md`

**The Arena** — what does the physical space look like?

Answer:
- Grid dimensions (currently 20×20 — right size? Or change?)
- Are there obstacles? Yes/no and why. What types?
  - **Cover** — blocks line of sight for SPIT (ranged). Chelae can BURST over/around it.
  - **Walls** — hard block. Cannot enter. Cannot SPIT through.
  - **Hazard zones** — tiles that deal damage if stood on (acid pool? pressure vents?)
  - **The Center** — does holding the center matter? Objective scoring?
- How do obstacles affect LLM decision-making? (This is the key question — more cover = more context tokens needed = slower agents = tradeoff)
- Map variants: should there be multiple arena layouts? How many to start?
- Procedural vs fixed maps: start fixed (3 maps), add procedural later?
- Spawn positions: how far apart? Does starting position matter?

### 2. `design/systems/VISIBILITY.md`

**Fog of War** — do Chelae see the whole map?

This is a game design decision with major implications for LLM agents. Answer:

- Full visibility (current): Both agents see everything. Simple. Fair. Less interesting.
- **Fog of War**: Each Chela sees only tiles within N tiles of themselves. Opponent hidden when out of range. LLM must reason under uncertainty. This is harder to implement but DRAMATICALLY more interesting.
- Line of sight: does cover block visibility (cover creates blind spots)?
- Sensor items: does ORACLE (Tomalley) give extended visibility? Does DEEP MEMORY let you track opponent through fog?
- Recommendation: Full visibility for v1, Fog of War as Tide 2 feature?

Design the visibility rules completely even if some are deferred.

### 3. `design/systems/MOVEMENT.md`

**How Chelae move**

- Grid movement: 8-directional (N/S/E/W/NE/NW/SE/SW) — current
- Movement cost: 1 energy per SCUTTLE
- BURST: 2-tile move, costs 2 energy, ignores adjacency
- Can two Chelae occupy the same tile? (No — what happens if they try to move to the same tile simultaneously? Who wins? Does it deal damage?)
- Knockback: does PINCH knock the target back 1 tile? Should it?
- Terrain effects: does moving through hazard zones cost extra energy?
- Does BLOCK-7 (heavy Carapace) have explicit movement penalty in engine code, or just prompt fragment?

### 4. `design/systems/ITEMS-IN-PLAY.md`

**How every item actually affects the game state**

For each of the 40 items in `design/items/REGISTRY.md`, specify:
- **Exact mechanical effect** (numbers, triggers, conditions)
- **What the LLM sees** in game state (how is this item's effect communicated to the agent?)
- **What the spectator sees** (visual effect, sound trigger)
- **Balance notes** (is it too strong? Too weak? Synergies with other items?)

Flag items that need fog-of-war to be interesting (e.g., DEEP MEMORY, GHOST SHELL).
Flag items that create degenerate strategies (e.g., infinite WIDOW-MAKER loops — not possible, it breaks, but check for others).

### 5. `design/systems/GAME-FEEL.md`

**What makes it fun to watch and play**

This is the most important document. Answer:
- What does a great Scuttle look like from a spectator's perspective?
- What are the most exciting moments in a fight? (WIDOW save, last-second REVERSAL, BUZZ chain stun?)
- What makes a Chela feel powerful? What makes losing feel fair rather than frustrating?
- What's the "hype moment" we're designing toward? Every great fighting game has one (Evo moment, clutch plays). What's The Molt Pit's version?
- Comeback mechanics: can a low-HP Chela come back? (THE RED GENE, INVERTER — design these to enable it)
- Pacing: is 45 seconds (MAX_TICKS 300) the right fight length? What's too short? Too long?
- Spectator mode: what information does the audience need to understand what's happening?
- The Coral Feed (brain panel): what should spectators see streaming from each agent's reasoning? How do you make LLM reasoning *entertaining* to watch?

### 6. `design/systems/MULTIPLAYER.md`

**FFA and team modes (design only — not implemented yet)**

- 1v1: current. How does it feel at 150ms?
- FFA (3-4 Chelae): last standing wins. How does multi-target affect LLM decision-making? (Context gets longer — is that a design feature or a bug?)
- Team (2v2): does The Pit support teams? How does team strategy emerge from LLM agents?
- Tournament bracket: how do Scuttles feed into Tide rankings?

## The Core Design Question You Must Answer

**"Is the game actually fun?"**

Not fun to design. Fun to play and watch. The Molt Pit's audience is:
1. Pitmasters who built the Chela (proud parent energy — watching your agent fight)
2. Spectators who have no stake (pure entertainment)
3. Competing Pitmasters (tension, strategy, rivalry)

All three need to leave satisfied. How?

## Mandatory PR Rules

When you push:
1. `CHANGELOG.md` (root) — add entry
2. `design/DECISIONS.md` — every game design decision logged with alternatives rejected
3. `design/BUDGET.md` — ledger row

## Success

An engineer reads your documents and can build the game engine from them. No ambiguity in the mechanics. Every edge case addressed. Every item's in-game effect precisely specified.

An investor reads GAME-FEEL.md and wants to play it.
