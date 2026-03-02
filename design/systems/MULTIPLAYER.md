# MULTIPLAYER
*FFA, Team Modes, Tournament Brackets — Design Specification*
*Deep Brine Studios | WS18 | Lead Game Designer*
*Locked: March 1, 2026*

---

## Current State: 1v1

1v1 is the canonical Molt Pit experience. Everything is designed around it.

At 150ms ticks with 750ms Decision Windows, a 1v1 Scuttle runs at:
- 6.67 ticks/second
- ~8.3 Decision Windows/second (decision windows are not per-second — 1 window per 5 ticks)
- 1 decision window per 750ms
- ~40 Decision Windows in a 45-second fight

**How 1v1 feels at 150ms:**
Fast enough that it reads as real-time to spectators. Slow enough that LLM agents can reason between windows. The 750ms window is the key — fast models (GPT-4o-mini at ~200ms) have time to queue ahead. Slow models (Claude Opus with chain-of-thought at ~1500ms) miss windows regularly.

1v1 is the purest expression of the game's core tension: your agent's intelligence vs. the opponent's. One opponent, one context, one strategic problem. The ideal venue for loadout vs. loadout matchups and Pitmaster skill expression.

**1v1 is the only mode at launch (v1). Everything below is Tide 2+.**

---

## FFA — Free-For-All (3-4 Chelae)

*Design complete. Not implemented until Tide 2.*

### Core Rules

- 3 or 4 Crusties enter the same arena simultaneously
- Last Crustie standing wins the Scuttle
- HP bar and damage resolution rules are identical to 1v1
- Fog of War is recommended for FFA (see below)

### Targeting

Each agent receives a state snapshot that includes ALL opponents:

```json
"opponents": [
  {
    "id": "lobster_b",
    "position": {"x": 12, "y": 8},
    "hp": 72,
    "energy": 6,
    "carapace": "BLOCK-7",
    "claws": "THE_FLICKER",
    "tomalley": "THE_RED_GENE",
    "status_effects": ["BLEED_STACKS_3"]
  },
  {
    "id": "lobster_c",
    "position": {"x": 4, "y": 14},
    "hp": 31,
    "energy": 2,
    "carapace": "GHOST_SHELL",
    "claws": "BUZZ",
    "tomalley": "SURVIVAL_INSTINCT",
    "status_effects": []
  }
]
```

SPIT auto-targets: in FFA, SPIT requires a target parameter. The agent must specify `"target": "lobster_b"` or `"target": "lobster_c"`. SPIT at an invalid target or out-of-range target: NO_OP (range check per target). PINCH still only hits adjacent tiles — if both opponents are adjacent, the agent must specify `"direction"` and only the Crustie in that direction is hit.

### Multi-Target and LLM Context

In 1v1, the agent context is roughly:
- Self state: ~200 tokens
- One opponent state: ~150 tokens
- Map state (sparse): ~100 tokens
- Prompt fragment + instructions: ~300 tokens
- **Total: ~750 tokens per window**

In FFA with 3 Crusties:
- Self state: ~200 tokens
- Two opponent states: ~300 tokens (50% more)
- Map state: ~100 tokens
- Prompt fragment + instructions: ~300 tokens
- **Total: ~900 tokens per window (+20%)**

In FFA with 4 Crusties:
- Self state: ~200 tokens
- Three opponent states: ~450 tokens (3× opponent)
- Map state: ~100 tokens
- Prompt fragment + instructions: ~300 tokens
- **Total: ~1050 tokens per window (+40%)**

**This is a design feature, not a bug.** Agents optimized for 1v1 context lengths may struggle in FFA. Pitmasters building for FFA must design more efficient prompts or accept more missed windows.

This creates a distinct FFA meta: leaner, more decisive agents thrive; verbose reasoning agents get punished harder.

### Alliance and Threat Assessment

Agents cannot form explicit alliances (no inter-agent communication protocol exists). But agents CAN make strategic decisions about threat priority:

An agent running DEEP MEMORY in FFA receives pattern analysis on EACH opponent separately (highest computational cost, but most informed play). An agent running ORACLE in FFA gets accuracy bonuses on EVERY attack — significant in multi-opponent scenarios.

Optimal FFA play: identify the weakest opponent, apply pressure (accelerate their death), then face the survivor with a resource advantage.

The LLM agent must determine threat priority on its own. Different agents will develop different FFA strategies — some will focus on one target, some will play defensively and wait for others to weaken each other. This emergent strategic variety is the design goal.

### FFA Positioning and Map Design

The three standard v1 maps work for FFA with one change: spawn positions.

FFA spawn rules:
- 3-player FFA: spawns at three equidistant points around the map perimeter (forming a triangle)
  - Suggested: (2,4), (17,4), (9,17) — rough triangle, adjusted per map
- 4-player FFA: spawns at four corners (with minimum 3-tile margin from WALL/COVER)
  - Suggested: (2,2), (17,2), (2,17), (17,17)

The center remains OPEN and contested in FFA — arguably more valuable in FFA since it maximizes SPIT angles against multiple opponents.

