# TASK: Armory System — Persistent Card-Based Loadout Builder

## Goal
Build a visually compelling card-based armory system where players:
1. Browse a pool of ~27 cards (weapons, armor, tools)
2. Build loadouts by slotting cards (max 6 slots)
3. Save loadouts to their persistent player account (Redis, keyed by UUID cookie)
4. Pick a saved loadout when entering an arena session

## Player Identity (no auth required)
- On first visit: generate `playerId = crypto.randomUUID()`
- Set as a cookie named `cogcage_pid` (max-age: 1 year, path: /)
- All armory data keyed by this ID in Upstash Redis
- Client also stores in localStorage as fallback
- Middleware file: `web/src/middleware.ts` — generate + set cookie if missing

## Card Data Model

### Card Types
```typescript
type CardType = 'weapon' | 'armor' | 'tool';
type WeaponRange = 'melee' | 'ranged';

interface Card {
  id: string;           // kebab-case slug
  name: string;
  type: CardType;
  subtype?: WeaponRange;
  icon: string;         // emoji or short ASCII art label
  flavorText: string;   // short tagline
  stats: {
    damage?: number;    // weapons only (0-60)
    defense?: number;   // armor only (0-40, % dmg reduction)
    weight: number;     // 1-8, adds to total loadout weight
    overhead: number;   // 0-3, tools add LLM context cost per turn
    energyCost?: number; // energy per use (15-40)
    range?: number;     // cells (melee=1, ranged=2-5)
  };
  pros: string[];       // 1-2 bullets
  cons: string[];       // 1-2 bullets
  rarity: 'common' | 'rare' | 'legendary';
}
```

### The Full Card Pool (27 cards)

#### WEAPONS — 10 cards
```
id: 'shortsword'    name: 'Shortsword'      dmg:25 wt:2 energy:18 range:1 melee
  pros: Fast swing, low energy | cons: Adjacent only, low damage ceiling
  flavor: "Close and personal."

id: 'greatsword'    name: 'Greatsword'      dmg:45 wt:5 energy:28 range:1 melee
  pros: High damage, threatens 2 cells | cons: Heavy, slow follow-up
  flavor: "Overkill is underrated."

id: 'dagger'        name: 'Dagger'          dmg:15 wt:1 energy:12 range:1 melee
  pros: Near-weightless, fast cooldown | cons: Lowest damage in class
  flavor: "Stab first, think later."

id: 'combat-axe'    name: 'Combat Axe'      dmg:35 wt:4 energy:22 range:1 melee
  pros: Ignores 10% armor | cons: High weight
  flavor: "Armor? What armor."

id: 'crossbow'      name: 'Crossbow'        dmg:30 wt:3 energy:20 range:3 ranged
  pros: Safe engagement range | cons: Reload turn on heavy use
  flavor: "Distance is safety."

id: 'sniper-rifle'  name: 'Sniper Rifle'    dmg:50 wt:4 energy:35 range:5 ranged
  pros: Maximum range, massive damage | cons: Cannot fire adjacent
  flavor: "They never see it coming."

id: 'shotgun'       name: 'Shotgun'         dmg:35 wt:3 energy:22 range:2 ranged
  pros: Spread damage, punishing at close range | cons: Falls off past 2 cells
  flavor: "Spread the love."

id: 'plasma-cannon' name: 'Plasma Cannon'   dmg:60 wt:7 energy:40 range:4 ranged
  pros: Highest single-hit damage | cons: Extremely heavy, high energy cost
  flavor: "Subtlety is for cowards."

id: 'chain-whip'    name: 'Chain Whip'      dmg:20 wt:2 energy:16 range:2 melee
  pros: Melee with 2-cell reach | cons: Moderate damage only
  flavor: "Reach out and touch someone."

id: 'arc-blade'     name: 'Arc Blade'       dmg:30 wt:3 energy:24 range:1 melee
  pros: Hits all adjacent cells | cons: High energy cost for AoE
  flavor: "Everyone gets a turn."
```

#### ARMOR — 7 cards
```
id: 'light-vest'        name: 'Light Vest'         defense:15 wt:1 overhead:0
  pros: Near-zero weight penalty | cons: Minimal protection
  flavor: "Better than nothing."

id: 'chainmail'         name: 'Chainmail'           defense:25 wt:3 overhead:0
  pros: Solid protection | cons: Moderate weight
  flavor: "Tested by ten thousand swords."

id: 'heavy-plate'       name: 'Heavy Plate'         defense:40 wt:6 overhead:0
  pros: Maximum damage reduction | cons: Severe movement penalty
  flavor: "A walking fortress."

id: 'reactive-shield'   name: 'Reactive Shield'     defense:20 wt:2 overhead:0
  pros: Stored energy: +15% dmg after taking a hit | cons: Only activates on hit
  flavor: "Pain is fuel."

id: 'ablative-coating'  name: 'Ablative Coating'    defense:30 wt:2 overhead:0
  pros: High protection, degrades per hit (3 charges) | cons: Expires mid-fight
  flavor: "Temporary invincibility is still invincibility."

id: 'kinetic-absorber'  name: 'Kinetic Absorber'    defense:20 wt:4 overhead:0
  pros: Converts 20% of damage taken into energy | cons: Heavy for its protection
  flavor: "Every hit charges the next attack."

id: 'cloak-weave'       name: 'Cloak Weave'         defense:10 wt:1 overhead:0
  pros: Reduces enemy hit chance by 20% | cons: Low raw protection
  flavor: "Can't hit what they can't see."
```

