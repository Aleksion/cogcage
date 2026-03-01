# WS15 — Composable Mold Assembly + Real LLM Battles

## Decision (from Aleks, Mar 1 2026)
Real LLM models drive every crawler. Composable parts system: choose Shell + Claws + Directive + Trait → these compose into the actual system prompt sent to GPT-4o-mini each turn. "Assembling your mold" = building a character from modular pieces.

## Goal
1. Create `parts.ts` — registry of composable parts with stat deltas + prompt fragments
2. Create `MoldBuilder.tsx` — pre-battle UI where you select your 4 parts (slot: shell/claws/directive/trait)
3. Wire demo.tsx — show MoldBuilder first, then start CinematicBattle with composed bot config
4. Opponent gets a random mold (from the same parts) so every battle feels unique
5. Screenshot-verify the MoldBuilder UI looks like the game (dark arena theme, cyan accents), then push PR

## Architecture

### `web/app/lib/ws2/parts.ts`

```ts
export type PartSlot = 'shell' | 'claws' | 'directive' | 'trait'

export interface Part {
  id: string
  slot: PartSlot
  name: string          // ALL CAPS, max 20 chars
  lore: string          // 1 sentence, flavor text
  statDelta: {
    hpBonus?: number    // added to base HP (base is 100)
    armorType?: 'light' | 'medium' | 'heavy'
    damageMultiplier?: number  // e.g. 1.3 = +30% dmg
    speedBonus?: number        // future use
  }
  promptFragment: string      // injected verbatim into composed system prompt
  rarity: 'common' | 'rare' | 'legendary'
  color: string               // hex, for card accent
}
```

**Shell (3 options):**
- `exo-plating` / EXO-PLATING / common / `#4CAF50`
  - `{ hpBonus: 30, armorType: 'heavy' }`
  - lore: "Reinforced chitin plating absorbs punishment and never yields."
  - promptFragment: "You are heavily armored with 130 HP. You can absorb punishment — prioritize advancing and trading blows. Never retreat; your armor is your advantage."

- `phase-silk` / PHASE SILK / rare / `#9C27B0`
  - `{ hpBonus: 0, armorType: 'light' }` (but 15% damage reduction passive)
  - lore: "Near-invisible membrane scatters energy before it reaches your core."
  - promptFragment: "You have light armor but energy-scattering silk that reduces incoming damage. Stay mobile, flank aggressively, and strike from unexpected angles."

- `reactive-mesh` / REACTIVE MESH / rare / `#FF9800`
  - `{ hpBonus: 10, armorType: 'medium' }`
  - lore: "Pain signals trigger automatic counter-aggression subroutines."
  - promptFragment: "Your reactive mesh retaliates automatically when struck. After every hit you take, immediately counter-attack. Punish aggression with aggression."

**Claws (3 options):**
- `crusher-claws` / CRUSHER CLAWS / common / `#F44336`
  - `{ damageMultiplier: 1.4 }`
  - lore: "Hydraulic chelipeds capable of dismembering exoskeletons."
  - promptFragment: "Your crushing claws deal massive damage on a direct hit. Prefer MELEE_STRIKE. Patience — wait for close range, then deliver one overwhelming blow."

- `rending-talons` / RENDING TALONS / rare / `#FF5722`
  - `{ damageMultiplier: 1.1 }` (+ stacking DoT, future)
  - lore: "Serrated tips that stack bleeding wounds with each pass."
  - promptFragment: "Your talons stack lacerations with every strike. Prioritize landing repeated hits over single big blows. Move fast, attack often."

- `shock-pincers` / SHOCK PINCERS / legendary / `#00E5FF`
  - `{ damageMultiplier: 1.0 }` (+ stun chance)
  - lore: "Electrostatic discharge can lock joints and short circuits."
  - promptFragment: "Your shock pincers can paralyze. Use RANGED_SHOT to soften targets first, then close with MELEE_STRIKE when they're stunned. Combine range and melee."

**Directive (4 options — core LLM personality):**
- `berserker-directive` / BERSERKER / common / `#F44336`
  - lore: "Pure aggression. Every tick is an attack window."
  - promptFragment: "DIRECTIVE: BERSERKER. Close distance every turn. Attack at every opportunity. Never guard. Never retreat. Pain is just data."

- `tactician-directive` / TACTICIAN / common / `#2196F3`
  - lore: "Strategic patience. Strike only when the odds favor you."
  - promptFragment: "DIRECTIVE: TACTICIAN. Analyze range before acting. Guard when energy is low. Strike only when you have positional or range advantage."

- `ambush-directive` / AMBUSH PREDATOR / rare / `#9C27B0`
  - lore: "Stillness before the kill. Explosive when the moment arrives."
  - promptFragment: "DIRECTIVE: AMBUSH. Stay at medium range. Guard and reposition until the enemy is low HP or overextended. Then strike decisively."

