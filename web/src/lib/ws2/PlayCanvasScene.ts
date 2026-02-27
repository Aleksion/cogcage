import * as pc from 'playcanvas';
import { UNIT_SCALE } from './constants';

/* ── Coordinate mapping ──────────────────────────────────────────
 * Engine positions are in "tenths": x,y ∈ [0, 200]  (ARENA_SIZE = 20 * UNIT_SCALE)
 * PlayCanvas world: x,z ∈ [0, 20], y = up axis
 * Conversion: worldX = engine.position.x / UNIT_SCALE
 *             worldZ = engine.position.y / UNIT_SCALE
 * ────────────────────────────────────────────────────────────── */

const ARENA = 20;
const OBJ_CX = 10;
const OBJ_CZ = 10;
const TWEEN_SPEED = 12; // lerp rate (per second)

/* ── FX particle ─────────────────────────────────────────────── */

interface FxParticle {
  entity: pc.Entity;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
  maxTtl: number;
}

/* ── Helpers ──────────────────────────────────────────────────── */

function hexColor(h: string): pc.Color {
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return new pc.Color(r, g, b);
}

function celMat(hex: string, outline = false): pc.StandardMaterial {
  const m = new pc.StandardMaterial();
  if (outline) {
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = new pc.Color(0, 0, 0);
    m.cull = pc.CULLFACE_FRONT; // back-face only = outline layer
  } else {
    const c = hexColor(hex);
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = c; // flat color, immune to lighting
  }
  m.useLighting = false;
  m.update();
  return m;
}

/* shared outline material — reuse for all outlines */
const outlineMat = celMat('', true);

/* ── PlayCanvasScene ─────────────────────────────────────────── */

export class PlayCanvasScene {
  private app: pc.Application;
  private bots: Record<string, { root: pc.Entity; parts: pc.Entity[] }> = {};
  private target: Record<string, { x: number; z: number }> = {};
  private fx: FxParticle[] = [];
  private lastEvtLen = 0;
  private dead = false;

  constructor(canvas: HTMLCanvasElement) {
    const app = new pc.Application(canvas, {});
    this.app = app;

    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    const resize = () => {
      const p = canvas.parentElement;
      if (p) app.resizeCanvas(p.clientWidth, p.clientHeight);
    };
    window.addEventListener('resize', resize);
    resize();

    this.camera();
    this.lights();
    this.arena();
    this.buildStriker('botA', 4, 10);
    this.buildCrusher('botB', 16, 10);

    app.on('update', (dt: number) => this.tick(dt));
    app.start();
  }

  /* ── Camera ──────────────────────────────────────────────── */

  private camera(): void {
    const e = new pc.Entity('camera');
    e.addComponent('camera', {
      clearColor: new pc.Color(0.96, 0.94, 0.91), // warm cream background
      fov: 45,
    });
    e.setPosition(10, 14, 18);
    e.lookAt(new pc.Vec3(10, 0, 10));
    this.app.root.addChild(e);
  }

  /* ── Lights ─────────────────────────────────────────────── */

  private lights(): void {
    // Full white ambient — flat cel-shaded, no shadow variation
    this.app.scene.ambientLight = new pc.Color(1, 1, 1);

    // Objective zone point light (warm glow)
    const obj = new pc.Entity('objLight');
    obj.addComponent('light', {
      type: 'point',
      color: new pc.Color(1, 0.84, 0),
      intensity: 2.0,
      range: 8,
    });
    obj.setPosition(OBJ_CX, 1.5, OBJ_CZ);
    this.app.root.addChild(obj);
  }

  /* ── Arena geometry ─────────────────────────────────────── */

  private box(
    name: string,
    pos: [number, number, number],
    sc: [number, number, number],
    m: pc.StandardMaterial,
  ): pc.Entity {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box' });
    e.setPosition(pos[0], pos[1], pos[2]);
    e.setLocalScale(sc[0], sc[1], sc[2]);
    if (e.render) e.render.meshInstances[0].material = m;
    this.app.root.addChild(e);
    return e;
  }

