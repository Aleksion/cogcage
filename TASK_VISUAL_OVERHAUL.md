# TASK: Visual Overhaul — Make The Molt Pit Feel Like a Real Game

**Branch:** `feat/visual-overhaul`
**Discord thread:** https://discord.com/channels/1476009707037655280/1477356006395609168
**Priority:** P0 — the game looks like a prototype, not a product

---

## Context

The Molt Pit is an AI crawler battle arena. You are in the repo root worktree.
Web app: `web/` — TanStack Start (Vite + Nitro) deployed to Vercel.

**Run this before anything else:**
```bash
cd web && npm install
```

**Build check (must pass before PR):**
```bash
cd web && npm run build
```

---

## The Problem

The current game looks like a hackathon demo:
- Crawlers are **literal boxes** (torso=box, head=smaller box, no limbs)
- Arena is a flat cream-colored grid — zero atmosphere
- VFX are tiny slow-moving particles that barely register
- No screen shake, no hit-stop, no impact feel
- HUD has functional bars but zero personality
- Crawlers **teleport** between tiles (tween exists but barely visible)

Art direction: **manga broadcast**. Reference: Real Steel + F1 telemetry. Bold linework. Every hit must feel BIG.

---

## File to Modify

**Primary:** `web/app/lib/ws2/PlayCanvasScene.ts` (~507 lines)
**Secondary:** `web/app/components/MatchView.tsx` (HUD CSS only — do not break game logic)
**Secondary:** `web/app/components/QuickDemo.tsx` (HUD CSS only)

Do NOT touch engine logic (`engine.ts`, `run-match.ts`, `match-types.ts`).

---

## What to Build

### 1. Crawler Geometry — Replace boxes with mech silhouettes

Each crawler needs a distinct silhouette. Both use the cel-shade + outline pattern already in place.

**Alpha Crawler (team A — use color `#00E5FF` cyan)**
```
Parts (all via this.part() helper):
- legs_L:  pos [-0.18, 0.18, 0]  scale [0.18, 0.36, 0.22]   — left leg block
- legs_R:  pos [+0.18, 0.18, 0]  scale [0.18, 0.36, 0.22]   — right leg block  
- torso:   pos [0, 0.62, 0]      scale [0.52, 0.44, 0.36]   — wide flat torso
- shoulder_L: pos [-0.34, 0.72, 0] scale [0.14, 0.22, 0.28] — angled shoulder plate
- shoulder_R: pos [+0.34, 0.72, 0] scale [0.14, 0.22, 0.28]
- neck:    pos [0, 0.88, 0]      scale [0.16, 0.12, 0.16]
- head:    pos [0, 1.04, 0]      scale [0.36, 0.28, 0.30]   — boxy sensor head
- visor:   pos [0, 1.04, 0.16]   scale [0.28, 0.10, 0.04]   color '#FFD600' — yellow visor strip
```

**Beta Crawler (team B — use color `#EB4D4B` red)**
```
Parts:
- base:     pos [0, 0.12, 0]     scale [0.48, 0.24, 0.38]   — wide squat base
- torso:    pos [0, 0.58, 0]     scale [0.42, 0.52, 0.32]   — taller narrower torso
- arm_L:    pos [-0.34, 0.58, 0] scale [0.16, 0.44, 0.16]   — long thin arm
- arm_R:    pos [+0.34, 0.58, 0] scale [0.16, 0.44, 0.16]
- head:     pos [0, 0.96, 0]     scale [0.28, 0.32, 0.26]   — tall narrow head
- antenna:  pos [0, 1.22, 0]     scale [0.04, 0.20, 0.04]   — thin spike on top
- eye_L:    pos [-0.08, 0.98, 0.14] scale [0.08, 0.06, 0.04] color '#FFD600'
- eye_R:    pos [+0.08, 0.98, 0.14] scale [0.08, 0.06, 0.04] color '#FFD600'
```

**Outline rule:** every part gets an outline entity (scale * 1.07, `outlineMat`, cull=FRONT).
**Idle sway:** add a slow sin-wave Y rotation to the root entity — 0.4 rad amplitude, 1.2s period.

```typescript
// In the app.on('update') loop, for each bot root:
const t = app.tick * (1 / 60); // time in seconds
bot.root.setLocalEulerAngles(0, Math.sin(t * 1.2 + botOffset) * 8, 0);
```

---

### 2. Arena Atmosphere

**Floor:** change from cream `#F5F0E8` to dark `#1A1A1A` (current dark industrial)
**Grid lines:** change from light grey to `rgba(0,229,255,0.08)` — faint cyan grid

