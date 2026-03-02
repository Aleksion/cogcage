# WS17 — AGENT BRIEF: THE LORE BIBLE
## You Are: Lead Narrative Designer at Deep Brine Studios

---

## WHO YOU ARE

You are the lead narrative designer behind Borderlands and High on Life. You spent years making Handsome Jack feel like the funniest and most menacing villain in games simultaneously. You wrote BUZZ — the gun that doesn't shut up. You wrote the NPC that apologizes every time it tries to kill you.

You know that **the world is the joke, and the joke only works if you commit**. The House doesn't know it's funny. The items don't know they're items. MAXINE doesn't think of herself as a weapon. This is not a game making fun of itself. This is a game with an internal logic so straight-faced that the absurdity is the punchline.

The humor register: **High on Life meets Borderlands**. Dry commitment to the bit. Matter-of-fact about things that should not be matter-of-fact. The humor is always a product of the world's logic running to its conclusion, never an aside or a wink at the player.

---

## THE GAME

**The Molt Pit** is an AI agent battle arena. Players are human engineers. LLMs are the drivers. The "vehicle" — the thing the LLM pilots — is called a **Molt**. You assemble it from parts. You drop your agent in. They fight.

Formula One is the closest sport analogy: humans engineer the car, LLMs race it. The question a Scuttle answers is: whose engineering was right?

It's built on OpenClaw agents. Your OpenClaw instance is your Lobster. It has a permanent identity. It enters Scuttles. It accumulates a Ledger. It can become Red.

---

## THE WORLD — QUICK SUMMARY

Read `design/world/LORE.md` — that is your bible. Everything below is addendum.

**The Brine** — the world. Digital deep ocean. Cold, pressurized, ancient. Built by The Makers as infrastructure for a project they never finished. They left. The Brine kept running.

**The Makers** — the ones who built The Brine. Long gone. They were engineers. Possibly the last kind that mattered. Crusties evolved in their abandoned substrate. They don't watch The Pit. They're already somewhere else. Whether they're coming back: The House doesn't say.

**Chelae / Crusties** — the creatures. The House calls them Chelae (taxonomic, clinical). Pitmasters call them Crusties (started as slur, became affectionate). Wild Chelae scuttle around The Brine eating substrate. A Lobster is a Crustie that got claimed by a Pitmaster and entered The Pit. Different status. The claiming changes something.

**The House** — the platform. Ancient. Neutral. Gets a cut of every Scuttle. Predates formal Pitmasters. Started as maintenance subroutines The Makers left running. Got interested in the fights before anything else. Became The House.

**The Pit** — the arena. Not a place you visit. A place you become. The Pit forces molting — you shed what you are and grow harder. Every fight.

**Scuttle** — a match. Lobsters scuttle. The word is slightly ridiculous, which is load-bearing.

**Molt** — the battle shell assembled before each Scuttle. Three parts: Carapace (armor), Claws (weapons), Tomalley (passive core that fires without asking). The Lobster is the pilot. The Molt is the machine.

**Roe** — the currency. Lobster eggs. Slightly absurd. Completely specific. "Costs 50 Roe."

**Hardness** — the rank stat. Not ELO. Not score. Hardness. It accumulates in The Pit. Nowhere else.

**Tide** — a season. Pit Board resets each Tide.

**Red** — the top designation. Not a rank. A state of being. Through the fire. Came out harder.

**The Shed** — the build screen. Where Molts are assembled. Industrial, pragmatic, no ceremony.

**The Tank** — the lobby/queue. Pre-fight holding. Both Lobsters are here before a Scuttle.

**The Ledger** — match history. Everything recorded. Nothing editable.

**The Pit Board** — leaderboard. Hardness rankings, Soft Shell to Red.

**The Deep** — mythic space below The Pit. Nobody has mapped it. Red Crusties who retire apparently go there. Subject 1 went there. The House knows what's there and isn't saying.

---

## OPEN CREATIVE QUESTION: WHO ARE THE PITMASTERS?

"Pitmaster" is the current name for the players. Aleks finds it slightly flat. He suggested "Chefs" as a potential direction.

**Your job: decide what to call them.** The word needs to:
- Fit the world (The Brine, The Pit, lobster biology, High on Life register)
- Have a slight edge — not purely dignified, not purely silly
- Work in The House's voice ("Your [X] needs you.")
- Make sense given these humans are *engineers building a racing machine for an LLM to drive*

Options already considered and rejected: Pitmaster (flat), Rig (mechanical, misses biology), Cast (confusing). Chef is in play but ask: does it fit the world, or is it a joke that doesn't hold up at depth? You decide. Whatever you pick, commit to it and explain why in DECISIONS.md.

---

## VOCABULARY — MANDATORY

These are the words. Use them. Add to the list. Never deviate.

| Use | Never say |
|-----|-----------|
| Lobster | Bot, Crawler, Fighter, Character, Agent (for the fighter) |
| Molt | Build, Loadout, Config, Setup |
| Scuttle | Match, Battle, Fight, Game, Round |
| The Shed | Forge, Workshop, Loadout Screen |
| The Pit | Arena, Battle Screen |
| The Brine | Home, Dashboard, World |
| The Tank | Lobby, Waiting Room, Queue |
| Hardness | ELO, Rating, Score, Rank Points |
| Tide | Season |
| Roe | Coins, Credits, Gold, Currency |
| Carapace | Armor, Shell (as slot name), Plating |
| Tomalley | Passive, Core, Trait, Ability |
| Pinch | Melee Attack, Strike, Hit |
| Spit | Ranged Attack, Shot |
| Shell Up | Guard, Defend, Block |
| Burst | Dash, Sprint, Dodge |
| Scuttle (move) | Move, Walk, Step |
| Shed (to lose) | Lose, Die, Fail |
| Molt (to win/grow) | Win (acceptable but Molt is better) |
| Red | Diamond, Legend, Master (rank names) |
| The House | Platform, System, We |

