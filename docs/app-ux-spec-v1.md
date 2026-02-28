# The Molt Pit — Authenticated App UX Spec v1

*Owner: Daedalus | Date: March 2026 | Status: Design-ready*
*Informed by: lobby-matchmaking-ux.md, ws1-mechanics-spec-v1.md, core-thesis.md*
*Inspiration: Clash Royale (home/deck flow), Destiny 2 (loadouts), Hearthstone (builder), Marvel Snap (collection), Brawl Stars (roster)*

---

## Vocabulary (canonical)

| Term | Means |
|------|-------|
| **Crawler** | Your fighter — the LLM-powered bot that fights. You own it. Has a name. |
| **Mold** | A saved configuration for a Crawler: claws equipped + armor + directive + model. One crawler can have many molds. You pick one before a molt. |
| **Claws** | The action loadout — which moves the crawler knows (MELEE_STRIKE, RANGED_SHOT, etc.). |
| **Directive** | The system prompt. The crawler's brain and strategy. |
| **Molt** | A live battle between two crawlers. |
| **Tank** | A waiting room for a molt (one player hosts, one joins). |

---

## Navigation (Persistent Top Bar)

```
[⚡ THE MOLT PIT]   FORGE    MOLDS    CAGE    LADDER    GUIDE    [avatar / credits 420 CR]
```

- **FORGE** — Home dashboard (default after login)
- **MOLDS** — Your mold collection + editor
- **CAGE** — Molt Browser: find tanks, spectate live molts
- **LADDER** — Ranked leaderboard
- **GUIDE** — Mechanics reference + tutorial

---

## Screen 1: THE FORGE (Home Dashboard)

*First screen after login. Think: Clash Royale home × Brawl Stars featured brawler.*
*Goal: one-tap into a molt + surface what matters (your active mold, recent results, status).*

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  WELCOME BACK, THEALEKS                         420 ⚡ CR       │
├──────────────────────────┬──────────────────────────────────────┤
│                          │  QUICK STATS                         │
│   [3D CRAWLER PREVIEW]   │  ┌────────┬────────┬────────┐       │
│   DREADCLAW              │  │ 14/21  │  68%   │  #47   │       │
│   Active Mold: KITE KING │  │ MOLTS  │  WIN%  │  RANK  │       │
│   ████░░ AGGR 82%        │  └────────┴────────┴────────┘       │
│   ████░░ ARM  65%        │                                      │
│   ████░░ IQ   88%        │  RECENT MOLTS                        │
│                          │  ✅ vs null_protocol   +18 CR  3m ago│
│  [ ⚡ FIND A MOLT ]      │  ❌ vs iron_vanguard   -12 CR  1h ago│
│  [ ✏️ EDIT MOLD ]        │  ✅ vs ghost_runner    +22 CR  2h ago│
│                          │                                      │
│                          │  ACTIVE TANKS (2 open)               │
│                          │  ▶ null_protocol's Tank [JOIN]       │
│                          │  ▶ thekiwi's Tank      [JOIN]        │
└──────────────────────────┴──────────────────────────────────────┘

  INCOMING CHALLENGE                                      [IGNORE]
  ┌─────────────────────────────────────────────────────────────┐
  │  🔴 ghost_runner wants to molt  →  [ACCEPT] (expires 30s)  │
  └─────────────────────────────────────────────────────────────┘
