# TASK: BattleHero Animated Component

## Objective
Build `web/src/components/BattleHero.jsx` — an animated battle graphic for The Molt Pit landing page.
Replace the existing `<BotCard />` in the hero-visual section with `<BattleHero />`.

## Visual Layout
```
[ LOBSTER HERO ]  ⚡ VS ⚡  [ ROBOT RUMBLE-V4 ]
   (left side)   (center)    (right side)
```

## Characters

### Left — Lobster Hero "THE MOLT"
- **CSS art** (no images) — build from divs/spans
- Large red lobster claws on both sides (the defining feature)
- Body: rounded red oval
- Eyes: two black dots on stalks
- Tail: segmented fan at bottom
- Color: `#FF3333` (red), `#CC2200` (dark red shading)
- Animations:
  - Claws slowly open/close in a pinching motion (CSS keyframes)
  - Periodic "molt glow" — full body pulses with orange/gold outer glow every 4s (represents shedding shell, gaining new armor)
  - Slight bounce idle animation

### Right — Robot "RUMBLE-V4"
- Enhanced version of existing BotCard (same design language)
- Red header bar with two glowing cyan eyes (`.eye` dots)
- Body with stat bars: Aggression 92% (red), Armor 65% (yellow), Compute Speed 88% (cyan)
- Terminal log at bottom cycling through messages
- Animations:
  - Eyes pulse/blink
  - Stat bars animate in on mount (width 0 → final value)
  - Terminal text types out new lines every 2s

### Center — VS Badge
- Bold "VS" text in white
- Lightning bolt icons (⚡) on each side
- Pulsing scale animation (1.0 → 1.1 → 1.0, 1s loop)
- Occasional "CLASH!" flash effect

## Design Language (match existing landing page)
```css
--c-red: #FF3333
--c-yellow: #FFD700
--c-cyan: #00E5FF
--c-dark: #1a1a1a
--c-white: #FFFFFF
font: 'Barlow Condensed', Impact, sans-serif (bold italic)
borders: 3-4px solid black
shadows: 4-6px offset black drop shadows
background: diagonal stripe pattern (#f5f5f5 with subtle lines)
```

## Component API
```jsx
// No props needed — self-contained
export default function BattleHero() { ... }
```

## Integration
In `web/src/components/MoltPitLanding.jsx`:
1. Add import at top: `import BattleHero from './BattleHero.jsx';`
2. Find the hero-visual section (search for `className="hero-visual"`)
3. Replace `<BotCard />` with `<BattleHero />`

## Style Requirements
- Self-contained — all styles as a `<style>` tag or inline (do NOT import external CSS files)
- Responsive: works on mobile (stack vertically on <600px)
- No external dependencies beyond React (already in project)
- Smooth 60fps animations

## Terminal Messages (cycle through these on robot side)
```
> SYSTEM: TARGET ACQUIRED
> LOGIC: FLANK_LEFT  
> STATUS: CHARGING CANNON...
> THREAT: SHELL DETECTED
> COUNTER: DEPLOY EMP...
> STATUS: AWAITING MOLT CYCLE
```

## Lobster Terminal (below lobster, smaller)
```
> SHELL: HARDENING...
> CLAWS: ONLINE
> MOLT CYCLE: READY
> STATUS: ENTERING PIT...
```

## Done When
- `BattleHero.jsx` exists and renders both characters + VS badge
- Animations run smoothly
- Integrated into landing page hero section (replaces BotCard)
- No TypeScript errors or import failures
- Looks great on desktop and mobile

## Branch
`feat/molt-battle-hero` (already checked out at repo root)