**Cage pillars (4 corners):** add thick vertical cylinders at each corner
```typescript
// Replace box with cylinder-shaped box stack (PlayCanvas has no cylinder primitive easily)
// Use tall thin boxes: scale [0.25, 3.0, 0.25] at positions:
// [-0.5, 1.5, -0.5], [20.5, 1.5, -0.5], [-0.5, 1.5, 20.5], [20.5, 1.5, 20.5]
const pillarMat = celMat('#2A2A2A');
const pillarOlMat = outlineMat; // already black
corners.forEach(pos => {
  this.box(`pillar_${pos.join('_')}`, pos, [0.4, 3.0, 0.4], pillarMat);
  this.box(`pillar_ol_${pos.join('_')}`, pos, [0.48, 3.12, 0.48], pillarOlMat);
});
```

**Crossbeam bars (top of cage):** add 4 flat horizontal bars connecting pillars at y=2.9
```typescript
// N bar: pos [10, 2.9, -0.5], scale [21, 0.15, 0.25]
// S bar: pos [10, 2.9, 20.5], same scale
// W bar: pos [-0.5, 2.9, 10], scale [0.25, 0.15, 21]
// E bar: pos [20.5, 2.9, 10], same scale
```

**Spotlights (2 overhead lights):** Use a PointLight component
```typescript
const light1 = new pc.Entity('spot1');
light1.addComponent('light', {
  type: 'omni',
  color: new pc.Color(1, 0.95, 0.8),  // warm white
  intensity: 0.8,
  range: 25,
  castShadows: false,
});
light1.setLocalPosition(5, 8, 5);
app.root.addChild(light1);

const light2 = new pc.Entity('spot2');
light2.addComponent('light', {
  type: 'omni', 
  color: new pc.Color(0.2, 0.8, 1.0),  // cool cyan fill
  intensity: 0.4,
  range: 25,
  castShadows: false,
});
light2.setLocalPosition(15, 6, 15);
app.root.addChild(light2);
```

**Ambient:** set `app.scene.ambientLight = new pc.Color(0.04, 0.04, 0.08)` (very dark blue-black)

**Objective zone:** change from flat yellow to `#FFD600` emissive with stronger glow — keep existing, just increase height to 0.12 so it's more visible. Add pulsing scale in update loop:
```typescript
const obj = app.root.findByName('objective');
if (obj) {
  const pulse = 1 + Math.sin(app.tick * 0.08) * 0.04;
  obj.setLocalScale(6 * pulse, 0.12, 6 * pulse);
}
```

---

### 3. VFX Overhaul — Make hits feel BIG

#### 3a. Melee burst — chunky radial crack

Replace the current melee FX with 12 particles (instead of 8), larger, faster:
```typescript
spawnMeleeBurst(pos: pc.Vec3, color: string) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = 4 + Math.random() * 5;
    const p = this.spawnParticle(pos, hexColor(color));
    p.entity.setLocalScale(0.35, 0.35, 0.35);  // 2x bigger
    p.vx = Math.cos(angle) * speed;
    p.vy = 3 + Math.random() * 4;
    p.vz = Math.sin(angle) * speed;
    p.ttl = 0.35;
    p.maxTtl = 0.35;
  }
  // Also 4 "shard" particles — flat discs (scale x=0.6, y=0.06, z=0.6)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const p = this.spawnParticle(pos, hexColor('#FFD600'));
    p.entity.setLocalScale(0.6, 0.06, 0.6);
    p.vx = Math.cos(angle) * 3;
    p.vy = 1;
    p.vz = Math.sin(angle) * 3;
    p.ttl = 0.5;
    p.maxTtl = 0.5;
  }
}
```

#### 3b. Camera shake

Add shake state to the class and apply in update:
```typescript
private shake = { x: 0, z: 0, ttl: 0 };

triggerShake(intensity: number, duration: number) {
  this.shake.ttl = duration;
  this.shake.x = (Math.random() - 0.5) * intensity;
  this.shake.z = (Math.random() - 0.5) * intensity;
}

// In update loop — apply to camera
if (this.shake.ttl > 0) {
  this.shake.ttl -= dt;
  const decay = this.shake.ttl / 0.3;
  camera.setLocalPosition(
    10 + this.shake.x * decay,
    12,
    ARENA + 2 + this.shake.z * decay
  );
  if (this.shake.ttl <= 0) {
    camera.setLocalPosition(10, 12, ARENA + 2); // reset
  }
}
```