- `swarm-directive` / SWARM MIND / legendary / `#FFD600`
  - lore: "Chaotic movement that overwhelms pattern-matching defenses."
  - promptFragment: "DIRECTIVE: SWARM. Move erratically — never predictable. Attack from multiple angles. Dash frequently. Your unpredictability is your weapon."

**Trait (3 options):**
- `adrenaline` / ADRENALINE CORE / common / `#FF4444`
  - lore: "Critical HP triggers overdrive aggression protocols."
  - promptFragment: "TRAIT: When your HP drops below 40%, ignore your directive — go full BERSERKER. Attack relentlessly. Death means nothing now."

- `regenerator` / CELL REGEN / rare / `#00C853`
  - lore: "Slow metabolic repair between combat pulses."
  - promptFragment: "TRAIT: You regenerate 3 HP per decision window. Factor this into your strategy — sometimes guarding to regen is the correct choice."

- `anticipator` / ANTICIPATOR / legendary / `#FFD600`
  - lore: "Predictive combat model reads enemy intent before execution."
  - promptFragment: "TRAIT: Before each action, reason briefly about what the opponent will do next. Counter their likely action rather than just reacting to past events."

### `composeMold(parts: Part[]): BotConfig fields`

```ts
export function composeMold(
  parts: Part[],
  botId: string,
  botName: string,
  position: {x: number, y: number},
  temperature?: number,
): BotConfig {
  const BASE_SYSTEM = `You are ${botName}, a combat crawler in a gladiatorial arena. The arena is a 20x20 grid. Each turn you receive game state and must output ONE action as JSON: {"action":{"type":"MOVE","dir":"N"}} or {"action":{"type":"MELEE_STRIKE","targetId":"botB"}} or {"action":{"type":"RANGED_SHOT","targetId":"botB"}} or {"action":{"type":"GUARD"}} or {"action":{"type":"DASH","dir":"NE"}}. Output ONLY the JSON. No prose.`
  
  const fragments = ['shell', 'claws', 'directive', 'trait']
    .map(slot => parts.find(p => p.slot === slot)?.promptFragment)
    .filter(Boolean)
    .join('\n')
  
  const directive = parts.find(p => p.slot === 'directive')
  const shell = parts.find(p => p.slot === 'shell')
  const claws = parts.find(p => p.slot === 'claws')
  
  const loadout: string[] = ['MOVE', 'GUARD']
  if (claws?.id === 'shock-pincers') loadout.push('RANGED_SHOT')
  loadout.push('MELEE_STRIKE')
  loadout.push('DASH')
  
  const armorType = shell?.statDelta.armorType ?? 'medium'
  const hpBonus = shell?.statDelta.hpBonus ?? 0  // NOTE: engine doesn't support variable HP yet — store for display only
  
  return {
    id: botId,
    name: botName,
    systemPrompt: `${BASE_SYSTEM}\n\n${fragments}`,
    brainPrompt: directive?.promptFragment ?? 'Fight to win.',
    loadout,
    armor: armorType,
    position,
    temperature: temperature ?? 0.7,
  }
}

export function randomMold(): Part[] {
  const slots: PartSlot[] = ['shell', 'claws', 'directive', 'trait']
  return slots.map(slot => {
    const options = PARTS.filter(p => p.slot === slot)
    return options[Math.floor(Math.random() * options.length)]
  })
}
```

### `web/app/components/MoldBuilder.tsx`

Full-screen dark arena background (`radial-gradient(ellipse at 50% 20%, #0a0a2e 0%, #050510 60%, #000 100%)`). Cyan dot grid overlay.

Layout:
```
[FORGE YOUR MOLD]     ← Bangers, yellow, 48px, centered

[YOUR CRAWLER NAME]   ← input, monospace, cyan border, center

4 rows × 3 cards:

ROW: SHELL ─────────────────────────────
  [EXO-PLATING ★]  [PHASE SILK]  [REACTIVE MESH]
  
ROW: CLAWS ─────────────────────────────
  [CRUSHER CLAWS ★]  [RENDING TALONS]  [SHOCK PINCERS ⚡]
  
ROW: DIRECTIVE ──────────────────────────
  [BERSERKER ★]  [TACTICIAN]  [AMBUSH PREDATOR]  [SWARM MIND ⚡]
  
ROW: TRAIT ──────────────────────────────
  [ADRENALINE CORE ★]  [CELL REGEN]  [ANTICIPATOR ⚡]

[─── OPPONENT: RANDOM MOLD ───]         ← faded label, don't show opponent config

[ENTER THE PIT →]                       ← big yellow Bangers button
```