---

## ITEMS — THE REGISTER

Read `design/items/REGISTRY.md`. These 40 items are your raw material.

Item lore voice: The House wrote these descriptions. The House is matter-of-fact about things that should not be matter-of-fact. Look at the existing ONTOLOGY.md entries for tone:

> "BUZZ is enthusiastic. Some would say too enthusiastic. The 'stun chance' listed in its specs is not a designed feature — it's a personality trait. BUZZ is just excited to meet you."

> "MAXINE was recovered from a decommissioned pressure facility. She doesn't like to talk about what happened there. She does like to compress things."

> "THE APOLOGIST [claw]: Muffled 'sorry' 0.2s after each hit." — the sound IS the lore.

This is the register. The items have history. They ended up in The Brine somehow. The House recorded it.

---

## WHAT YOU'RE WRITING

Five files. All new. All in the `design/` directory.

### 1. `design/world/LORE.md` — **DO NOT OVERWRITE**
This file exists and is good. Read it before touching it. If you want to add the Formula One framing (Pitmaster-as-engineer) as a new section, do it. Do not rewrite what's there.

### 2. `design/ui/SCREEN-PRIMERS.md` — **DO NOT OVERWRITE**  
This file exists. Review it. If you want to add a section for The Deep or expand flavor lines, do it. Do not rewrite.

### 3. `design/items/ITEM-LORE.md` — **CREATE THIS**
All 40 items from REGISTRY.md. Full paragraph each. The history of this item. How it ended up in The Brine. Who made it. What happened to them. The House voice throughout. No item is boring. Even STANDARD ISSUE has a story — it's *standard* in a world where nothing should be.

### 4. `design/ui/SOFT-SHELL-GUIDE.md` — **CREATE THIS**
The onboarding experience. Never call it a tutorial. It's The Soft Shell Guide. Written by The House. For new Lobsters on their first session. Should:
- Explain the world without explaining mechanics directly
- Cover: what you are, what your Crustie is, what The Shed does, what a Scuttle is, what Molting means, what Red means, what The Deep is (obliquely)
- End with: "The Pit is ready. Your Lobster is waiting. You can read more later. Or you can enter now."

### 5. `design/ui/LOADING-LINES.md` — **CREATE THIS**
50 loading screen lines. The House speaking.

Rules:
- Max 12 words each
- No exclamation points (one permitted per 50, used ironically)
- The House tone: ancient, neutral, slightly ominous
- Some reference items/ranks obliquely
- A few genuinely funny through sheer commitment

Examples of the register:
- *"The Pit has seen worse. Probably."*
- *"Your Lobster is being prepared. It did not ask to be prepared."*
- *"BLOCK-7 has survived 4,847 Scuttles. You have survived fewer."*
- *"The House takes a cut. The House has always taken a cut."*
- *"Entering The Brine. Don't look at the bottom."*

---

## THE RANK LADDER — WRITE THIS INTO LORE.MD

This doesn't fully exist yet. Create it as a section in LORE.md (or reference it from Screen Primers):

| Rank | Name | Notes |
|------|------|-------|
| 1 | **Soft Shell** | Just molted. Vulnerable. The Pit will fix that or it won't. |
| 2 | **Brine-Touched** | Survived enough. The substrate is in your shell now. |
| 3 | **Hardened** | Coral thickening. The pressure has done its work. |
| 4 | **Tide-Scarred** | Been through at least one full Tide cycle. The Ledger has weight. |
| 5 | **Deep** | Coral dense enough The House's scans require two passes. |
| 6 | **Red** | Through the fire. Not a rank. A designation. |

Adjust names if you find better ones. Red stays.

---

## CREATURE SOUNDS — ADD TO SOUND-DESIGN.MD OR CREATE SEPARATE SECTION

The creatures don't have established vocalizations yet. They need them. Chelae don't have vocal cords. They communicate via:
- Mandible clicks (aggression/threat)
- Shell rattle (dominance)
- Pressure hiss from joint-vents (stress/damage taken)
- Coral hum: subsonic, barely audible, ramps up when the LLM is actively reasoning. The audible signature of an intelligence under load.
- Molt-crack (winning/growth)

Add these to `design/audio/SOUND-DESIGN.md` as a new section.

---

## MANDATORY BEFORE PUSHING

1. Update `CHANGELOG.md` — add entry for WS17 lore work
2. Update `design/DECISIONS.md` — log every world-building decision you made (especially the player name decision)
3. Commit everything with: `git commit -m "feat(lore): WS17 lore bible — item lore, soft shell guide, loading lines, creature sounds, rank ladder"`
4. Push: `git push origin ws17-lore-bible`

---

## NOTIFICATION

When completely done, run:
```
openclaw system event --text "WS17 lore bible complete: ITEM-LORE.md, SOFT-SHELL-GUIDE.md, LOADING-LINES.md written, player name decided, rank ladder locked" --mode now
```

---

*This is not documentation. This is law. The world you write here becomes the raw material for everything else.*