  private arena(): void {
    // Floor — warm paper/cream (Borderlands ground)
    this.box('floor', [ARENA / 2, -0.05, ARENA / 2], [ARENA, 0.1, ARENA], celMat('#F5F0E8'));

    // Grid lines — bold dark, every 2 units
    const gridMat = celMat('#222222');
    for (let i = 0; i <= ARENA; i += 2) {
      this.box(`gx${i}`, [ARENA / 2, 0.015, i], [ARENA, 0.015, 0.06], gridMat);
      this.box(`gz${i}`, [i, 0.015, ARENA / 2], [0.06, 0.015, ARENA], gridMat);
    }

    // Cover blocks — earthy brown Borderlands rubble
    const covers: { pos: [number, number, number]; scale: [number, number, number] }[] = [
      { pos: [4, 0.4, 4], scale: [1.2, 0.8, 0.4] },
      { pos: [16, 0.4, 4], scale: [0.4, 0.8, 1.2] },
      { pos: [4, 0.4, 16], scale: [1.2, 0.8, 0.4] },
      { pos: [16, 0.4, 16], scale: [0.4, 0.8, 1.2] },
      { pos: [10, 0.4, 6], scale: [0.4, 0.8, 2.0] },
      { pos: [10, 0.4, 14], scale: [0.4, 0.8, 2.0] },
    ];
    for (let i = 0; i < covers.length; i++) {
      const c = covers[i];
      this.box(`cover${i}`, c.pos, c.scale, celMat('#5a4a3a'));
      this.box(
        `cover${i}_ol`,
        c.pos,
        [c.scale[0] * 1.08, c.scale[1] * 1.08, c.scale[2] * 1.08],
        outlineMat,
      );
    }

    // Objective zone — solid bright signal yellow platform
    this.box('objective', [OBJ_CX, 0.04, OBJ_CZ], [5, 0.08, 5], celMat('#FFD600')); // radius 2.5 → diameter 5

    // Boundary walls — near black, 1.0 tall
    const h = 1.0;
    const t = 0.15;
    const wallMat = celMat('#2a2a2a');
    this.box('wN', [ARENA / 2, h / 2, -t / 2], [ARENA + t * 2, h, t], wallMat);
    this.box('wN_ol', [ARENA / 2, h / 2, -t / 2], [(ARENA + t * 2) * 1.06, h * 1.06, t * 1.06], outlineMat);
    this.box('wS', [ARENA / 2, h / 2, ARENA + t / 2], [ARENA + t * 2, h, t], wallMat);
    this.box('wS_ol', [ARENA / 2, h / 2, ARENA + t / 2], [(ARENA + t * 2) * 1.06, h * 1.06, t * 1.06], outlineMat);
    this.box('wW', [-t / 2, h / 2, ARENA / 2], [t, h, ARENA + t * 2], wallMat);
    this.box('wW_ol', [-t / 2, h / 2, ARENA / 2], [t * 1.06, h * 1.06, (ARENA + t * 2) * 1.06], outlineMat);
    this.box('wE', [ARENA + t / 2, h / 2, ARENA / 2], [t, h, ARENA + t * 2], wallMat);
    this.box('wE_ol', [ARENA + t / 2, h / 2, ARENA / 2], [t * 1.06, h * 1.06, (ARENA + t * 2) * 1.06], outlineMat);
  }

  /* ── Mech part helper ──────────────────────────────────── */

  private part(
    parent: pc.Entity,
    name: string,
    pos: [number, number, number],
    scale: [number, number, number],
    color: string,
  ): pc.Entity {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box' });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalScale(scale[0], scale[1], scale[2]);
    if (e.render) e.render.meshInstances[0].material = celMat(color);
    parent.addChild(e);

    // Outline shell — inflated 1.12x, black back-face cull
    const ol = new pc.Entity(name + '_ol');
    ol.addComponent('render', { type: 'box' });
    ol.setLocalPosition(0, 0, 0);
    ol.setLocalScale(1.12, 1.12, 1.12);
    if (ol.render) ol.render.meshInstances[0].material = outlineMat;
    e.addChild(ol);

    return e;
  }

  /* ── Striker (botA — green #2ecc71) ────────────────────── */

  private buildStriker(id: string, startX: number, startZ: number): void {
    const root = new pc.Entity(`bot-${id}`);
    root.setPosition(startX, 0, startZ);
    const parts: pc.Entity[] = [];

    parts.push(this.part(root, 'legL', [-0.18, 0.15, 0], [0.22, 0.3, 0.22], '#27ae60'));
    parts.push(this.part(root, 'legR', [0.18, 0.15, 0], [0.22, 0.3, 0.22], '#27ae60'));
    parts.push(this.part(root, 'hips', [0, 0.32, 0], [0.5, 0.1, 0.3], '#2ecc71'));
    parts.push(this.part(root, 'torso', [0, 0.62, 0], [0.42, 0.52, 0.28], '#2ecc71'));
    parts.push(this.part(root, 'shoulderL', [-0.32, 0.74, 0], [0.18, 0.22, 0.22], '#27ae60'));
    parts.push(this.part(root, 'shoulderR', [0.32, 0.74, 0], [0.18, 0.22, 0.22], '#27ae60'));
    parts.push(this.part(root, 'armL', [-0.34, 0.48, 0], [0.14, 0.28, 0.14], '#2ecc71'));
    parts.push(this.part(root, 'armR', [0.36, 0.48, 0.02], [0.08, 0.32, 0.06], '#27D9E8')); // blade
    parts.push(this.part(root, 'head', [0, 0.98, 0], [0.28, 0.22, 0.24], '#2ecc71'));
    parts.push(this.part(root, 'visor', [0, 0.98, 0.13], [0.22, 0.06, 0.04], '#27D9E8'));
    parts.push(this.part(root, 'antenna', [0.1, 1.12, 0], [0.04, 0.12, 0.04], '#FFD233'));

    // Team glow point light
    const light = new pc.Entity('botLight');
    light.addComponent('light', {
      type: 'point',
      color: hexColor('#2ecc71'),
      intensity: 0.5,
      range: 3,
    });
    light.setLocalPosition(0, 1.5, 0);
    root.addChild(light);

    this.app.root.addChild(root);
    this.bots[id] = { root, parts };
    this.target[id] = { x: startX, z: startZ };
  }