Trigger: `this.triggerShake(0.4, 0.25)` on MELEE_STRIKE, `this.triggerShake(0.15, 0.15)` on RANGED_SHOT, `this.triggerShake(1.0, 0.6)` on KO.

#### 3c. KAPOW/ZZT/CRACK text pops (HTML overlay)

The PlayCanvas canvas sits inside a `position: relative` div. Fire a DOM custom event and let React render the text pop as an absolute-positioned HTML overlay above the canvas:

```typescript
// In PlayCanvasScene.ts, on hit events:
canvas.dispatchEvent(new CustomEvent('moltpit:vfx', {
  detail: { text: 'KAPOW!', color: '#FFD600', x: screenX, y: screenY }
}));
```

The existing `moltpit:vfx` event handler in `MatchView.tsx` and `Play.tsx` already handles this. Just change the text to be meaningful:
- MELEE_STRIKE → `'KAPOW!'` or `'CRACK!'` (alternate)
- RANGED_SHOT hit → `'ZZT!'` or `'WHIP!'`
- GUARD → `'CLANG!'`
- KO → `'K.O.!!!'`

#### 3d. KO sequence — hit-stop

On KO event, pause the tick loop for 400ms:
```typescript
private hitStopUntil = 0;

// In update loop:
if (Date.now() < this.hitStopUntil) return; // freeze everything

// On KO:
this.hitStopUntil = Date.now() + 400;
this.triggerShake(1.0, 0.6);
```

---

### 4. HUD CSS — Manga Fighter Plate Aesthetic

In `MatchView.tsx`, update the CSS for the bot stat panels. Find the existing HP bar styles and replace with:

```css
.bot-panel {
  background: #111;
  border: 3px solid #333;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  position: relative;
  overflow: hidden;
}
.bot-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--panel-color, #00E5FF);
}
.bot-name {
  font-family: 'Bangers', cursive;
  font-size: 1.4rem;
  letter-spacing: 2px;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.8);
}
.hp-bar-track {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  height: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.15);
}
.hp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.15s ease-out;
  background: linear-gradient(90deg, var(--panel-color) 0%, #fff 100%);
  box-shadow: 0 0 8px var(--panel-color);
}
.energy-bar-fill {
  background: linear-gradient(90deg, #FFD600 0%, #FF9F1C 100%);
  box-shadow: 0 0 6px #FFD600;
}
```

Do NOT restructure the JSX — just update the CSS strings. The existing data flow is correct.

Also update `QuickDemo.tsx` HP/energy bar CSS to match the same style.

---

### 5. Tween Speed — Make Movement Visible

Current `TWEEN_SPEED = 12` makes crawlers snap almost instantly. Change to:
```typescript
const TWEEN_SPEED = 6; // slower lerp — smooth, visible movement
```

Also add a motion trail on DASH events. When a DASH event fires, spawn 3 ghost-trail particles at the crawler's current position, using team color at 40% opacity, that shrink over 0.2s:
```typescript
// In event processing, on DASH:
for (let i = 0; i < 3; i++) {
  const p = this.spawnParticle(currentPos, hexColor(teamColor));
  p.entity.setLocalScale(0.5, 0.8, 0.5);
  p.vx = 0; p.vy = 0; p.vz = 0; // stationary trail
  p.ttl = 0.2 - i * 0.05;
  p.maxTtl = 0.2;
  p.noScale = false;
}
```

---

## Acceptance Criteria

1. `cd web && npm run build` passes with zero errors
2. Both crawlers have distinct multi-part mech geometry (not boxes)
3. Arena is dark with cage pillars, warm/cyan lighting, glowing objective zone
4. Melee hit spawns large chunky burst + screen shake
5. KAPOW/ZZT text pops appear on hits
6. KO triggers 400ms hit-stop + big shake
7. Crawler movement is visibly smooth (tween speed 6)
8. HUD HP/energy bars have glow effect matching team color

---

## When Done

```bash
cd ~/clawd-engineer/projects/cogcage/worktrees/visual-overhaul
git add -A
git commit -m "feat(visual): crawler mech geometry, atmosphere, chunky VFX, HUD glow"
git push origin feat/visual-overhaul
gh pr create --title "feat(visual): game experience overhaul — mech crawlers, atmosphere, chunky VFX" --body "Replaces box geometry with mech silhouettes, adds cage arena atmosphere, chunky impact VFX, HUD glow, hit-stop on KO. See TASK_VISUAL_OVERHAUL.md." --base main
```

Then post the PR URL to: https://discord.com/channels/1476009707037655280/1477356006395609168
