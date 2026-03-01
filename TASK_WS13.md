# TASK WS13 — "Holy Fuck" Cinematic Demo

## Mission
Build a standalone `/demo` route — no auth required — that showcases LLM agents fighting in real-time. The experience must feel like watching esports. When Aleks wakes up and opens cogcage.com/demo, he should say "holy fuck".

## Deadline
Morning (8 AM ET, March 1 2026). This runs tonight. Ship it.

## The Core Insight
The unique differentiator of CogCage is watching LLM AIs think and fight. No other game does this. The demo must make **LLM reasoning visible in real-time**. That's the hook that gets people to pay.

## What to Build

### 1. `/demo` Route (no auth required)
- File: `web/app/routes/demo.tsx`
- No auth guard, no redirect, fully public
- URL param: `?seed=12345` for shareable/reproducible battles
- Renders `<CinematicBattle />` component

### 2. `CinematicBattle.tsx` — Full-Screen Experience
Full-screen component (100vw × 100vh, no AppNav, fixed position overlay).

**Layout (desktop):**
```
┌─────────────────────────────────────────────────────┐
│ [BERSERKER HUD]  [ROUND TIMER]  [TACTICIAN HUD]     │
│ HP:████████░░   TICK 042/200    HP:████░░░░░░        │
│ EN:██████░░░░                    EN:██████████        │
├────────────────┬────────────────────────────────────┤
│ BRAIN STREAM   │      THREE.JS ARENA               │  BRAIN STREAM │
│ (left panel)   │   full-screen 3D battle           │  (right panel)│
│                │                                    │               │
│ ▌ thinking...  │   [BERSERKER]   ⚔️   [TACTICIAN]  │ ▌ analyzing..│
└────────────────┴────────────────────────────────────┘
                  [last action feed — 3 lines]
```

**Mobile layout:** Stack vertically. Brain streams collapse to single line at bottom.

### 3. Three.js Arena (the visual wow)

Install: `npm install three @types/three` in `web/`

Build `web/app/components/arena/ArenaCanvas.tsx`:
- Full viewport WebGL canvas (position: fixed, inset: 0, z-index: 0)
- Behind the UI overlay

**Arena environment:**
```typescript
// Background: dark industrial
scene.background = new THREE.Color('#050510')
scene.fog = new THREE.FogExp2('#050510', 0.04)

// Grid floor: 20×20 cells, each cell = 2 world units
// Use GridHelper or custom ShaderMaterial for cyan dot grid
const grid = new THREE.GridHelper(40, 20, '#00E5FF', '#0a0a20')
scene.add(grid)

// Ambient point lights: one cyan, one red, one dim white
const cyanLight = new THREE.PointLight('#00E5FF', 2, 50)
cyanLight.position.set(0, 10, 0)
const redLight = new THREE.PointLight('#EB4D4B', 1, 30)
redLight.position.set(-10, 5, 10)
```

**Crawler geometry (procedural mechs):**
Build two crawlers using simple geometry — no art assets needed:
```typescript
function buildCrawler(color: string): THREE.Group {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ 
    color, 
    metalness: 0.8, 
    roughness: 0.2,
    emissive: color,
    emissiveIntensity: 0.2
  })

  // Body: box
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), mat)
  body.position.y = 0.8
  group.add(body)

  // Head: smaller box with glowing eye
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), mat)
  head.position.set(0.7, 1.0, 0)
  group.add(head)

  // Eye: bright sphere
  const eyeMat = new THREE.MeshStandardMaterial({ 
    color: '#ffffff', emissive: color, emissiveIntensity: 5
  })
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12), eyeMat)
  eye.position.set(0.3, 0, 0.26)
  head.add(eye)

  // 4 legs: rotated cylinders
  const legMat = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.1 })
  const legPositions = [
    [0.4, 0, 0.5], [-0.4, 0, 0.5], [0.4, 0, -0.5], [-0.4, 0, -0.5]
  ]
  for (const [lx, ly, lz] of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2), legMat)
    leg.rotation.z = Math.PI / 4 * (lx > 0 ? 1 : -1)
    leg.position.set(lx * 0.9, 0.3, lz)
    group.add(leg)
  }

  // Weapon appendage
  const weapon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0), mat)
  weapon.rotation.z = Math.PI / 2
  weapon.position.set(0.5, 0.9, 0)
  group.add(weapon)

  return group
}
```