```

### Details

**Crawler Preview Panel (left)**
- Animated 3D PlayCanvas bot (same renderer as match) — idle animation loop
- Crawler name large (Bangers font), yellow
- Active mold name shown below in smaller text
- Three stat bars: AGGRESSION (based on loadout aggression profile), ARMOR (armor tier), COMPUTE SPEED (model latency tier)
- Two CTAs: `FIND A MOLT` (primary, red) → goes to CAGE | `EDIT MOLD` (secondary) → goes to MOLDS editor

**Quick Stats (top right)**
- Three numbers: Total Molts, Win%, Current Rank
- Tap any → goes to full LADDER page

**Recent Molts feed**
- Last 5 molts: result icon, opponent name, CR delta, time ago
- Tap any → goes to molt replay (stretch goal)

**Active Tanks strip**
- Live open tanks right now — each with a [JOIN] button
- Clicking JOIN puts you straight into tank room with your active mold

**Incoming Challenge banner**
- Appears when another player sends a direct challenge code
- 30-second timeout countdown
- ACCEPT → immediately into Tank Room

---

## Screen 2: MY MOLDS (Collection Screen)

*Where you see and manage all your saved molds. Think: Clash Royale deck selection × Destiny loadout list.*
*This is your armory. Each mold = a complete fighter configuration.*

### Layout

```
MY MOLDS                                         [+ NEW MOLD]

Active Mold: KITE KING ▼ (tap to switch)

Filters: [All] [Melee] [Ranged] [Hybrid] [Meta] [Custom]

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ★ ACTIVE         │  │                  │  │                  │
│                  │  │                  │  │                  │
│ [DREADCLAW ART]  │  │ [BOT SILHOUETTE] │  │ [BOT SILHOUETTE] │
│                  │  │                  │  │                  │
│ KITE KING        │  │ IRON RUSH        │  │ THE WALL         │
│ Ranged / Heavy   │  │ Melee / Medium   │  │ Melee / Heavy    │
│ GPT-4o-mini  ⚡  │  │ Claude Haiku ⚡⚡│  │ Gemini Flash ⚡  │
│ ████ AGG  92%    │  │ ████ AGG  78%    │  │ ██░░ AGG  40%    │
│ ████ ARM  65%    │  │ ███░ ARM  55%    │  │ ████ ARM  82%    │
│ ████ IQ   88%    │  │ ███░ IQ   72%    │  │ ████ IQ   90%    │
│ W:12  L:4  75%   │  │ W:8   L:6  57%  │  │ W:3   L:2  60%  │
│ [EDIT] [EQUIP ✓] │  │ [EDIT] [EQUIP]   │  │ [EDIT] [EQUIP]   │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│  + NEW MOLD      │  │                  │
│                  │  │  (locked slot)   │
│  Create your     │  │  Reach Rank 10   │
│  next build      │  │  to unlock       │
└──────────────────┘  └──────────────────┘

Mold Slots: 4 / 6 used    [Upgrade to 8 slots — 200 CR]
```

### Mold Card Anatomy

Each card is a ~280px wide panel (3-up on desktop, 2-up on tablet, 1-up on mobile):

```
┌─────────────────────────────┐
│ [★ ACTIVE badge or blank]   │  ← yellow badge if this is active mold
│                             │
│  [bot art or silhouette]    │  ← 120px animated or static bot preview
│                             │
│  KITE KING                  │  ← mold name (Bangers, white on dark)
│  Ranged + Guard • Heavy     │  ← claw summary + armor tag
│                             │
│  GPT-4o-mini  [⚡]          │  ← model name + latency tier icon
│                             │
│  AGGRESSION  ████████░░ 82% │  ← stat bars (derived from loadout profile)
│  ARMOR       ██████░░░░ 65% │
│  IQ          █████████░ 88% │
│                             │
│  12W / 4L   75% WR          │  ← win stats (only shown if ≥5 molts)
│                             │
│  [✏️ EDIT]   [⚡ EQUIP]      │  ← two CTAs
└─────────────────────────────┘
```

**Active mold**: highlighted with yellow border + `★ ACTIVE` badge. EQUIP button replaced with checkmark.

**EQUIP** = set as the mold that will fight in your next molt. Persists.

**Stat derivations:**
- AGGRESSION = weighted sum of offensive claws in loadout (MELEE_STRIKE 1.0, RANGED_SHOT 0.85, DASH 0.7) / possible max
- ARMOR = direct from armor tier (Light 33%, Medium 66%, Heavy 100%)
- IQ = model speed score (Haiku/Flash/mini → 95%, Sonnet/4o → 70%, Pro/o1 → 40%) — counterintuitively lower IQ score = slower = worse at this game

**Lightning bolt latency tier** (⚡ = fast, ⚡⚡ = medium, ⚡⚡⚡ = slow):
- Fast: gpt-4o-mini, claude-haiku-4, gemini-2.5-flash-lite → single ⚡
- Medium: gpt-4o, claude-sonnet-4, gemini-2.5-flash → ⚡⚡
- Slow: o1, claude-opus, gemini-pro → ⚡⚡⚡

### Filters

Filter pills at top: `[All] [Melee] [Ranged] [Hybrid] [My Best] [Recently Used]`

Sort dropdown: `Win% ↓` / `Most Used` / `Recently Edited` / `Name A-Z`

---

## Screen 3: MOLD EDITOR (Build Screen)

*Deep configuration. Think: Hearthstone deck builder with Destiny 2 stat panel.*
*Three-column layout on desktop. Stacked panels on mobile (tabs).*

### Desktop Layout (3 columns)

```
← Back to Molds                KITE KING ✏️                    [💾 SAVE]  [▶ TEST IN SANDBOX]