#### TOOLS — 10 cards
```
id: 'scanner'       name: 'Scanner'         wt:0 overhead:1
  pros: Reveals full enemy loadout in context | cons: +1 LLM context overhead
  flavor: "Know your enemy."

id: 'tactical-hud'  name: 'Tactical HUD'    wt:0 overhead:2
  pros: Predicted enemy move shown in LLM context | cons: +2 overhead
  flavor: "Reading the future, one frame ahead."

id: 'overclock'     name: 'Overclock'       wt:0 overhead:2
  pros: +30% energy regen for 3 turns | cons: Crashes after (1 turn 0 regen)
  flavor: "Red line it."

id: 'medkit'        name: 'Medkit'          wt:1 overhead:1
  pros: Restore 25hp once per match | cons: Single use
  flavor: "One-time insurance policy."

id: 'emp-pulse'     name: 'EMP Pulse'       wt:1 overhead:2
  pros: Drain 30 energy from target | cons: Single use, short range
  flavor: "Lights out."

id: 'smoke-screen'  name: 'Smoke Screen'    wt:0 overhead:1
  pros: Enemy accuracy -30% for 2 turns | cons: Short duration
  flavor: "Fog of war, by choice."

id: 'hack-module'   name: 'Hack Module'     wt:1 overhead:3
  pros: Attempt to override 1 enemy action per match | cons: Heavy context cost
  flavor: "Your moves are my moves."

id: 'battle-stim'   name: 'Battle Stim'     wt:0 overhead:2
  pros: +25% damage for 3 turns | cons: Costs 15hp to activate
  flavor: "Pain as a performance enhancer."

id: 'repair-drone'  name: 'Repair Drone'    wt:2 overhead:2
  pros: Passive +5hp regen per turn | cons: Weight + context cost
  flavor: "Heal over time. Stay aggressive."

id: 'threat-matrix' name: 'Threat Matrix'   wt:0 overhead:3
  pros: Full tactical analysis in LLM context each turn | cons: Heaviest overhead
  flavor: "Information is the only weapon that never runs out."
```

## Loadout Mechanics

### Stat Calculations
```
totalWeight = sum(card.stats.weight) for all cards in loadout
moveSpeed = Math.max(1, 4 - Math.floor(totalWeight / 4))  // action cost per move, base 4
  → weight 0-3:  moveSpeed 4 (normal)
  → weight 4-7:  moveSpeed 3 (faster? No — HIGHER cost means SLOWER)
  Actually: moveCost = 4 + Math.floor(totalWeight / 3)  // base 4e, +1e per 3 weight

totalOverhead = sum(card.stats.overhead) for tool cards
complexityTier = overhead 0-2: 'lean' | 3-5: 'tactical' | 6-8: 'heavy' | 9+: 'overloaded'
  → LLM prompt grows with overhead, higher chance of suboptimal play at 9+

armorValue = sum(card.stats.defense) for armor cards (cap at 60%)
damageMultiplier = 1.0 - (armorValue / 100) applied to INCOMING damage
```

### Loadout Slots
- Max 6 card slots
- Max 1 armor card
- Unlimited weapons + tools within the 6-slot limit
- Total weight displayed as a bar (green → yellow → red)
- Total overhead displayed as a complexity bar

## API Routes

### `web/src/middleware.ts`
Astro middleware — runs on every request:
- Check cookie `cogcage_pid`
- If missing: generate UUID, set cookie (1yr, path=/, samesite=lax)
- Attach `playerId` to `locals.playerId`

### `GET /api/armory` → `web/src/pages/api/armory/index.ts`
- Reads `cogcage_pid` cookie
- Fetches loadouts from Redis key `armory:{playerId}`
- Returns `{ loadouts: SavedLoadout[] }`

### `POST /api/armory` → save loadout
- Body: `{ name: string, cards: string[] }` (card IDs)
- Validates: max 6 cards, max 1 armor, all IDs valid
- Saves to Redis: `armory:{playerId}` as JSON array
- Returns updated `{ loadouts: SavedLoadout[] }`

### `DELETE /api/armory/:loadoutId`
- Removes loadout from player's list
- Returns updated `{ loadouts: SavedLoadout[] }`

### Redis Schema
```
Key: "armory:{playerId}"
Value: JSON array of SavedLoadout:
  {
    id: string (uuid)
    name: string
    cards: string[]  // card IDs
    createdAt: number
    stats: { totalWeight, totalOverhead, armorValue }
  }
TTL: 90 days
```