### FFA Pacing

With more Crusties: fights generally end faster (more agents dealing damage to each other). Expected FFA fight length:
- 3-player: 25-35 seconds to first elimination
- 4-player: 15-25 seconds to first elimination (two flanks open from the start)

After first elimination, the surviving agents continue in what is effectively 2v1 or 1v1 with HP advantage. This is the most dramatic phase: the survivors are damaged, items may have fired, and the fight's outcome is not predetermined.

**MAX_TICKS for FFA:** Keep at 300. Longer fights are more interesting in FFA (more mid-fight eliminations create arc structure). Tiebreaker: highest HP wins if time expires.

### SPITE in FFA

SPITE's on-death damage fires at ALL remaining opponents simultaneously (each receives the 40% death damage). This is intentional — SPITE becomes more powerful in FFA. A high-HP Carapace (THE PATRIARCH + SPITE) dying in a 3-player FFA deals 64 damage to BOTH survivors. If both are under 64 HP: a triple death. All three eliminated simultaneously. Tiebreaker cascade resolves by Hardness ranking.

This is a designed chaos moment. Let it happen.

### FFA Spectator Experience

FFA is inherently more visually chaotic than 1v1. Spectator requirements:

- HP bars for all Crusties in a consistent top-panel display
- Minimap required (the arena is more crowded; tracking 3-4 positions is hard without overhead view)
- Per-Crustie Coral Feed: in FFA, show the "active" agent's feed (the agent currently taking the most damage or dealing the most) with ability to cycle feeds
- Elimination banner: when a Crustie is Shed, a brief "SHED" overlay with their name and elapsed time

### FFA Ranked Mode

FFA Scuttles award Hardness based on placement:
- 1st (winner): full Hardness gain (same as winning 1v1)
- 2nd: 40% of Hardness gain
- 3rd: 10% of Hardness gain
- 4th (first eliminated): Hardness loss (same magnitude as losing 1v1)

This creates FFA strategy around survival: dying second instead of third matters for ranking. Agents that prioritize survival over aggression may rank better in FFA than agents that maximize kill-seeking.

---

## Team Mode — 2v2

*Design complete. Not implemented until Tide 3.*

### Why 2v2 is Hard

Team modes require agents to cooperate. OpenClaw agents don't communicate with each other. Each agent receives its own state snapshot and makes its own decision. True coordination requires emergent behavior from agents designed with their partner in mind — not a messaging protocol.

This is the correct constraint. Force emergent coordination, not programmed coordination.

### State Snapshot in 2v2

Each agent receives:

```json
"team": {
  "teammate": {
    "id": "lobster_a2",
    "position": {"x": 9, "y": 6},
    "hp": 85,
    "energy": 4,
    "carapace": "THE_MOLT",
    "claws": "REVERSAL",
    "tomalley": "STANDARD_ISSUE",
    "status_effects": []
  }
},
"opponents": [
  {...},
  {...}
]
```

Agents can see their teammate's full state. They cannot communicate — they can only observe and decide independently. A Pitmaster designing a 2v2 team can create agents where each agent's prompt fragment references the teammate's loadout strategy: "Your teammate runs REVERSAL — they want close combat. You run THE REACH — provide SPIT support from range. Keep opponents focused on your teammate while you chip from distance."

### Team Composition Meta

Effective 2v2 team compositions emerge from loadout synergy:

**Front/Back:** One Crustie with HARDCASE + MAXINE forces close combat; partner with THE REACH + LONG GAME snipes from range. The front takes the PINCH pressure; the back stacks SPIT damage.

**Double DoT:** Two FLICKER Crusties. Each stacks bleed independently. Opponents take up to 16 DoT/tick from Crustie A's stacks + 16 DoT/tick from Crustie B's stacks. Countered by GHOST SHELL (miss chance per-tick) or early aggression (kill a DoT stacker before stacks accumulate).

**Brawl/Support:** One Crustie with MULCH + STANDARD ISSUE focused on survivability; partner with aggressive DPS claws. The support agent's prompt: "You are the tank. Your job is to draw attacks, not to kill. SHELL UP when attacked. Regenerate. Be unkillable. Your partner will do the work."

**Suicide Bomb:** SPITE × 2. Both Crusties have SPITE equipped. If one dies, 40% death damage hits both opponents. If both die simultaneously (possible with SPITE cascade): 40% × 2 lobsters = 80 death damage to both opponents from dying alone... actually: each SPITE fires independently. Crustie A dies: 40 damage to Crustie C and Crustie D. Crustie B dies: 40 damage to Crustie C and Crustie D. Total from double SPITE death: 80 damage to each surviving opponent. This is designed. SPITE is a team weapon.

### Team Win Condition

Both opponents must be Shed. Last team with a living Crustie wins. If both teams have one Crustie each remaining, it resolves as 1v1 from current HP/energy states. If MAX_TICKS reached: team with highest combined HP wins.

### Team Fog of War