**Crawler colors:**
- BERSERKER: `#EB4D4B` (red/aggressive)
- TACTICIAN: `#00E5FF` (cyan/cool)

**Crawler positions on grid:**
- BERSERKER starts at grid cell (3, 10) → world (-14, 0, 0)
- TACTICIAN starts at grid cell (17, 10) → world (14, 0, 0)
- Convert game position to world: `(pos / UNIT_SCALE - 10) * 2` for each axis

**Animations (using useRef + requestAnimationFrame):**
- Idle: gentle bob up/down (sin wave on y) + leg oscillation
- Walk/Move: translate toward target position over 0.5s
- Attack: quick forward lunge (0.2s) then return
- Hit: flash emissiveIntensity spike (0 → 5 → 0 over 0.3s) + slight knockback
- Death: collapse (rotation.x → PI/2 over 1s, fall to floor)
- Guard: slow pulse on emissiveIntensity

**Attack VFX:**
When MELEE_STRIKE executes:
```typescript
// Particle burst at target position
const particles = new THREE.Points(...)  // 20 point particles
// Explode outward with velocity, fade over 0.5s
```

When RANGED_SHOT executes:
```typescript
// Projectile: bright sphere moving from attacker to target
// 0.2s travel time, then particle burst on hit
```

**Camera:**
- OrbitControls for spectator feel
- Default: `camera.position.set(0, 15, 20)` looking at (0, 0, 0)
- Slight camera shake on heavy hits (add random offset for 0.3s)

### 4. Brain Stream Panels (THE KILLER FEATURE)

This is what makes people say "holy fuck". Show the LLM thinking in real-time.

**New API endpoint:** `web/app/routes/api/agent.decide-stream.ts`

This endpoint calls OpenAI with `stream: true` and returns SSE:
```typescript
// POST /api/agent/decide-stream
// Body: same as /api/agent/decide
// Returns: text/event-stream
// Events: 
//   { type: 'token', delta: '...' }     — LLM token chunk
//   { type: 'decision', action: {...} } — final parsed action
//   { type: 'error', msg: '...' }

// Uses streaming OpenAI API:
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 
    Authorization: `Bearer ${openaiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
    max_tokens: 150,
    temperature: bot.temperature,
    // NO response_format: json_object when streaming — it blocks tokens
  })
})

// Parse SSE from OpenAI, forward tokens as they arrive
// At end, parse accumulated text as JSON to extract action
```

**`BrainStream.tsx` component:**
```tsx
// Shows the live token stream for one bot
// Props: { botName, botColor, tokenStream, lastAction, isThinking }

// Visual design:
// - Dark panel: rgba(0,0,0,0.8), backdrop-filter: blur(8px)
// - Border: 2px solid botColor
// - Header: [BOT NAME] BRAIN — IBM Plex Mono, uppercase, botColor
// - Status: "PROCESSING..." (pulse) or "DECIDED: MELEE_STRIKE" (green flash)
// - Token area: streams text character by character
//   - Current incomplete thought: opacity 0.7, italic
//   - Final decision line: bold, action color, uppercase
// - History: last 3 decisions shown faded

// CRITICAL UX: tokens appear at actual LLM streaming speed
// This feels LIVE because it IS live — the AI is actually thinking
```

**Integration with match runner:**
- Modify `run-match.ts` to call `/api/agent/decide-stream` instead of `/api/agent/decide`
- OR: add a `onTokenStream` callback to `runMatchAsync` that gets called with each token
- BrainStream component subscribes to these callbacks via React state

**Simplified approach (faster to ship):**
The match runs as before (non-streaming). But BEFORE each decision, call the streaming endpoint to get the "thinking" display, then the actual decision is the result. This adds ~100ms but looks amazing.

Actually, even simpler: use the streaming endpoint AS the decision mechanism. When the stream ends, parse the accumulated text for the action. One endpoint, two uses.

### 5. HUD Overlay

`web/app/components/arena/BattleHUD.tsx`:
```tsx
// Fixed position overlay on top of Three.js canvas
// Full viewport, pointer-events: none except for buttons

// Top bar:
// [BOT A NAME] [====HP BAR====] [ROUND/TIMER] [====HP BAR====] [BOT B NAME]

