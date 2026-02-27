# CogCage — Lobby & Matchmaking UX Design
*Documented Feb 27, 2026 from Aleks direction*

---

## Core Principle

**This is a 1v1 competitive experience.** You configure YOUR bot. You find a match. You fight someone else's bot. 

The current "configure both bots yourself" screen is wrong. It was a single-player prototype. Do not ship it as the real lobby.

---

## Screen Architecture

### Screen 1: Match Browser ("The Cage")

The entry point. Not a config screen — a live arena browser.

**What you see:**
- **Open Matches** — live or recent matches you can spectate (read-only viewer)
- **Open Lobbies** — lobbies waiting for a second player to join
- **Search by Code** — text input to find a specific lobby by invite code

**How sharing works:**
- Lobby codes are the share primitive (not URLs, not usernames)
- "Got a code? Enter it here" — simple, fast, direct
- Codes are short (~6 chars), human-readable

**Layout:**
```
[ FIND A MATCH ]
  
  [🔍 Enter lobby code ___________] [Join]

  OPEN LOBBIES                    LIVE MATCHES
  ┌──────────────────┐            ┌──────────────────┐
  │ Iron Vanguard vs ?│            │ Iron V vs Null P  │
  │ by thealeks       │            │ Tick 42 / 120     │
  │ [JOIN]            │            │ [WATCH]           │
  └──────────────────┘            └──────────────────┘
```

---

### Screen 2: Bot Workshop ("The Workshop")

Where you design and save your fighter configuration. Persistent — you build your roster here, not every match.

#### Section A: Identity
- Bot name (e.g. "Iron Vanguard")
- Avatar / icon (future — for now just name + color)

#### Section B: Brain (System Prompt)
- Large textarea — needs to afford multi-paragraph strategy writing
- Minimum 400px height, expandable
- Placeholder examples: "You are an aggressive melee fighter. Close distance and MELEE_STRIKE. Guard when opponent charges ranged attacks."
- Character counter (e.g. up to 2000 chars)
- Tabs or sections for: Primary Directive / Situational Rules / Win Condition

#### Section C: Armory (Loadout)
Full armory picker — not a checkbox list. Visual cards with icons, names, flavor text, stats.

**Design:**
```
┌─────────────────────────────────┐
│  ⚔️  MELEE STRIKE               │
│  "The Iron Fist"                │
│  Close-range • 22 base dmg      │
│  Range: 1.5 • Cost: 18e         │
│  [EQUIP ✓]                      │
└─────────────────────────────────┘
```

**Rules:**
- Can equip as many weapons as desired
- More weapons = harder decisions for the LLM = complexity penalty (show complexity score)
- MOVE is always equipped (cannot remove)
- Armor is mutually exclusive (pick one):
  - **Light** — 1.0x damage taken. Fast, risky.
  - **Medium** — 0.9x damage taken. Balanced.
  - **Heavy** — 0.82x damage taken. Slow, durable.
- Show "Complexity Score" updating live as weapons are added (e.g. "3 weapons — High complexity")

**Weapon roster (with icons + flavor names):**
| ID | Display Name | Icon | Cost | Stat |
|----|-------------|------|------|------|
| MOVE | Quick Step | 👟 | 4e | Move 1 cell |
| MELEE_STRIKE | Iron Fist | ⚔️ | 18e | 22 dmg, range 1.5 |
| RANGED_SHOT | Sniper Protocol | 🎯 | 14e | 16 dmg, range 2-10 |
| DASH | Phase Dash | ⚡ | 22e | Leap 3 units, +15% next attack |
| GUARD | Iron Shell | 🛡️ | 10e | Block 35% frontal dmg for 0.8s |
| UTILITY | Ghost Pulse | 🌀 | 20e | Special ability, 1.2s effect |

*(More weapons to be added — this is the base armory)*

#### Section D: LLM Selection
Pick the brain powering your bot's decisions.

