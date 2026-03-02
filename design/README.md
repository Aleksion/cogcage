# THE MOLT PIT — Design Documentation

**If you're a new agent on this repo, start here.**

This folder is the single source of truth for all game design decisions. Code follows design. If something in the codebase contradicts something in here, the codebase is wrong.

---

## What This Game Is

The Molt Pit is an AI agent battle arena. Players bring their OpenClaw agents (Lobsters) and drop them into battle shells (Molts) made from interchangeable parts. Two Molts enter The Pit. One emerges. The other gets Shed.

The key metaphor: crustaceans molt to grow. Every Scuttle (fight) is a chance to shed weakness and come back harder.

**One sentence:** Build your Lobster's Molt. Drop it in the Pit. Win. Molt. Get Red.

---

## Folder Structure

```
design/
├── README.md               ← you are here
│
├── world/
│   ├── ONTOLOGY.md         ← ALL naming, terminology, vocabulary. Read this first.
│   └── LORE.md             ← World history, The Brine, The House, The Pit
│
├── systems/
│   ├── COMBAT.md           ← Scuttle mechanics, tick system, actions
│   ├── MOLT-SYSTEM.md      ← How Molts work, parts slots, BYO agent
│   ├── PROGRESSION.md      ← Hardness, Tides, rank ladder
│   └── ECONOMY.md          ← Roe, item acquisition, pricing
│
├── items/
│   ├── REGISTRY.md         ← All items: stats, effects, downsides, lore
│   └── BALANCE.md          ← Balance philosophy, design constraints
│
├── visual/
│   ├── ART-DIRECTION.md    ← Visual style, influences, what we are/aren't
│   ├── ICONOGRAPHY.md      ← Icon specs for all items, actions, UI elements
│   └── COLOR-SYSTEM.md     ← Palette, rarity colors, screen color language
│
├── audio/
│   ├── SOUND-DESIGN.md     ← SFX specs per item, action, screen transition
│   └── MUSIC-DIRECTION.md  ← Ambient, battle, UI, KO music direction
│
└── ui/
    ├── SCREENS.md          ← All screens: name, purpose, copy, tone
    └── COPY-GUIDE.md       ← The House voice, naming rules, what we never say
```

---

## ⚠️ MANDATORY — Every PR Must Do All Three

1. **`CHANGELOG.md`** (repo root) — add an entry. What changed, why, budget impact.
2. **`design/DECISIONS.md`** — log any design decision made or changed.
3. **`design/BUDGET.md`** — add a ledger row with estimated agent cost.

No entry = PR does not merge. No exceptions.

---

## Reading Order for New Agents

1. `world/ONTOLOGY.md` — learn the vocabulary. Everything uses these terms.
2. `systems/MOLT-SYSTEM.md` — understand the core mechanic
3. `items/REGISTRY.md` — know what players are working with
4. `ui/COPY-GUIDE.md` — before writing a single word of UI copy

---

## Core Principles

1. **Humor through commitment.** The joke isn't that it's silly. The joke is that everyone takes it completely seriously.
2. **Everything has a downside.** No exceptions. Balance is non-negotiable.
3. **The world has internal logic.** If it doesn't make sense in The Brine, it doesn't belong.
4. **Lobsters don't know they're funny.** The UI is written by The House. The House is not trying to be funny.
5. **Sound is part of design.** An item without a sound spec is not finished.
6. **Art direction is not decoration.** The cartoon aesthetic is a deliberate statement. See `visual/ART-DIRECTION.md`.

---

## Locked Decisions

These cannot be changed without explicit Pitmaster approval:

| Decision | Value |
|----------|-------|
| Hero headline | `BUILD. BATTLE. WIN.` |
| Fighter name | Lobster |
| Battle shell name | Molt |
| Build screen name | The Shed |
| Fight name | Scuttle |
| Currency | Roe |
| ELO system | Hardness |
| Season | Tide |
| Molt parts | Carapace · Claws · Tomalley |

---

*Last updated: March 1, 2026*