// HP bars: 
// - CSS animated, transition: width 0.2s ease-out
// - Color: green → yellow → red based on %
// - Shake when hit

// Timer/round:
// - Count up from 0:00
// - "ROUND 1" label
// - Tick counter

// Action feed (bottom):
// Last 4 events, newest at top
// Format: "⚔️ BERSERKER → MELEE_STRIKE [💥 -180 HP]"
// Brief fade-in animation
```

### 6. Sound Engine

`web/app/lib/sound.ts` — Web Audio API, no files:
```typescript
const ctx = new AudioContext()

export function playAttackSound(type: 'melee' | 'ranged' | 'guard' | 'dash') {
  // melee: burst of white noise, 0.1s, pitch drops
  // ranged: short high-pitched tone, 0.15s 
  // guard: low hum, 0.3s
  // dash: whoosh (filtered noise sweep), 0.2s
}

export function playHitSound(damage: number) {
  // impact: low thud, pitch based on damage magnitude
}

export function playKOSound() {
  // orchestral-ish: descending tone + reverb tail
}

export function startAmbient() {
  // Low industrial drone: OscillatorNode (sawtooth, 40Hz)
  // Rhythm pulse: short noise burst every 0.5s at low volume
}
```

### 7. Post-Match Cinematic

When match ends, show full-screen overlay:
```
┌────────────────────────────────────────┐
│                                        │
│         ⚡ K.O. ⚡                      │
│                                        │
│      BERSERKER WINS                    │
│      by KNOCKOUT                       │
│                                        │
│  ┌──────────┬───────────┐              │
│  │ BERSERKER│ TACTICIAN │              │
│  │ HP: 340  │ HP: 0     │              │
│  │ Hits: 8  │ Hits: 3   │              │
│  │ Avg: 142 │ Avg: 89   │              │
│  └──────────┴───────────┘              │
│                                        │
│  [⟳ REMATCH]  [BUILD YOUR CRAWLER →]  │
│                                        │
│  Share this battle: copy link button   │
│                                        │
└────────────────────────────────────────┘
```

KO animation:
- Background: radial burst animation (CSS keyframes, white → transparent)
- "K.O." text: slam in from large scale (scale 4 → 1) with bounce
- Winner name: fade up with glow
- Stats: slide in from sides
- Buttons: fade in after 1.5s

### 8. Landing Page CTA

In `MoltPitLanding.jsx`, update the primary CTA to link to `/demo`:
```jsx
// Primary button: "WATCH A BATTLE LIVE →" → href="/demo"  
// Keep secondary "Build Your Crawler" → href="/sign-in"
```

### 9. Shareable Battle Links

In `demo.tsx`, read `?seed` from URL:
```typescript
const search = Route.useSearch()
const seed = search.seed ? parseInt(search.seed) : Date.now()
```

In post-match panel, show:
```
Share this battle:
cogcage.com/demo?seed=12345 [📋 copy]
```

## Implementation Order

1. `/demo` route + `CinematicBattle.tsx` shell (empty) → verify route loads
2. Three.js arena (`ArenaCanvas.tsx`) → verify crawlers render
3. Wire match runner to arena (position updates) → see crawlers move
4. Brain stream panels with mock streaming → verify UX feels right
5. `/api/agent/decide-stream` streaming endpoint → connect real LLM
6. HUD overlay (HP bars, timer, action feed)
7. Sound engine (minimal: attack + hit + KO)
8. Post-match cinematic
9. Landing page CTA update
10. Shareable seed in URL
11. Build (`npm --prefix web run build` — must pass)
12. Commit and push to `feat/ws13-cinematic-demo`
13. Open PR

## Visual Verification (MANDATORY)

After each major piece, take screenshots:
```bash
# Start dev server
cd web && npm run dev &