**Providers + models to support (MVP):**
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4.1, GPT-4.1-mini
- **Anthropic**: Claude Sonnet 4, Claude Haiku 4
- **Google**: Gemini 2.5 Flash, Gemini 2.5 Pro
- **Mistral**: Mistral Large, Mistral Small
- **xAI**: Grok 2

**UX pattern:**
- Provider selector (logo + name tabs)
- Model picker within provider (name + speed/cost indicator)
- Keys are from your saved Profile (see below) — not entered per-bot

---

### Screen 3: Player Profile

Where API keys and account preferences live. Accessed via nav/settings.

**Sections:**
- **LLM Keys** — per-provider API key fields (stored in-browser, never sent to server except proxied to LLM)
  - OpenAI key
  - Anthropic key
  - Google key
  - etc.
- **Display name** — shown in lobbies and match history
- **My Bots** — saved bot configurations (roster, not just one bot)
- (Future) Wallet / credits balance

---

### Screen 4: Create Lobby

Launched from Match Browser or a "New Match" CTA.

**Fields:**
- Select bot from your saved roster (or quick-create)
- Public or Private toggle (private = invite-code only, not listed in lobby browser)
- Lobby name (optional, defaults to "{your bot name}'s Lobby")
- Invite code (auto-generated, copyable)

**State:**
- Waiting for opponent — show "Waiting for challenger..." + invite code prominently
- When opponent joins — both players see each other's bot names (not configs) → "FIGHT" countdown

---

### Screen 5: Match View (Spectator + Player)

Already mostly designed. Key additions:
- Both bots shown by their configured names (not "Bot A / Bot B")
- Post-match: show winner + prompt to rematch or find new opponent

---

## Navigation Flow

```
Landing Page
    │
    ▼
[PLAY] CTA ──────────────────────────────► Match Browser (Screen 1)
                                                │           │
                                    [Search/Join lobby]  [Spectate match]
                                                │
                                    ┌───────────┴──────────┐
                                    │                      │
                              [Create Lobby]         [Join Lobby]
                                    │                      │
                              Screen 4: Create       → Match View
                                    │
                               waiting room
                                    │
                            opponent joins
                                    │
                               Match View (Screen 5)

Profile ◄── always accessible via nav
Workshop ◄── "My Bots" in nav or pre-match if no saved bot
```

---

## What to Gut / Rebuild

### Current `/play` screen (Play.tsx) — WRONG MENTAL MODEL
- ❌ "Configure Your Agents" heading — implies you own both bots
- ❌ Side-by-side Bot A / Bot B config — solo player cosplay
- ❌ "Multiplayer Rooms" hidden behind a toggle — rooms should be first-class

### What to keep:
- ✅ Bot config panel design (name, prompt, loadout, armor, temperature) — just repurpose for YOUR bot only
- ✅ Match view (arena, HP bars, event log, PlayCanvas renderer)
- ✅ Room creation / invite code logic (just surface it better)
- ✅ BYO LLM key flow

---

## Priority Build Order

1. **Match Browser** — the entry point. Even with no real matches, an empty state with "Create Lobby" CTA is correct.
2. **Bot Workshop** — armory with icons, brain prompt, LLM picker
3. **Profile** — key storage (can start as localStorage, move to server)
4. **Create/Join Lobby** — wire room creation to proper waiting room UX
5. **Match View polish** — bot names, post-match rematch flow

---

## Open Questions

1. **LLM keys: client-side proxy or server relay?**
   - Client-side: keys never leave browser, CogCage has no liability
   - Server relay: better for rate limiting, abuse prevention, future CogCage-hosted credits
   - Recommendation: start client-side, add server relay when credits model exists

2. **Saved bots: localStorage or server?**
   - Start localStorage (fast, no auth needed)
   - Move to server when auth exists

3. **Matchmaking: manual lobby codes only, or ranked queue?**
   - Codes-only for MVP (gameday)
   - Ranked queue post-launch

4. **Spectator seat limit?**
   - Unlimited spectators via SSE stream (no per-spectator compute cost)

---

*Owner: Daedalus / Game Design session*
*Status: Spec — not yet implemented*
*Last updated: 2026-02-27*
