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

function hex(h: string): pc.Color {
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  return new pc.Color(r, g, b);
}

function mat(diffuse: pc.Color, emissive?: pc.Color): pc.StandardMaterial {
  const m = new pc.StandardMaterial();
  m.diffuse = diffuse;
  if (emissive) m.emissive = emissive;
  m.update();
  return m;
}

function matTranslucent(
  diffuse: pc.Color,
  emissive: pc.Color,
  opacity: number,
  blend: number,
): pc.StandardMaterial {
  const m = new pc.StandardMaterial();
  m.diffuse = diffuse;
  m.emissive = emissive;
  m.opacity = opacity;
  m.blendType = blend;
  m.update();
  return m;
}

/* ── PlayCanvasScene ─────────────────────────────────────────── */

export class PlayCanvasScene {
  private app: pc.Application;
  private bots: Record<string, { root: pc.Entity; body: pc.Entity; head: pc.Entity }> = {};
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
    this.bot('botA', hex('#2ecc71'), 1, 4);
    this.bot('botB', hex('#eb4d4b'), 6, 3);

    app.on('update', (dt: number) => this.tick(dt));
    app.start();
  }

  /* ── Camera ──────────────────────────────────────────────── */

  private camera(): void {
    const e = new pc.Entity('camera');
    e.addComponent('camera', {
      clearColor: new pc.Color(0.05, 0.05, 0.08),
      fov: 45,
    });
    e.setPosition(10, 14, 18);
    e.lookAt(new pc.Vec3(10, 0, 10));
    this.app.root.addChild(e);
  }

  /* ── Lights ─────────────────────────────────────────────── */

  private lights(): void {
    // Ambient
    this.app.scene.ambientLight = new pc.Color(0.12, 0.16, 0.24);

    // Directional sun
    const sun = new pc.Entity('sun');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 0.96, 0.88),
      intensity: 1.2,
      castShadows: false,
    });
    sun.setEulerAngles(45, -45, 0);
    this.app.root.addChild(sun);

    // Objective zone point light
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
    const floorMat = mat(new pc.Color(0.1, 0.1, 0.1), new pc.Color(0.02, 0.02, 0.02));

    // Floor slab
    this.box('floor', [ARENA / 2, -0.05, ARENA / 2], [ARENA, 0.1, ARENA], floorMat);

    // Grid lines
    const gridMat = mat(new pc.Color(0.18, 0.18, 0.18));
    for (let i = 0; i <= ARENA; i++) {
      this.box(`gx${i}`, [ARENA / 2, 0.01, i], [ARENA, 0.01, 0.04], gridMat);
      this.box(`gz${i}`, [i, 0.01, ARENA / 2], [0.04, 0.01, ARENA], gridMat);
    }

    // Objective zone
    const objMat = matTranslucent(
      new pc.Color(0.15, 0.13, 0),
      new pc.Color(0.4, 0.33, 0),
      0.6,
      pc.BLEND_NORMAL,
    );
    this.box('objective', [OBJ_CX, 0.02, OBJ_CZ], [5, 0.02, 5], objMat);

    // Boundary walls
    const wallMat = mat(new pc.Color(0.15, 0.15, 0.15), new pc.Color(0.05, 0.05, 0.05));
    const h = 0.4;
    const t = 0.15;
    this.box('wN', [ARENA / 2, h / 2, -t / 2], [ARENA + t * 2, h, t], wallMat);
    this.box('wS', [ARENA / 2, h / 2, ARENA + t / 2], [ARENA + t * 2, h, t], wallMat);
    this.box('wW', [-t / 2, h / 2, ARENA / 2], [t, h, ARENA + t * 2], wallMat);
    this.box('wE', [ARENA + t / 2, h / 2, ARENA / 2], [t, h, ARENA + t * 2], wallMat);
  }

  /* ── Bot entities ───────────────────────────────────────── */

  private bot(id: string, color: pc.Color, startX: number, startZ: number): void {
    const root = new pc.Entity(`bot-${id}`);
    root.setPosition(startX, 0, startZ);

    // Body box
    const bodyMat = mat(color, new pc.Color(color.r * 0.3, color.g * 0.3, color.b * 0.3));
    const body = new pc.Entity('body');
    body.addComponent('render', { type: 'box' });
    body.setLocalPosition(0, 0.4, 0);
    body.setLocalScale(0.6, 0.8, 0.6);
    if (body.render) body.render.meshInstances[0].material = bodyMat;
    root.addChild(body);

    // Head box
    const headMat = mat(
      new pc.Color(color.r * 0.8, color.g * 0.8, color.b * 0.8),
      new pc.Color(color.r * 0.2, color.g * 0.2, color.b * 0.2),
    );
    const head = new pc.Entity('head');
    head.addComponent('render', { type: 'box' });
    head.setLocalPosition(0, 0.95, 0);
    head.setLocalScale(0.4, 0.3, 0.4);
    if (head.render) head.render.meshInstances[0].material = headMat;
    root.addChild(head);

    // Point light (team color)
    const light = new pc.Entity('botLight');
    light.addComponent('light', {
      type: 'point',
      color: color,
      intensity: 0.5,
      range: 3,
    });
    light.setLocalPosition(0, 1.5, 0);
    root.addChild(light);

    this.app.root.addChild(root);
    this.bots[id] = { root, body, head };
    this.target[id] = { x: startX, z: startZ };
  }

  /* ── FX spawners ────────────────────────────────────────── */

  private spawnBurst(cx: number, cy: number, cz: number, color: pc.Color, count: number, ttl: number): void {
    const m = mat(color, color);
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
    const m = matTranslucent(
      new pc.Color(1, 1, 1),
      new pc.Color(0.8, 0.8, 1),
      0.4,
      pc.BLEND_ADDITIVE,
    );
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
            // Ranged — cyan directional streak + small burst
            this.spawnBurst(p.x, 0.5, p.z, hex('#00e5ff'), 8, 300);
          } else {
            // Melee — orange/red burst
            this.spawnBurst(p.x, 0.5, p.z, hex('#ff6b35'), 12, 400);
          }
        }
      }

      if (evt.type === 'STATUS_APPLIED' && evt.data?.status === 'GUARD') {
        const aid = evt.actorId as string;
        if (aid && this.bots[aid]) {
          const p = this.bots[aid].root.getPosition();
          this.spawnShield(p.x, p.z);
        }
      }

      if (evt.type === 'STATUS_APPLIED' && evt.data?.status === 'DASH_BUFF') {
        const aid = evt.actorId as string;
        if (aid && this.bots[aid]) {
          const p = this.bots[aid].root.getPosition();
          const c = aid === 'botA' ? hex('#2ecc71') : hex('#eb4d4b');
          this.spawnBurst(p.x, 0.3, p.z, c, 6, 400);
        }
      }

      if (evt.type === 'MATCH_END') {
        const loserId = snapshot.winnerId === 'botA' ? 'botB' : 'botA';
        if (this.bots[loserId]) {
          const p = this.bots[loserId].root.getPosition();
          this.spawnBurst(p.x, 0.5, p.z, hex('#ffffff'), 30, 1200);
          this.spawnBurst(p.x, 0.5, p.z, hex('#ffd600'), 20, 1000);
        }
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