Part card style:
- Background: `rgba(0,0,0,0.6)`, border `1px solid rgba(255,255,255,0.1)`
- Selected: border `2px solid <part.color>`, background `rgba(<part.color-rgb>,0.15)`, glow shadow
- Rarity badge: "COMMON" / "RARE" / "LEGENDARY" — small mono text top-right of card
- Name: Bangers, 16px, white
- Lore: mono, 11px, `rgba(255,255,255,0.5)`, 2 lines max, truncate

Props:
```ts
interface MoldBuilderProps {
  onConfirm: (playerMold: Part[], opponentMold: Part[], playerName: string) => void
}
```

Default selections: one common from each slot pre-selected so you can immediately hit ENTER.

### Changes to `demo.tsx`

Add phase state: `'build' | 'battle'`

```tsx
function DemoPage() {
  const [phase, setPhase] = useState<'build' | 'battle'>('build')
  const [playerMold, setPlayerMold] = useState<Part[] | null>(null)
  const [opponentMold, setOpponentMold] = useState<Part[] | null>(null)
  const [playerName, setPlayerName] = useState('CRAWLER-1')

  if (phase === 'build') {
    return <MoldBuilder onConfirm={(pm, om, name) => {
      setPlayerMold(pm)
      setOpponentMold(om)
      setPlayerName(name)
      setPhase('battle')
    }} />
  }
  
  return <CinematicBattle
    seed={seed}
    playerMold={playerMold}
    opponentMold={opponentMold}
    playerName={playerName}
  />
}
```

### Changes to `CinematicBattle.tsx`

Add props:
```ts
interface Props {
  seed?: number
  playerMold?: Part[] | null
  opponentMold?: Part[] | null
  playerName?: string
}
```

Replace hardcoded `BERSERKER` / `TACTICIAN` constants with:
```ts
const playerBot = composeMold(
  playerMold ?? DEFAULT_PLAYER_MOLD,
  'botA',
  playerName ?? 'YOUR CRAWLER',
  { x: 4, y: 10 },
  0.8,
)
const opponentBot = composeMold(
  opponentMold ?? DEFAULT_OPPONENT_MOLD,
  'botB',
  'OPPONENT',
  { x: 16, y: 10 },
  0.7,
)
```

Define default molds as constants (can be the common-all defaults):
```ts
const DEFAULT_PLAYER_MOLD = [
  PARTS.find(p => p.id === 'exo-plating')!,
  PARTS.find(p => p.id === 'crusher-claws')!,
  PARTS.find(p => p.id === 'berserker-directive')!,
  PARTS.find(p => p.id === 'adrenaline')!,
]
const DEFAULT_OPPONENT_MOLD = [
  PARTS.find(p => p.id === 'phase-silk')!,
  PARTS.find(p => p.id === 'rending-talons')!,
  PARTS.find(p => p.id === 'tactician-directive')!,
  PARTS.find(p => p.id === 'regenerator')!,
]
```

## Success Criteria
1. `/demo` page first shows MoldBuilder — 4 rows of part cards, default selections active
2. Hit "ENTER THE PIT" → battle starts immediately with composed system prompts
3. In the battle view, left/right panels show `botName` from the composed mold (not hardcoded "BERSERKER"/"TACTICIAN")
4. LLM reasoning streams into the brain panels (already works — just verify it still fires)
5. Screenshot of MoldBuilder confirms dark arena theme, cyan accents, 4 rows of cards
6. Screenshot of battle running with your custom mold name
7. Push PR to `feat/ws15-composable-molds` from WS14 base

## Branch
- Base off: `feat/ws14-lobster-mecha` (PR #40 branch, so WS15 builds on top of the lobster arena)
- Create: `git checkout -b feat/ws15-composable-molds`

## Dev Setup
```bash
cd web
cp /Users/thealeks/clawd-engineer/projects/cogcage/repo/web/.env.local .env.local 2>/dev/null || true
# OPENAI_API_KEY must be in .env.local for real LLM calls to work
npm install
npm run dev
# Visit http://localhost:3000/demo
```

## Visual Verification (MANDATORY before push)
```bash
# Screenshot MoldBuilder
agent-browser open http://localhost:3000/demo
agent-browser screenshot --full /tmp/mold-builder.png
# Screenshot battle (after clicking ENTER THE PIT)
agent-browser screenshot --full /tmp/battle-running.png
```
Both screenshots must look correct before pushing PR.

## Notes
- The `armor` field in BotConfig maps to `'light' | 'medium' | 'heavy'` — engine uses this for damage reduction
- The engine's HP is fixed at 100 (from `createActorState`) — `hpBonus` is display-only for now (shows on the card, adds to label e.g. "130 HP" in mold builder)
- Temperature per directive: berserker=0.9, tactician=0.3, ambush=0.5, swarm=0.85
- Font rule: ALL game fonts added in `__root.tsx` `<link>` tag — Space Grotesk, Bangers, IBM Plex Mono