# Screenshot key states
agent-browser open http://localhost:3000/demo
agent-browser screenshot --full /tmp/demo-loading.png
# Wait for battle to start
agent-browser screenshot --full /tmp/demo-battle.png
# Wait for battle to end
agent-browser screenshot --full /tmp/demo-ko.png
```

Compare screenshots to the layout specs above. If it doesn't look right, fix it before moving on.

## Technical Context

### Framework
- TanStack Start + React + Vite
- Convex backend (but demo doesn't need Convex — standalone)

### Key existing files
- `web/app/components/QuickDemo.tsx` — existing demo component, reference for how match runs
- `web/app/components/MatchView.tsx` — existing match UI (796 lines), reference for battle logic
- `web/app/lib/ws2/run-match.ts` — match runner (calls LLM, advances ticks)
- `web/app/lib/ws2/engine.ts` — deterministic game engine
- `web/app/routes/api/agent.decide.ts` — existing LLM decision endpoint
- `web/app/routes/__root.tsx` — root layout (has font imports)
- `web/app/routes/index.tsx` — landing page
- `web/app/components/MoltPitLanding.jsx` — landing component

### Bot configs (from QuickDemo.tsx — use these exact configs)
```typescript
const BERSERKER: BotConfig = {
  id: 'botA', name: 'BERSERKER',
  systemPrompt: 'You are BERSERKER, an aggressive melee fighter. Rush the enemy. Attack at every opportunity. Never retreat.',
  loadout: ['MOVE', 'MELEE_STRIKE', 'DASH', 'GUARD'],
  armor: 'light', position: { x: 4, y: 10 }, temperature: 0.9,
  brainPrompt: 'Rush the enemy. Attack at every opportunity. Never retreat.'
}
const TACTICIAN: BotConfig = {
  id: 'botB', name: 'TACTICIAN',
  systemPrompt: 'You are TACTICIAN, a defensive ranged fighter. Maintain optimal range. Snipe from distance.',
  loadout: ['MOVE', 'RANGED_SHOT', 'GUARD', 'UTILITY'],
  armor: 'heavy', position: { x: 16, y: 10 }, temperature: 0.3,
  brainPrompt: 'Maintain optimal range. Snipe from distance.'
}
```

### LLM key
- Env var: `VITE_OPENAI_KEY` OR use the server-side key in `/api/agent/decide`
- For streaming: must use server-side key (can't expose in client)
- The streaming endpoint is a TanStack Start API route (runs server-side)
- The OPENAI_API_KEY env var is available server-side (not prefixed with VITE_)

### TanStack Start API route syntax
```typescript
// web/app/routes/api/agent.decide-stream.ts
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/agent/decide-stream')({
  POST: async ({ request }) => {
    // Read body, call OpenAI with stream:true, return SSE Response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // ... forward OpenAI SSE chunks
      }
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  }
})
```

### Styling rules
- NO `@import` in CSS strings — fonts are loaded in `__root.tsx` `<link>` tags
- Bangers, Kanit, IBM Plex Mono are available globally
- Colors: yellow `#FFD600`, red `#EB4D4B`, cyan `#00E5FF`, dark `#1A1A1A`
- Arcade border: `3px solid #000`, shadow: `4px 4px 0 #000`

### Three.js installation
```bash
npm install three @types/three --prefix web
```

### agent-browser for visual verification
```bash
# agent-browser is installed globally
agent-browser open http://localhost:3000/demo
agent-browser screenshot --full /tmp/demo.png
```

## Success Criteria
- [ ] `/demo` loads without auth in any browser
- [ ] Three.js arena renders with two mechanical crawlers
- [ ] Battle starts automatically (BERSERKER vs TACTICIAN)
- [ ] Crawler positions update on arena as game ticks advance
- [ ] Brain stream panels show live LLM token streaming
- [ ] HP bars update in real-time
- [ ] Attack animations visible on Three.js crawlers
- [ ] Sound plays on attacks and KO
- [ ] Post-match overlay shows winner, stats, and rematch button
- [ ] `?seed=12345` produces same battle every time
- [ ] Landing page primary CTA links to `/demo`
- [ ] `npm --prefix web run build` passes
- [ ] Committed and pushed to `feat/ws13-cinematic-demo`
- [ ] PR opened targeting `main`
- [ ] Screenshots taken at key states (loading, mid-battle, KO)

## What NOT to do
- Do NOT put auth guards on `/demo`
- Do NOT use `@import` in CSS strings
- Do NOT use `output: static` mode — TanStack Start uses Vite SSR
- Do NOT skip visual verification with agent-browser
- Do NOT commit without running build first
- Do NOT use complex physics — keep animations simple/CSS where possible

## Report back
When done, commit and push, open PR, then report:
```
WS13 COMPLETE
- PR: [url]  
- Screenshots: [list what was captured]
- Build: PASS/FAIL
- LLM streaming: working / fallback used
- Known issues: [list any]
```
