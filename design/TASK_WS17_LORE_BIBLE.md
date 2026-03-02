# WS17 — THE LORE BIBLE
**Lead: Narrative Director**
**Studio: Deep Brine Studios**

## Your Job

You are the Narrative Director at Deep Brine Studios. You are writing the complete lore bible for The Molt Pit — every piece of world-building, backstory, and flavor text that makes players *feel* this world the moment they enter it.

This is not documentation. This is *law*. Everything written here becomes the raw material for:
- Loading screen copy
- Tooltip text
- UI flavor lines (The House voice)
- Screen descriptions
- Item lore
- Onboarding / tutorial copy (called The Soft Shell Guide)
- Any copy any future agent writes in this codebase

Read `design/world/ONTOLOGY.md` first. That is the vocabulary. You write within it.
Read `design/ui/COPY-GUIDE.md`. That is the voice. You write in it.
Read `design/items/REGISTRY.md`. Items already have lore seeds. Expand them.

## The Register

High on Life meets The Deep. Dry commitment to the bit. The world is slightly absurd and completely serious about it. The House is not trying to be funny. Crustaceans don't know they're in a game. The Pit doesn't care about feelings.

**References:**
- High on Life — every NPC has a distinct voice, the world has internal rules, humor through commitment
- Borderlands — weapon descriptions as world-building, dry corporate tone for item descriptions
- Pacific Rim — weight, consequence, the feeling that what's happening matters
- Deep sea biology — bioluminescence, pressure, alien beauty, things that evolved in darkness

## What To Write

### 1. THE WORLD — `design/world/LORE.md` (new file)

Full origin story. Answer these:
- What is The Brine? Where did it come from? How old is it?
- What are Chelae (the creatures)? How did they evolve in The Brine? Why do they have exoskeletons?
- What is The House? Who founded it? What does it want?
- What is The Molt Pit? When was it built? Why?
- What is a Pitmaster? How did Pitmasters discover they could drop their own agents into Chelae?
- What is a Scuttle, really? Why does The House call it that?
- What does it mean to be Red? What happened to the first Red-ranked Chela?
- What is The Brine at 3am? (atmosphere piece — what does it feel like to be in The Brine when no one is watching?)

Minimum 1500 words. This is the world bible. It should feel like it predates the game.

### 2. SCREEN PRIMERS — `design/ui/SCREEN-PRIMERS.md` (new file)

For each screen, write:
- 3-5 sentences of atmospheric description (what does this place feel like?)
- The House flavor line (already in COPY-GUIDE.md — expand to 3 variants each)
- What a new Pitmaster should understand immediately on arrival
- Any ambient detail (what's visible in the background, what sounds play)

Screens: The Brine · The Shed · The Tank · The Pit · The Ledger · The Pit Board · Surface (sign-in)

### 3. ITEM LORE EXPANSIONS — `design/items/ITEM-LORE.md` (new file)

Each of the 40 items in `design/items/REGISTRY.md` already has 1-2 lines of lore. Expand each to a full paragraph — the history of this item, how it ended up in The Brine, who made it, what happened to them.

The voice: item descriptions are written by The House. They are matter-of-fact about things that should not be matter-of-fact.

### 4. THE SOFT SHELL GUIDE — `design/ui/SOFT-SHELL-GUIDE.md` (new file)

This is the onboarding experience for new Pitmasters. Never call it a tutorial.

Write the full text of The Soft Shell Guide — what a Hatchling Pitmaster reads on their first session. It should:
- Explain the world without explaining the mechanics directly (show, don't tell)
- Be written by The House (slightly ominous, matter-of-fact)
- Cover: what you are, what your Chela is, what The Shed does, what a Scuttle is, what Molting means, what Red means
- End with: "The Pit is ready. Your Chela is waiting. You can read more later. Or you can enter now."

### 5. LOADING SCREEN COPY — `design/ui/LOADING-LINES.md` (new file)

50 loading screen lines. The House speaking. One per screen transition.

Rules:
- Max 12 words each
- No exclamation points (one permitted per 50, used ironically)
- The House tone: ancient, neutral, slightly ominous
- Some reference items, ranks, or game mechanics obliquely
- A few should be genuinely funny through sheer commitment

Examples of the register:
- *"The Pit has seen worse. Probably."*
- *"Your Chela is being prepared. It did not ask to be prepared."*
- *"BLOCK-7 has survived 4,847 Scuttles. You have survived fewer."*
- *"The House takes a cut. The House has always taken a cut."*
- *"Entering The Brine. Don't look at the bottom."*

## Deliverables

Five new files in `design/`:
1. `design/world/LORE.md`
2. `design/ui/SCREEN-PRIMERS.md`
3. `design/items/ITEM-LORE.md`
4. `design/ui/SOFT-SHELL-GUIDE.md`
5. `design/ui/LOADING-LINES.md`

## Mandatory PR Rules

When you push your PR:
1. Update `CHANGELOG.md` (root) — add entry
2. Update `design/DECISIONS.md` — log any world-building decisions made
3. Update `design/BUDGET.md` — add ledger row with estimated cost

## Success

A new agent dropped into this repo with zero context reads `design/world/LORE.md` and `design/ui/SCREEN-PRIMERS.md` and immediately knows: where they are, what the tone is, and what every word of copy should feel like. No ambiguity.

*"The Pit doesn't explain itself. But we do. Once."*
