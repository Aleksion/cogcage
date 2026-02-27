# WS7: PlayCanvas 3D Renderer Spec
**Mission:** `501b789e` | **Priority:** P0 for visual demo | **Owner:** WS7

---

## Vision

Replace the current Phaser 2D top-down grid with a **PlayCanvas 3D isometric arena**.

Reference: Robostorm on playcanvas.com — industrial cage environment, isometric camera angle, particle effects on combat, real-time shadows.

This is the visual identity of The Molt Pit. The game should feel like Real Steel / F1 for AI — not a board game.

---

## Technical Constraints

- **Package:** `@playcanvas/engine` npm — NOT the cloud editor. Standalone engine only.
- **Framework:** Astro + React. PlayCanvas mounts into a `<canvas>` via `useRef`.
- **Renderer-agnostic engine:** `web/src/lib/ws2/engine.ts` + `match-runner.ts` emit `MatchSnapshot` objects. The PlayCanvas renderer reads those snapshots and drives visuals. No changes to game logic.
- **CSS grid fallback:** Keep the existing CSS grid. If PlayCanvas fails to load, fall back silently.
- **Build must stay clean:** `npm --prefix web run build` must pass.

---

## What to Build

### 1. PlayCanvas Scene Component (`web/src/lib/ws2/PlayCanvasScene.ts`)

A class that:
- Mounts into a given `<canvas>` element
- Creates a PlayCanvas application with WebGL renderer
- Sets up isometric camera (45° pitch, looking down-right)
- Builds the arena floor
- Creates crawler entities
- Accepts `MoltSnapshot` updates and drives entity positions/FX

```typescript
export class PlayCanvasScene {
  constructor(canvas: HTMLCanvasElement) { ... }
  update(snapshot: MoltSnapshot): void { ... }
  destroy(): void { ... }
}
```

### 2. Arena Floor

- 20×20 grid of flat tile meshes (1×0.1×1 box, dark grey `#1A1A1A`)
- Thin grid lines via material or edge highlight
- Objective zone center: 5×5 tile area glowing yellow (`#FFD600` emissive) 
- Arena boundary walls: low flat box meshes around edges
- Industrial aesthetic: slight roughness, metallic accents

### 3. Crawler Entities

Two crawlers: Alpha (Green / `#2ecc71`) and Beta (Red / `#eb4d4b`)

For Friday skeleton: Simple geometric shapes
- Body: upright box (0.6×0.8×0.6) with team color material
- "Head": smaller box on top (0.4×0.3×0.4) rotated to face movement direction
- No rigging/animation needed for Friday — smooth position tweening is enough

Movement:
- When grid position changes, tween entity to new position over 150ms
- Smooth lerp, not instant teleport

Facing:
- Rotate body to face last move direction

### 4. Particle Systems

Per-event FX triggered from `MatchSnapshot.newEvents` (or `snapshot.state.events`):

| Event type | FX | Color | Duration |
|-----------|-----|-------|----------|
| `MELEE_STRIKE` hit | Burst particle spray from target position | Orange/red `#ff6b35` | 400ms |
| `RANGED_SHOT` hit | Directional plasma streak from attacker to target + small burst | Cyan `#00e5ff` | 300ms |
| `GUARD` active | Shield ring around crawler | White `#ffffff` pulsing | 600ms |
| `DASH` start | Speed trail behind crawler | Team color fading | 400ms |
| Crawler KO | Large burst + screen flash + particles | Team color + white | 1200ms |

Use PlayCanvas `ParticleSystemComponent` or simple `MeshInstance` pools for simpler FX.

### 5. HUD Overlay (HTML, not PlayCanvas)

Keep the existing React HP bars, energy bars, and event feed BELOW the PlayCanvas canvas. PlayCanvas handles only the 3D arena. React handles all UI chrome.

The arena area in `Play.tsx` should:
```tsx
<div style={{ position: 'relative', width: '100%', height: '560px' }}>
  <canvas ref={playCanvasRef} style={{ width: '100%', height: '100%' }} />
  {/* Fallback grid shown if PlayCanvas failed */}
  {!playCanvasActive && renderCSSArena()}
</div>
```

### 6. Camera Setup

Isometric-ish perspective:
```typescript
const camera = new pc.Entity('camera');
camera.addComponent('camera', { clearColor: new pc.Color(0.05, 0.05, 0.08) });
camera.setPosition(10, 14, 18); // x=center, y=height, z=forward offset
camera.lookAt(10, 0, 10); // Look at arena center
```

Adjust until the 20×20 grid fills the canvas nicely. No camera movement needed for Friday.

### 7. Lighting

- Ambient light: dark blue-grey `rgba(30, 40, 60)`
- Directional "sun" light: slightly warm white, coming from top-left at 45°
- Point light on objective zone: yellow glow, intensity 2.0
- Optional: small point lights on each crawler (team color, intensity 0.5)

---

## React Integration in Play.tsx

```typescript
// In Play.tsx, add PlayCanvas alongside CSS grid

const playCanvasRef = useRef<HTMLCanvasElement>(null);
const playCanvasScene = useRef<PlayCanvasScene | null>(null);
const [pcActive, setPcActive] = useState(false);

// Mount PlayCanvas when molt starts
useEffect(() => {
  if (phase !== 'molt' || !playCanvasRef.current) return;
  
  import('../lib/ws2/PlayCanvasScene').then(({ PlayCanvasScene }) => {
    playCanvasScene.current = new PlayCanvasScene(playCanvasRef.current!);
    setPcActive(true);
  }).catch(() => {
    // Fallback to CSS grid
    setPcActive(false);
  });

  return () => {
    playCanvasScene.current?.destroy();
    playCanvasScene.current = null;
  };
}, [phase]);

// Feed snapshots to PlayCanvas
useEffect(() => {
  if (latestSnapshot && playCanvasScene.current) {
    playCanvasScene.current.update(latestSnapshot);
  }
}, [latestSnapshot]);
```

---

## File Structure

```
web/src/lib/ws2/
  PlayCanvasScene.ts      ← new: full PlayCanvas scene
  playcanvas-assets/      ← new: any asset files if needed (optional for Friday)
web/src/components/
  Play.tsx                ← modified: mount PlayCanvas, CSS grid as fallback
```

No new pages. No new API routes. Pure visual layer.

---

## Install

```bash
cd web && npm install @playcanvas/engine
```

Check version compatibility: `@playcanvas/engine@1.x` (latest stable).

---

## Acceptance Criteria (Friday)

1. `npm --prefix web run build` clean — no errors
2. `/play` page loads with PlayCanvas arena visible
3. Starting a molt shows both crawlers on the 3D isometric arena
4. Crawlers move to correct positions when molt ticks (smooth tween)
5. At least melee hit FX fires visually (particle burst)
6. CSS grid fallback works if PlayCanvas fails to mount
7. Looks dramatically better than the 2D CSS grid — someone watching should say "woah"

---

## Out of Scope for Friday

- Proper 3D mech models (GLB assets) — use box geometry
- Animations (walk cycle, attack animation) — use position tweening
- Sound effects — separate sprint
- Multiple camera angles — fixed isometric only
- Shadow maps — can skip for perf if needed

---

## Reference

- PlayCanvas engine: https://github.com/playcanvas/engine
- npm: `@playcanvas/engine`
- Robostorm demo: https://playcanvas.com (the robot battle game shown in screenshot)
- Target aesthetic: isometric 3D cage arena, industrial dark, cyan/red/yellow accent lighting