┌──────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────┐
│  CLAW BROWSER    │  │  MOLD CONFIGURATION          │  │  LIVE STATS          │
│                  │  │                              │  │                      │
│ 🔍 [search...]   │  │  Mold Name:  KITE KING       │  │  AGGRESSION          │
│                  │  │                              │  │  ████████░░  82%     │
│ Tabs:            │  │  ─────────────────────       │  │                      │
│ [Claws][Armor]   │  │  CLAWS EQUIPPED (3/6)        │  │  ARMOR RATING        │
│ [Models][Saved]  │  │                              │  │  ██████░░░░  65%     │
│                  │  │  ┌────────────────────────┐  │  │                      │
│ CLAWS:           │  │  │ 👟 QUICK STEP   4e  ✓  │  │  COMPUTE SPEED       │
│                  │  │  │    [can't remove]      │  │  █████████░  88%     │
│ ┌──────────────┐ │  │  └────────────────────────┘  │  │                      │
│ │ ⚔️ IRON FIST │ │  │  ┌────────────────────────┐  │  │  COMPLEXITY          │
│ │ 18e • 22dmg  │ │  │  │ 🎯 SNIPER PROTO 14e  ✓ │  │  3 claws → MEDIUM    │
│ │ Range: 1.5   │ │  │  │    [remove]            │  │  LLM has 3 options   │
│ │ [ADD →]      │ │  │  └────────────────────────┘  │  │  per decision        │
│ └──────────────┘ │  │  ┌────────────────────────┐  │  │                      │
│                  │  │  │ 🛡️ IRON SHELL   10e  ✓ │  │  MATCHUP TIPS        │
│ ┌──────────────┐ │  │  │    [remove]            │  │  ┌──────────────────┐ │
│ │ 🎯 SNIPER P  │ │  │  └────────────────────────┘  │  │ vs MELEE: Stay   │ │
│ │ 14e • 16dmg  │ │  │                              │  │ 4-7 units. Kite. │ │
│ │ Range: 2-10  │ │  │  [+ Add Claw]                │  │ GUARD when they  │ │
│ │ EQUIPPED ✓   │ │  │                              │  │ DASH toward you  │ │
│ └──────────────┘ │  │  ─────────────────────       │  └──────────────────┘ │
│                  │  │  ARMOR                       │  │                      │
│ ┌──────────────┐ │  │                              │  │  TOKEN BUDGET TIP    │
│ │ ⚡ PHASE DASH│ │  │  ○ Light  (1.0x dmg taken)  │  │  Set max_tokens=30   │
│ │ 22e • +15%   │ │  │  ○ Medium (0.9x dmg taken)  │  │  in your model cfg.  │
│ │ Leap 3 units │ │  │  ● Heavy  (0.82x dmg taken) │  │  3 claws = ~20 tok   │
│ │ [ADD →]      │ │  │                              │  │  response target.    │
│ └──────────────┘ │  │  ─────────────────────       │  │                      │
│                  │  │  DIRECTIVE (Brain)           │  └──────────────────────┘
│ ARMOR:           │  │                              │
│ (pick one)       │  │  ┌──────────────────────┐   │
│ ○ Light          │  │  │ You are a ranged      │   │
│ ○ Medium         │  │  │ specialist. ALWAYS    │   │
│ ● Heavy ✓        │  │  │ prioritize RANGED_    │   │
│                  │  │  │ SHOT when dist 2-10.  │   │
│ MODELS:          │  │  │ If enemy < 2: DASH.   │   │
│                  │  │  │ Never retreat to edge.│   │
│ ┌──────────────┐ │  │  │ Never NO_OP.          │   │
│ │ OpenAI       │ │  │  │                       │   │
│ │ gpt-4o-mini  │ │  │  │ [800 chars / 2000]    │   │
│ │ ⚡ FASTEST   │ │  │  └──────────────────────┘   │
│ │ SELECTED ✓   │ │  │                              │
│ └──────────────┘ │  │  Directive Tips:             │
│                  │  │  • Be specific about dist    │
│ ┌──────────────┐ │  │  • Name claws explicitly     │
│ │ Anthropic    │ │  │  • Say "Never NO_OP"         │
│ │ Claude Haiku │ │  │  • Under 200 words → faster  │
│ │ ⚡⚡ FAST    │ │  │                              │
│ │ [SELECT]     │ │  │  ─────────────────────       │
│ └──────────────┘ │  │  MODEL                       │
└──────────────────┘  │  GPT-4o-mini (⚡ Fast)        │
                      │  [Change model →]             │
                      └──────────────────────────────┘
```

### Mobile Layout (tabbed)

Single column, tabs at top: `CLAWS | ARMOR | BRAIN | MODEL | STATS`

Each tab shows one section. SAVE button pinned to bottom.

### Claw Card (in browser panel) — full spec

```
┌─────────────────────────────┐
│ 🎯  SNIPER PROTOCOL         │
│     [RANGED] badge          │
│                             │
│  "Long-range precision.     │
│   Punishes kite-ignorant    │
│   crawlers from afar."      │
│                             │
│  DMG: 16    RANGE: 2-10     │
│  COST: 14e  CD: 0.9s        │
│                             │
│  [EQUIPPED ✓]               │  ← or [+ ADD TO MOLD]
└─────────────────────────────┘
```

Colored header bg by type:
- MOVE: grey
- MELEE: red `#EB4D4B`
- RANGED: cyan `#00E5FF`
- DASH: purple `#5f27cd`
- GUARD: yellow `#FFD600`
- UTILITY: orange `#FF9F1C`

### Complexity Warning System

As you add claws, the right panel updates:

| Claws | Complexity | LLM guidance |
|-------|-----------|--------------|
| 2 | 🟢 LOW — Easy decisions | ~15 token responses |
| 3 | 🟡 MEDIUM — Normal | ~20 token responses |
| 4 | 🟠 HIGH — Hard for LLM | ~25 token responses |
| 5+ | 🔴 OVERLOADED — Expect NO_OPs | Reduce or use smarter model |

Shown as a colored complexity badge + tooltip that updates live.

### TEST IN SANDBOX Button

Clicking "Test in Sandbox" opens a split panel:
- Left: your mold vs. a default "dummy" ranged bot
- Right: your mold config (read-only while running)
- Shows first 20 ticks, then auto-stops with quick stats
- Purpose: validate directive produces sensible JSON actions before real molts

---

## Screen 4: ITEM DETAIL MODAL

*Triggered by clicking any claw card in the editor or marketplace.*
*Full-screen modal overlay. Think MTG card zoom.*

```
┌─────────────────────────────────────────────────────┐
│  ✕                                                  │
│                                                     │
│  [LARGE ICON / ART — full bleed colored bg]         │
│                                                     │
│  [RANGED] badge                                     │
│  SNIPER PROTOCOL                                    │
│                                                     │
│  "Long-range precision targeting. Fires a plasma    │
│   bolt that rewards patience and positioning."      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  STATS                                              │
│  Base Damage:     16                               │
│  Optimal Range:   4–7 units  (+10% dmg)            │
│  Close Range:     2.5–4      (-15% dmg)            │
│  Far Range:       7–10       (-20% dmg)            │
│  Energy Cost:     14                               │
│  Cooldown:        0.9s                             │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  COUNTER GUIDE                                      │
│  ✅ Strong vs: slow melee that can't close gap      │
│  ⚠️ Weak vs:  DASH-heavy crawlers, flankers        │
│  💡 Pair with: GUARD + kite-back directive          │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  IN MARKETPLACE   350 CR                           │
│                                                     │
│  [ADD TO CURRENT MOLD]    [BUY FROM MARKETPLACE]   │
└─────────────────────────────────────────────────────┘
```

---

## Screen 5: THE CAGE (Molt Browser)

*Already specced in lobby-matchmaking-ux.md. Summary here for completeness.*

```
THE CAGE                              [⚡ CREATE TANK]

  [🔍 Enter tank code ___________] [JOIN]

  OPEN TANKS (2)
  ┌────────────────────────────────────────────────┐
  │ 🔴 LIVE  null_protocol's Tank                 │
  │ null_protocol (Ranged / GPT-4o-mini)  vs  ???  │
  │ Waiting for opponent...             [JOIN]     │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ 🔴 LIVE  thekiwi's Tank                       │
  │ iron_vanguard (Melee / Claude Haiku)  vs  ???  │
  │ Waiting for opponent...             [JOIN]     │
  └────────────────────────────────────────────────┘

  LIVE MOLTS (3) — spectate only
  ┌────────────────────────────────────────────────┐
  │ ⚡ iron_vanguard  vs  ghost_runner   Tick 42   │
  │ ████████░░ 72hp  vs  ████░░░░░░ 38hp          │
  │                                   [WATCH]      │
  └────────────────────────────────────────────────┘
```

JOIN → pre-flight screen (confirm your active mold, then enter waiting room)

---

## Screen 6: TANK ROOM (Waiting Room → Battle)

### 6a: Waiting for Opponent

```
┌──────────────────────────────────────────┐
│  YOUR TANK                               │
│                                          │
│  DREADCLAW  (Kite King)                  │
│  GPT-4o-mini • Ranged • Heavy           │
│                                          │
│  Tank code: XRAY-47                      │
│  [Copy Link] [Share]                     │
│                                          │
│  ⏳ Waiting for opponent...             │
│                                          │
│  Invite a friend:                        │
│  > Share code XRAY-47                   │
│  > Or: themoltpit.com/tank/XRAY-47      │
│                                          │
│  [Cancel Tank]                           │
└──────────────────────────────────────────┘
```

### 6b: Opponent Joined — Pre-Molt Countdown

```
┌──────────────────────────────────────────┐
│  DREADCLAW          vs      iron_rush    │
│  (Kite King)              (their mold)   │
│  GPT-4o-mini ⚡           Claude Haiku ⚡│
│  Ranged / Heavy           Melee / Medium │
│                                          │
│  MOLT BEGINS IN  3...                   │
│                                          │
│  [Ready] ✓       [Ready] ✓              │
└──────────────────────────────────────────┘
```

Crawler names shown. Mold type (Ranged/Melee/Hybrid) shown. Model shown. But NOT directive or exact claw list — that's your secret.

---

## Screen 7: POST-MOLT RESULT

*After molt ends. Replaces current KO overlay with more info-dense screen.*

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│         K.O.!                                       │
│                                                     │
│   DREADCLAW WINS                                    │
│   Kite King mold                                    │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  DREADCLAW           vs         iron_rush           │
│  HP:  72 / 100                  HP: 0 / 100         │
│  Dmg: 148                       Dmg: 62             │
│  Illegal: 0                     Illegal: 4          │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  ENGINEERING TELEMETRY                             │
│                                                     │
│  DREADCLAW                      IRON_RUSH           │
│  Avg latency:  89ms             Avg latency:  312ms │
│  Tokens/dec:   22               Tokens/dec:   187   │
│  Ticks missed: 0                Ticks missed: 8     │
│  Queue depth:  2.1 avg          Queue depth:  0     │
│                                                     │
│  +22 CR  •  Rank: #45 → #43                        │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [⚡ REMOLT]   [🔧 EDIT MOLD]   [📋 VIEW REPLAY]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Engineering telemetry is the signature feature — makes this feel like a real engineering game, not a toy.

---

## Full Navigation Flow

```
Landing
  │
  └─ [PLAY NOW] ──► Login/Register
                         │
                         ▼
                    THE FORGE (Home)
                    ┌───────────────────────────────┐
                    │  Active crawler + mold        │
                    │  Recent molts                 │
                    │  Open tanks (quick join)      │
                    │  Incoming challenge banner    │
                    └───────────────────────────────┘
                         │              │
               [FIND A MOLT]    [EDIT MOLD / MY MOLDS]
                    │                   │
                    ▼                   ▼
              THE CAGE             MY MOLDS
           (Tank Browser)          (Collection)
                    │                   │
           [JOIN tank]           [EDIT / NEW MOLD]
                    │                   │
                    ▼                   ▼
              Tank Room            MOLD EDITOR
           (waiting room)        (Claw + Armor +
                    │             Directive + Model)
           [opponent joins]           │
                    │           [TEST IN SANDBOX]
                    ▼
               Molt View
            (3D PlayCanvas)
                    │
                [match ends]
                    │
                    ▼
             Post-Molt Result
           (telemetry + rank delta)
                    │
         [REMOLT / EDIT MOLD / HOME]
```

---

## Priority Build Order

1. **Screen 2: My Molds** — this is the core loop. Build the mold grid + mold editor first.
2. **Screen 3: Mold Editor** — claw selection, armor, directive, model picker. Replace current config panel.
3. **Screen 1: The Forge** — assemble after mold editor works. Uses same data.
4. **Screen 5-6: The Cage + Tank Room** — already partly built, just needs reconnecting.
5. **Screen 7: Post-Molt result** — engineering telemetry is the differentiator. Ship it.

---

## Key Design Principles

1. **Your mold is your identity.** Name it. Style it. Track its win rate. This is Clash Royale deck culture adapted for LLM agents.
2. **Engineering is visible.** Latency, token count, ticks missed — these are front-row stats, not buried. That's the game.
3. **The directive is a first-class feature.** Not a textarea shoved in a corner. It's the "brain" section with tips, character count, and real-time complexity feedback.
4. **Speed signaling everywhere.** ⚡ icons on model selection. Complexity warnings. Token budget tips. The game rewards fast crawlers — UI must constantly reinforce this.
5. **One active mold at a time.** Clear "active" state. One tap to switch. No confusion about which mold is fighting.

---

*For Variant AI: Use screenshots of the landing page for visual style reference. Neo-brutalist: thick black borders, yellow/red/cyan/white palette, Bangers headers, Kanit body. Cards have thick black strokes and hard drop shadows (6px 6px 0 #000). Buttons have 3D depth (box-shadow bottom). All interactive elements feel tactile.*
