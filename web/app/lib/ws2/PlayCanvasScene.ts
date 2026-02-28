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
const TWEEN_SPEED = 6; // slower lerp — smooth, visible movement

/* ── FX particle ─────────────────────────────────────────────── */

interface FxParticle {
  entity: pc.Entity;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
  maxTtl: number;
  noScale?: boolean;
  boltLength?: number;
  initScale?: { x: number; y: number; z: number };
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
  private time = 0;
  private vfxCounter = 0;
  private cameraEntity!: pc.Entity;
  private shake = { x: 0, z: 0, ttl: 0 };
  private hitStopUntil = 0;

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
    this.buildAlpha('botA', 6, 10);
    this.buildBeta('botB', 14, 10);

    app.on('update', (dt: number) => this.tick(dt));
    app.start();
  }

  /* ── Camera ──────────────────────────────────────────────── */

  private camera(): void {
    const e = new pc.Entity('camera');
    e.addComponent('camera', {
      clearColor: new pc.Color(0.04, 0.04, 0.06),
      fov: 45,
    });
    e.setPosition(10, 12, ARENA + 2);
    e.lookAt(new pc.Vec3(10, 0, 10));
    this.app.root.addChild(e);
    this.cameraEntity = e;
  }

  /* ── Lights ─────────────────────────────────────────────── */

  private lights(): void {
    // Very dark blue-black ambient
    this.app.scene.ambientLight = new pc.Color(0.04, 0.04, 0.08);

    // Warm overhead spotlight
    const light1 = new pc.Entity('spot1');
    light1.addComponent('light', {
      type: 'omni',
      color: new pc.Color(1, 0.95, 0.8),
      intensity: 0.8,
      range: 25,
      castShadows: false,
    });
    light1.setLocalPosition(5, 8, 5);
    this.app.root.addChild(light1);

    // Cool cyan fill light
    const light2 = new pc.Entity('spot2');
    light2.addComponent('light', {
      type: 'omni',
      color: new pc.Color(0.2, 0.8, 1.0),
      intensity: 0.4,
      range: 25,
      castShadows: false,
    });
    light2.setLocalPosition(15, 6, 15);
    this.app.root.addChild(light2);

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
    // Floor — dark industrial
    this.box('floor', [ARENA / 2, -0.05, ARENA / 2], [ARENA, 0.1, ARENA], celMat('#1A1A1A'));

    // Grid lines — faint cyan
    const gridMat = celMat('#0D2628');
    for (let i = 0; i <= ARENA; i += 2) {
      this.box(`gx${i}`, [ARENA / 2, 0.015, i], [ARENA, 0.015, 0.06], gridMat);
      this.box(`gz${i}`, [i, 0.015, ARENA / 2], [0.06, 0.015, ARENA], gridMat);
    }

    // Cover blocks — earthy brown rubble
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

    // Objective zone — bright signal yellow, taller
    this.box('objective', [OBJ_CX, 0.06, OBJ_CZ], [6, 0.12, 6], celMat('#FFD600'));

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

    // Cage pillars (4 corners)
    const pillarMat = celMat('#2A2A2A');
    const corners: [number, number, number][] = [
      [-0.5, 1.5, -0.5],
      [20.5, 1.5, -0.5],
      [-0.5, 1.5, 20.5],
      [20.5, 1.5, 20.5],
    ];
    for (const pos of corners) {
      this.box(`pillar_${pos.join('_')}`, pos, [0.4, 3.0, 0.4], pillarMat);
      this.box(`pillar_ol_${pos.join('_')}`, pos, [0.48, 3.12, 0.48], outlineMat);
    }

    // Crossbeam bars (top of cage)
    this.box('barN', [10, 2.9, -0.5], [21, 0.15, 0.25], pillarMat);
    this.box('barS', [10, 2.9, 20.5], [21, 0.15, 0.25], pillarMat);
    this.box('barW', [-0.5, 2.9, 10], [0.25, 0.15, 21], pillarMat);
    this.box('barE', [20.5, 2.9, 10], [0.25, 0.15, 21], pillarMat);
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

    // Outline shell — inflated 1.07x, black back-face cull
    const ol = new pc.Entity(name + '_ol');
    ol.addComponent('render', { type: 'box' });
    ol.setLocalPosition(0, 0, 0);
    ol.setLocalScale(1.07, 1.07, 1.07);
    if (ol.render) ol.render.meshInstances[0].material = outlineMat;
    e.addChild(ol);

    return e;
  }

  /* ── Alpha Crawler (botA — cyan #00E5FF) ────────────────── */

  private buildAlpha(id: string, startX: number, startZ: number): void {
    const root = new pc.Entity(`bot-${id}`);
    root.setPosition(startX, 0, startZ);
    const parts: pc.Entity[] = [];
    const c = '#00E5FF';

    parts.push(this.part(root, 'legs_L', [-0.18, 0.18, 0], [0.18, 0.36, 0.22], c));
    parts.push(this.part(root, 'legs_R', [0.18, 0.18, 0], [0.18, 0.36, 0.22], c));
    parts.push(this.part(root, 'torso', [0, 0.62, 0], [0.52, 0.44, 0.36], c));
    parts.push(this.part(root, 'shoulder_L', [-0.34, 0.72, 0], [0.14, 0.22, 0.28], c));
    parts.push(this.part(root, 'shoulder_R', [0.34, 0.72, 0], [0.14, 0.22, 0.28], c));
    parts.push(this.part(root, 'neck', [0, 0.88, 0], [0.16, 0.12, 0.16], c));
    parts.push(this.part(root, 'head', [0, 1.04, 0], [0.36, 0.28, 0.30], c));
    parts.push(this.part(root, 'visor', [0, 1.04, 0.16], [0.28, 0.10, 0.04], '#FFD600'));

    // Team glow point light
    const light = new pc.Entity('botLight');
    light.addComponent('light', {
      type: 'point',
      color: hexColor(c),
      intensity: 0.5,
      range: 3,
    });
    light.setLocalPosition(0, 1.5, 0);
    root.addChild(light);

    this.app.root.addChild(root);
    this.bots[id] = { root, parts };
    this.target[id] = { x: startX, z: startZ };
  }

  /* ── Beta Crawler (botB — red #EB4D4B) ──────────────────── */

  private buildBeta(id: string, startX: number, startZ: number): void {
    const root = new pc.Entity(`bot-${id}`);
    root.setPosition(startX, 0, startZ);
    const parts: pc.Entity[] = [];
    const c = '#EB4D4B';

    parts.push(this.part(root, 'base', [0, 0.12, 0], [0.48, 0.24, 0.38], c));
    parts.push(this.part(root, 'torso', [0, 0.58, 0], [0.42, 0.52, 0.32], c));
    parts.push(this.part(root, 'arm_L', [-0.34, 0.58, 0], [0.16, 0.44, 0.16], c));
    parts.push(this.part(root, 'arm_R', [0.34, 0.58, 0], [0.16, 0.44, 0.16], c));
    parts.push(this.part(root, 'head', [0, 0.96, 0], [0.28, 0.32, 0.26], c));
    parts.push(this.part(root, 'antenna', [0, 1.22, 0], [0.04, 0.20, 0.04], c));
    parts.push(this.part(root, 'eye_L', [-0.08, 0.98, 0.14], [0.08, 0.06, 0.04], '#FFD600'));
    parts.push(this.part(root, 'eye_R', [0.08, 0.98, 0.14], [0.08, 0.06, 0.04], '#FFD600'));

    // Team glow point light
    const light = new pc.Entity('botLight');
    light.addComponent('light', {
      type: 'point',
      color: hexColor(c),
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

  private spawnParticle(pos: pc.Vec3, color: pc.Color): FxParticle {
    const e = new pc.Entity('fx');
    e.addComponent('render', { type: 'box' });
    e.setPosition(pos.x, pos.y, pos.z);
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = color;
    m.useLighting = false;
    m.update();
    if (e.render) e.render.meshInstances[0].material = m;
    this.app.root.addChild(e);
    e.setLocalScale(0.1, 0.1, 0.1);
    const p: FxParticle = {
      entity: e,
      vx: 0,
      vy: 0,
      vz: 0,
      ttl: 1,
      maxTtl: 1,
      initScale: { x: 0.1, y: 0.1, z: 0.1 },
    };
    this.fx.push(p);
    return p;
  }

  private spawnMeleeBurst(pos: pc.Vec3, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 4 + Math.random() * 5;
      const p = this.spawnParticle(pos, hexColor(color));
      p.entity.setLocalScale(0.35, 0.35, 0.35);
      p.initScale = { x: 0.35, y: 0.35, z: 0.35 };
      p.vx = Math.cos(angle) * speed;
      p.vy = 3 + Math.random() * 4;
      p.vz = Math.sin(angle) * speed;
      p.ttl = 0.35;
      p.maxTtl = 0.35;
    }
    // 4 "shard" particles — flat discs
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
      const p = this.spawnParticle(pos, hexColor('#FFD600'));
      p.entity.setLocalScale(0.6, 0.06, 0.6);
      p.initScale = { x: 0.6, y: 0.06, z: 0.6 };
      p.vx = Math.cos(angle) * 3;
      p.vy = 1;
      p.vz = Math.sin(angle) * 3;
      p.ttl = 0.5;
      p.maxTtl = 0.5;
    }
  }

  private spawnBurst(cx: number, cy: number, cz: number, hexStr: string, count: number, ttl: number): void {
    const m = celMat(hexStr);
    for (let i = 0; i < count; i++) {
      const e = new pc.Entity('fx');
      e.addComponent('render', { type: 'box' });
      const s = 0.12 + Math.random() * 0.12;
      e.setLocalScale(s, s, s);
      e.setPosition(cx, cy, cz);
      if (e.render) e.render.meshInstances[0].material = m;
      this.app.root.addChild(e);

      const spd = 3 + Math.random() * 5;
      const ang = Math.random() * Math.PI * 2;
      this.fx.push({
        entity: e,
        vx: Math.cos(ang) * spd,
        vy: 1 + Math.random() * 3,
        vz: Math.sin(ang) * spd,
        ttl: ttl / 1000,
        maxTtl: ttl / 1000,
        initScale: { x: s, y: s, z: s },
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
        initScale: { x: 0.12, y: 0.6, z: 0.12 },
      });
    }
  }

  private spawnBolt(sx: number, sy: number, sz: number, tx: number, ty: number, tz: number): void {
    const dx = tx - sx;
    const dy = ty - sy;
    const dz = tz - sz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.01) return;

    const bolt = new pc.Entity('bolt');
    bolt.addComponent('render', { type: 'box' });
    const angleY = Math.atan2(dx, dz) * (180 / Math.PI);
    bolt.setPosition((sx + tx) / 2, (sy + ty) / 2, (sz + tz) / 2);
    bolt.setEulerAngles(0, angleY, 0);
    bolt.setLocalScale(0.07, 0.07, dist);
    const m = celMat('#27D9E8');
    if (bolt.render) bolt.render.meshInstances[0].material = m;
    this.app.root.addChild(bolt);

    this.fx.push({ entity: bolt, vx: 0, vy: 0, vz: 0, ttl: 0.14, maxTtl: 0.14, noScale: true, boltLength: dist });
  }

  /* ── Camera shake ───────────────────────────────────────── */

  private triggerShake(intensity: number, duration: number): void {
    this.shake.ttl = duration;
    this.shake.x = (Math.random() - 0.5) * intensity;
    this.shake.z = (Math.random() - 0.5) * intensity;
  }

  /* ── DOM VFX dispatcher ─────────────────────────────────── */

  private dispatchVfx(text: string, color: string): void {
    this.app.graphicsDevice.canvas.dispatchEvent(
      new CustomEvent('moltpit:vfx', {
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
        const aid = evt.actorId as string;
        const isRanged = (evt.data?.base as number) === 16;
        if (tid && this.bots[tid]) {
          const tp = this.bots[tid].root.getPosition();
          if (isRanged) {
            // Ranged: bolt tracer from shooter + muzzle flash + big cyan impact
            if (aid && this.bots[aid]) {
              const ap = this.bots[aid].root.getPosition();
              this.spawnBurst(ap.x, 0.8, ap.z, '#27D9E8', 6, 180);
              this.spawnBolt(ap.x, 0.8, ap.z, tp.x, 0.8, tp.z);
            }
            this.spawnBurst(tp.x, 0.5, tp.z, '#27D9E8', 20, 500);
            this.spawnBurst(tp.x, 0.8, tp.z, '#ffffff', 8, 200);
            this.triggerShake(0.15, 0.15);
            const rangedText = this.vfxCounter++ % 2 === 0 ? 'ZZT!' : 'WHIP!';
            this.dispatchVfx(rangedText, '#27D9E8');
          } else {
            // Melee: chunky radial burst
            this.spawnMeleeBurst(tp, aid === 'botA' ? '#00E5FF' : '#EB4D4B');
            this.triggerShake(0.4, 0.25);
            const meleeText = this.vfxCounter++ % 2 === 0 ? 'KAPOW!' : 'CRACK!';
            this.dispatchVfx(meleeText, '#FF4D4D');
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
          const teamColor = aid === 'botA' ? '#00E5FF' : '#EB4D4B';
          // Motion trail — 3 ghost-trail particles
          for (let i = 0; i < 3; i++) {
            const gp = this.spawnParticle(p, hexColor(teamColor));
            gp.entity.setLocalScale(0.5, 0.8, 0.5);
            gp.initScale = { x: 0.5, y: 0.8, z: 0.5 };
            gp.vx = 0;
            gp.vy = 0;
            gp.vz = 0;
            gp.ttl = 0.2 - i * 0.05;
            gp.maxTtl = 0.2;
          }
        }
      }

      if (evt.type === 'MATCH_END') {
        const loserId = snapshot.winnerId === 'botA' ? 'botB' : 'botA';
        if (this.bots[loserId]) {
          const p = this.bots[loserId].root.getPosition();
          this.spawnBurst(p.x, 0.5, p.z, '#ffffff', 30, 1200);
          this.spawnBurst(p.x, 0.5, p.z, '#ffd600', 20, 1000);
        }
        this.hitStopUntil = Date.now() + 400;
        this.triggerShake(1.0, 0.6);
        this.dispatchVfx('K.O.!!!', '#FFD600');
      }
    }
  }

  /* ── Per-frame tick ─────────────────────────────────────── */

  private tick(dt: number): void {
    // Hit-stop freeze
    if (Date.now() < this.hitStopUntil) return;

    this.time += dt;

    // Idle sway — gentle sin-wave Y rotation when not moving
    for (const [id, b] of Object.entries(this.bots)) {
      const t = this.target[id];
      if (!t) continue;
      const pos = b.root.getPosition();
      const dx = t.x - pos.x;
      const dz = t.z - pos.z;
      const isMoving = Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05;

      if (isMoving) {
        // Tween toward target
        const nx = pos.x + dx * Math.min(1, dt * TWEEN_SPEED);
        const nz = pos.z + dz * Math.min(1, dt * TWEEN_SPEED);
        b.root.setPosition(nx, 0, nz);
        // Face movement direction
        b.root.setEulerAngles(0, Math.atan2(dx, dz) * (180 / Math.PI), 0);
      } else {
        // Snap to target
        b.root.setPosition(t.x, 0, t.z);
        // Idle sway
        const offset = id === 'botA' ? 0 : Math.PI;
        b.root.setLocalEulerAngles(0, Math.sin(this.time * 1.2 + offset) * 8, 0);
      }
    }

    // Objective zone pulse
    const obj = this.app.root.findByName('objective');
    if (obj) {
      const pulse = 1 + Math.sin(this.time * 4.8) * 0.04;
      obj.setLocalScale(6 * pulse, 0.12, 6 * pulse);
    }

    // Camera shake
    if (this.shake.ttl > 0) {
      this.shake.ttl -= dt;
      const decay = Math.max(0, this.shake.ttl / 0.3);
      this.cameraEntity.setLocalPosition(
        10 + this.shake.x * decay,
        12,
        ARENA + 2 + this.shake.z * decay,
      );
      if (this.shake.ttl <= 0) {
        this.cameraEntity.setLocalPosition(10, 12, ARENA + 2);
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
      if (!p.noScale) {
        p.vy -= 8 * dt; // gravity
      }
      const pos = p.entity.getPosition();
      p.entity.setPosition(
        pos.x + p.vx * dt,
        p.noScale ? pos.y : Math.max(0.03, pos.y + p.vy * dt),
        pos.z + p.vz * dt,
      );
      if (!p.noScale) {
        const frac = p.ttl / p.maxTtl;
        if (p.initScale) {
          p.entity.setLocalScale(
            p.initScale.x * frac,
            p.initScale.y * frac,
            p.initScale.z * frac,
          );
        } else {
          const s = 0.06 * frac;
          p.entity.setLocalScale(s, s, s);
        }
      } else if (p.boltLength !== undefined) {
        const frac = p.ttl / p.maxTtl;
        const w = 0.07 * frac;
        p.entity.setLocalScale(w, w, p.boltLength);
      }
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