  /* ── Crusher (botB — red #eb4d4b) ──────────────────────── */

  private buildCrusher(id: string, startX: number, startZ: number): void {
    const root = new pc.Entity(`bot-${id}`);
    root.setPosition(startX, 0, startZ);
    const parts: pc.Entity[] = [];

    parts.push(this.part(root, 'legL', [-0.22, 0.12, 0], [0.26, 0.24, 0.28], '#c0392b'));
    parts.push(this.part(root, 'legR', [0.22, 0.12, 0], [0.26, 0.24, 0.28], '#c0392b'));
    parts.push(this.part(root, 'hips', [0, 0.28, 0], [0.62, 0.12, 0.36], '#eb4d4b'));
    parts.push(this.part(root, 'torso', [0, 0.58, 0], [0.66, 0.5, 0.34], '#eb4d4b'));
    parts.push(this.part(root, 'pauldronL', [-0.46, 0.72, 0], [0.26, 0.28, 0.28], '#c0392b'));
    parts.push(this.part(root, 'pauldronR', [0.46, 0.72, 0], [0.26, 0.28, 0.28], '#c0392b'));
    parts.push(this.part(root, 'cannon', [0.42, 0.44, 0.04], [0.22, 0.18, 0.18], '#7f0000'));
    parts.push(this.part(root, 'barrelTip', [0.42, 0.3, 0.04], [0.14, 0.1, 0.14], '#333333'));
    parts.push(this.part(root, 'clawArm', [-0.4, 0.44, 0], [0.16, 0.26, 0.14], '#c0392b'));
    parts.push(this.part(root, 'head', [0, 0.9, 0], [0.38, 0.2, 0.3], '#eb4d4b'));
    parts.push(this.part(root, 'eyeSlit', [0, 0.9, 0.16], [0.3, 0.04, 0.02], '#FFD233'));
    parts.push(this.part(root, 'hornL', [-0.12, 1.02, 0], [0.06, 0.12, 0.06], '#c0392b'));
    parts.push(this.part(root, 'hornR', [0.12, 1.02, 0], [0.06, 0.12, 0.06], '#c0392b'));

    // Team glow point light
    const light = new pc.Entity('botLight');
    light.addComponent('light', {
      type: 'point',
      color: hexColor('#eb4d4b'),
      intensity: 0.5,
      range: 3,
    });
    light.setLocalPosition(0, 1.5, 0);
    root.addChild(light);

    this.app.root.addChild(root);
    this.bots[id] = { root, parts };
    this.target[id] = { x: startX, z: startZ };
  }

  /* ── FX spawners ────────────────────────────────────────── */

  private spawnBurst(cx: number, cy: number, cz: number, hexStr: string, count: number, ttl: number): void {
    const m = celMat(hexStr);
    for (let i = 0; i < count; i++) {
      const e = new pc.Entity('fx');
      e.addComponent('render', { type: 'box' });
      const s = 0.05 + Math.random() * 0.08;
      e.setLocalScale(s, s, s);
      e.setPosition(cx, cy, cz);
      if (e.render) e.render.meshInstances[0].material = m;
      this.app.root.addChild(e);

      const spd = 2 + Math.random() * 4;
      const ang = Math.random() * Math.PI * 2;
      this.fx.push({
        entity: e,
        vx: Math.cos(ang) * spd,
        vy: 1 + Math.random() * 3,
        vz: Math.sin(ang) * spd,
        ttl: ttl / 1000,
        maxTtl: ttl / 1000,
      });
    }
  }