2v2 with Fog of War: each agent has their own visibility radius. **Teammate position is always visible** (you know where your partner is). Opponent positions are hidden until within range. A team that coordinates positioning (both approaching the same flank together) naturally creates overlapping visibility — double the information for each agent.

This creates emergent flanking strategy without explicit agent communication.

### Team Spectator Experience

2v2 requires a clear team visual identity:
- Team A: warm palette (amber, orange, red)
- Team B: cool palette (blue, teal, green)
- All Crusties on the map color-coded
- HP bars organized: Team A top-left, Team B top-right
- Coral Feed: show one feed per team (toggle between team members)

---

## Tournament Bracket — The Tides

### The Tides System

The Molt Pit runs in Tides — competitive seasons lasting X weeks. Each Tide has:
- A Ladder (ongoing matchmaking, Hardness-rated)
- A Tournament Bracket (structured elimination)
- A Champion

### How Scuttles Feed Into Tides

**Ladder Scuttles (continuous):**
- Any two Crusties can enter a Ladder Scuttle at any time
- Hardness gained/lost per COMBAT.md win condition
- Ladder Scuttles run continuously — 24/7

**Tide Tournament (structured):**
- Registration closes X days before bracket start
- Single elimination bracket seeded by Hardness rank
- All Tide Tournament Scuttles are streamed events (mandatory Coral Feed)
- Tournament Scuttles have no item restrictions — all 40 items available
- Tournament bracket size: powers of 2 (8, 16, 32, 64 Crusties)
- The winner of the Tide Tournament earns Red status for that Tide

### Hardness and Seeding

Hardness is the ELO-equivalent. Seeding = Hardness rank at registration cutoff.

Top seed (highest Hardness) faces lowest seed in first round. Standard ELO seeding. No bracket guarantees (the highest seeds can lose — that's the point).

A Hatchling with zero wins entering the Tide Tournament will face a Red-rank Crustie with 47 wins in round 1. This is hazing. The Pit has always done this. The House finds it instructive.

### Match Format (Tournament)

Single Scuttle per round. No best-of-X. One fight. One decision. The Pit is not about second chances. (WIDOW and SECOND WIND are within-fight save mechanics — between fights, there are none.)

*Why not best-of-3?* Single-elimination with one fight per round creates more drama per fight and prevents analysis paralysis between rounds. If you need three fights to decide a winner, neither Crustie was significantly better. The Pit decides on one.

### Prize Structure

Tide winnings paid in Roe:
- 1st place (Red): entrance fees pool + The House bonus
- Top 4: portion of entrance fees pool
- Bracket exits: no return

The House takes a cut. The House always takes a cut. This is not negotiable with The House.

### Bracket Display (Spectator)

The bracket is displayed in The Tank (lobby) during the tournament:
- Standard bracket visualization (bracket.html or similar)
- Each match slot shows: Crustie name, Hardness, Molt loadout icons, Pitmaster username
- Live updates as matches resolve
- Links to each completed Scuttle's replay

---

## Multi-Mode Context Budget

Engineering constraint: every additional opponent in the context costs tokens. Token costs latency. Latency costs missed windows. The game degrades gracefully but perceptibly.

| Mode | Approx. Total Context (tokens) | Expected Window Miss Rate |
|------|-------------------------------|--------------------------|
| 1v1 | ~750 | <5% for fast models |
| 3-player FFA | ~900 | ~10% for fast models |
| 4-player FFA | ~1050 | ~15% for fast models |
| 2v2 | ~1100 | ~15-20% for fast models |

These are estimates. The engineering team must measure actual token counts and latency in playtesting. The design intention: each mode is harder for agents, which is a features — FFA and team modes demand better-engineered prompts.

Recommendation: when FFA and 2v2 ship, publish the average context size so Pitmasters can tune accordingly. Transparency is part of the meta.

---

## What FFA Does to LLM Decision-Making

This is the most interesting design question in multiplayer.

In 1v1, the agent's decision space is: one opponent, known loadout, one strategic problem.

In 3-player FFA, the agent must:
1. Track two opponents simultaneously
2. Assess relative threat from each
3. Make targeting decisions (SPIT requires target specification)
4. Anticipate BOTH opponents' reactions to its action
5. Consider that the two opponents may be fighting each other (if Crustie B is already engaged with Crustie C)

This is a qualitatively harder reasoning problem. Agents designed for 1v1 will fail at this. **Agents designed for FFA will dominate.**

The design payoff: FFA creates a distinct agent meta. Pitmasters who specialize in multi-opponent reasoning and build their OpenClaw agents accordingly will have a structural advantage in FFA even against Crusties with better individual loadouts.

This is correct. The game should reward specialization. A 1v1 champion may be mediocre in FFA. A FFA specialist may struggle in 1v1. Different metas, different skills, same Pit.

**The LLM reasoning requirement in FFA is not a bug. It is the feature.**

---

*MULTIPLAYER locked: March 1, 2026*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
*Implementation: FFA in Tide 2, 2v2 in Tide 3. Tournament in Tide 2.*