## Pages & Components

### `/armory` page — `web/src/pages/armory.astro`
Two-panel layout:
- **Left panel**: Card Gallery — all 27 cards, filterable by type (All / Weapons / Armor / Tools)
- **Right panel**: Loadout Builder — your current in-progress loadout (drag or click to add/remove)
- **Bottom**: Your Saved Loadouts — up to 10 saved configs as compact cards

### Card Component `web/src/components/cards/Card.tsx`
Visual design (CRITICAL — must look amazing):
- Size: 120×180px (portrait card)
- Background: dark gradient `#0f0f0f → #1a1a1a`
- Border: 2px solid, glowing by type:
  - weapon: `#eb4d4b` (red) with `box-shadow: 0 0 12px #eb4d4b66`
  - armor: `#00e5ff` (cyan) with `box-shadow: 0 0 12px #00e5ff66`
  - tool: `#7c3aed` (violet) with `box-shadow: 0 0 12px #7c3aed66`
- Corner badge: rarity dot (common=gray, rare=yellow, legendary=gradient)
- Top strip: type label in type color, all caps, small font, bold
- Icon area (center, ~50px tall): large emoji or SVG icon
- Name: bold, white, 0.85rem, center
- Flavor text: italic, dim, 0.65rem, center, 2 lines max
- Stats footer (bottom 36px):
  - 3 mini stat icons in a row: ⚔️dmg / 🛡def / ⚖️wt / ⚡energy
  - Show relevant stats only (weapon shows dmg+wt+energy, armor shows def+wt, tool shows overhead+wt)
- Hover: scale(1.08), glow intensifies, z-index up
- Selected/in-loadout: yellow border `#FFD600`, checkmark overlay top-right
- Disabled (can't add): opacity 0.4, cursor not-allowed

### Loadout Builder Panel
- Slot grid: 6 slots, each 80×100px
- Empty slot: dashed border, "+" icon, dim
- Filled slot: mini card preview (icon + name only)
- Stats summary below slots:
  - Weight bar (0-20+): `[████░░] 8 / heavy`
  - Complexity bar (0-9+): `[███░░░] 4 / tactical`
  - Armor: `25% reduction`
- "Save Loadout" button: disabled until name entered
- Name input field

### Saved Loadouts (compact card strip)
- Horizontal scroll, each saved loadout shown as:
  - Name in Bangers font
  - 6 mini slot icons
  - Stats summary (weight, complexity)
  - "Enter Arena" button → creates session with this loadout pre-filled
  - "×" delete button

## Wiring to Arena

### Update Play.tsx
When "Create Session" is clicked, if a loadout is selected:
- Pass `cards: string[]` in the session creation body
- Pre-fill the bot config with the loadout's cards (mapped to ACTION_TYPES)
- Pre-calculate moveCost from totalWeight and pass to match-runner

### Update `BotConfig` (match-runner.ts)
```typescript
interface BotConfig {
  // ...existing...
  moveCost?: number;  // energy cost per MOVE action (default 4, increases with weight)
}
```

### Update engine.js / action resolution
In the MOVE action handler: use `botConfig.moveCost` instead of hardcoded 4.

## Visual Reference
- Card aesthetic: dark MTG/Slay the Spire meets fighting game
- Color palette: same as game (`#FFD600` yellow, `#EB4D4B` red, `#00E5FF` cyan, `#1A1A1A` dark)
- Cards should feel like ITEMS in a fighting game inventory, not UI widgets
- Fonts: Bangers for names/headings, Kanit for stats, IBM Plex Mono for numbers

## Implementation Order
1. `web/src/lib/cards.ts` — card data (all 27)
2. `web/src/middleware.ts` — playerId cookie
3. `web/src/lib/armory.ts` — Redis CRUD
4. API routes (armory GET/POST/DELETE)
5. `Card.tsx` component with full visual polish
6. `/armory` page (gallery + builder + saved loadouts)
7. Wire to arena (pass loadout to session, moveCost to engine)
8. `npm --prefix web run build` — must pass clean
9. `git add -A && git commit -m "feat(armory): card-based loadout system with Redis persistence" && git push origin main`

## Success Criteria
- `/armory` page loads and shows all 27 cards in the gallery
- Can build a 6-card loadout, see weight/complexity stats update live
- Save loadout → appears in "Saved Loadouts" strip
- Refresh page → loadouts still there (Redis persistence confirmed)
- "Enter Arena" from saved loadout → pre-fills the session bot config
- Build passes clean: `npm --prefix web run build`
- Looks visually incredible — dark cards with glowing type borders

## Repo
- Path: `/Users/thealeks/clawd-engineer/projects/cogcage/repo`
- Web subdir: `web/`
- Build: `npm --prefix web run build`
- Push directly to main
- Upstash Redis already configured (env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- Existing patterns to follow: `web/src/lib/session.ts` (Redis usage), `web/src/components/Play.tsx` (style injection pattern)