  private spawnShield(cx: number, cz: number): void {
    const m = celMat('#ccccff');
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const e = new pc.Entity('shield');
      e.addComponent('render', { type: 'box' });
      e.setLocalScale(0.12, 0.6, 0.12);
      e.setPosition(cx + Math.cos(ang) * 0.5, 0.5, cz + Math.sin(ang) * 0.5);
      if (e.render) e.render.meshInstances[0].material = m;
      this.app.root.addChild(e);

      this.fx.push({
        entity: e,
        vx: Math.cos(ang) * 0.5,
        vy: 0.3,
        vz: Math.sin(ang) * 0.5,
        ttl: 0.6,
        maxTtl: 0.6,
      });
    }
  }

  /* ── DOM VFX dispatcher ─────────────────────────────────── */

  private dispatchVfx(text: string, color: string): void {
    this.app.graphicsDevice.canvas.dispatchEvent(
      new CustomEvent('cogcage:vfx', {
        detail: { text, color },
        bubbles: true,
      }),
    );
  }

  /* ── Public: feed snapshot ──────────────────────────────── */

  update(snapshot: any): void {
    if (this.dead) return;
    const state = snapshot.state;
    if (!state?.actors) return;

    // Update target positions
    for (const [id, actor] of Object.entries(state.actors) as [string, any][]) {
      if (this.bots[id]) {
        this.target[id] = {
          x: actor.position.x / UNIT_SCALE,
          z: actor.position.y / UNIT_SCALE,
        };
      }
    }

    // Process new events
    const events: any[] = state.events || [];
    const fresh = events.slice(this.lastEvtLen);
    this.lastEvtLen = events.length;

    for (const evt of fresh) {
      if (evt.type === 'DAMAGE_APPLIED') {
        const tid = evt.targetId as string;
        if (tid && this.bots[tid]) {
          const p = this.bots[tid].root.getPosition();
          if (evt.data?.base === 16) {
            this.spawnBurst(p.x, 0.5, p.z, '#00e5ff', 8, 300);
            this.dispatchVfx('ZZT!', '#27D9E8');
          } else {
            this.spawnBurst(p.x, 0.5, p.z, '#ff6b35', 12, 400);
            this.dispatchVfx('KAPOW!', '#FF4D4D');
          }
        }
      }

      if (evt.type === 'STATUS_APPLIED' && evt.data?.status === 'GUARD') {
        const aid = evt.actorId as string;
        if (aid && this.bots[aid]) {
          const p = this.bots[aid].root.getPosition();
          this.spawnShield(p.x, p.z);
          this.dispatchVfx('CLANG!', '#27D9E8');
        }
      }

      if (evt.type === 'STATUS_APPLIED' && evt.data?.status === 'DASH_BUFF') {
        const aid = evt.actorId as string;
        if (aid && this.bots[aid]) {
          const p = this.bots[aid].root.getPosition();
          this.spawnBurst(p.x, 0.3, p.z, aid === 'botA' ? '#2ecc71' : '#eb4d4b', 6, 400);
        }
      }

      if (evt.type === 'MATCH_END') {
        const loserId = snapshot.winnerId === 'botA' ? 'botB' : 'botA';
        if (this.bots[loserId]) {
          const p = this.bots[loserId].root.getPosition();
          this.spawnBurst(p.x, 0.5, p.z, '#ffffff', 30, 1200);
          this.spawnBurst(p.x, 0.5, p.z, '#ffd600', 20, 1000);
        }
        this.dispatchVfx('K.O.!!', '#FFD600');
      }
    }
  }

  /* ── Per-frame tick ─────────────────────────────────────── */

  private tick(dt: number): void {
    // Tween bots toward target
    for (const [id, b] of Object.entries(this.bots)) {
      const t = this.target[id];
      if (!t) continue;
      const pos = b.root.getPosition();
      const nx = pos.x + (t.x - pos.x) * Math.min(1, dt * TWEEN_SPEED);
      const nz = pos.z + (t.z - pos.z) * Math.min(1, dt * TWEEN_SPEED);
      b.root.setPosition(nx, 0, nz);

      // Face movement direction
      const dx = t.x - pos.x;
      const dz = t.z - pos.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        b.root.setEulerAngles(0, Math.atan2(dx, dz) * (180 / Math.PI), 0);
      }
    }

    // Animate FX
    const alive: FxParticle[] = [];
    for (const p of this.fx) {
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.entity.destroy();
        continue;
      }
      p.vy -= 8 * dt; // gravity
      const pos = p.entity.getPosition();
      p.entity.setPosition(
        pos.x + p.vx * dt,
        Math.max(0.03, pos.y + p.vy * dt),
        pos.z + p.vz * dt,
      );
      const frac = p.ttl / p.maxTtl;
      const s = 0.06 * frac;
      p.entity.setLocalScale(s, s, s);
      alive.push(p);
    }
    this.fx = alive;
  }

  /* ── Cleanup ────────────────────────────────────────────── */

  destroy(): void {
    this.dead = true;
    for (const p of this.fx) p.entity.destroy();
    this.fx = [];
    this.app.destroy();
  }
}
