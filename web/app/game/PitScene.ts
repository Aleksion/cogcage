/**
 * PitScene.ts — Babylon.js arena renderer for The Molt Pit.
 *
 * Isometric orthographic camera, 20x20 grid, MAP 001 "THE STANDARD",
 * real Crustie GLB models from CDN, HP bars (GUI billboards),
 * bioluminescent deep-sea lighting, and action VFX animations.
 *
 * Consumes MatchSnapshot from Cloudflare DO WebSocket ticks.
 */

import '@babylonjs/loaders/glTF';
import {
  Engine,
  Scene,
  SceneLoader,
  UniversalCamera,
  PBRMaterial,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  AbstractMesh,
  Animation,
  AnimationGroup,
  TransformNode,
  GlowLayer,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Rectangle,
  Control,
  TextBlock,
  StackPanel,
} from '@babylonjs/gui';
import {
  ARENA_SIZE_UNITS,
  UNIT_SCALE,
  HP_MAX,
} from '../lib/ws2/constants';
import type { GameState, GameEvent, ActorState } from '../lib/ws2/engine';

/* ── Layout ─────────────────────────────────────────────────────── */

const GRID_CELLS = ARENA_SIZE_UNITS; // 20
const CELL_SIZE = 1; // 1 Babylon unit per cell
const ARENA_WORLD = GRID_CELLS * CELL_SIZE; // 20
const TWEEN_FRAMES = 13; // ~217ms at 60fps, fits inside 250ms tick with margin
const FPS = 60;

/* ── Brine Palette ──────────────────────────────────────────────── */

const C_BRINE_BG = Color4.FromHexString('#050510FF');
const C_GRID_LINE = Color3.FromHexString('#0a1628');
const C_GRID_GLOW = Color3.FromHexString('#00e5ff');
const C_CYAN = Color3.FromHexString('#00e5ff');
const C_RED = Color3.FromHexString('#ff1744');
const C_YELLOW = Color3.FromHexString('#ffd600');
const C_GREEN = Color3.FromHexString('#00c853');
const C_PURPLE = Color3.FromHexString('#9c27b0');

/* ── Skeletal animation types ───────────────────────────────────── */

type AnimClipName = 'idle' | 'walk' | 'attack' | 'hit' | 'death';
type AnimState = 'idle' | 'walk' | 'attack' | 'hit' | 'death';
type SfxKey = 'pinch' | 'spit' | 'scuttle' | 'shellUp' | 'burst' | 'ko';

interface CrustieAnims {
  idle: AnimationGroup;
  walk: AnimationGroup | null;
  attack: AnimationGroup | null;
  hit: AnimationGroup | null;
  death: AnimationGroup | null;
}

const RIGGED_SPECIES = new Set(['lobster', 'mantis', 'shrimp']);

const SPECIES_CLIPS: Record<string, AnimClipName[]> = {
  lobster: ['idle', 'walk', 'attack', 'hit', 'death'],
  shrimp:  ['idle', 'walk', 'attack', 'death'],       // NO hit
  mantis:  ['idle', 'walk', 'attack', 'death'],       // NO hit
};

const CDN_BASE = 'https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d';
function animClipUrl(species: string, clip: AnimClipName): string {
  return `${CDN_BASE}/animations/${species}-${clip}.glb`;
}

const SFX_PATHS: Record<SfxKey, string> = {
  pinch:   '/sfx/actions/pinch.mp3',
  spit:    '/sfx/actions/spit.mp3',
  scuttle: '/sfx/actions/scuttle.mp3',
  shellUp: '/sfx/actions/shell-up.mp3',
  burst:   '/sfx/actions/burst.mp3',
  ko:      '/sfx/ui/ko.mp3',
};

/* ── GLB CDN URLs (Vercel Blob — permanent) ──────────────────────── */

const CRUSTIE_GLBS: Record<string, string> = {
  lobster: 'https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-lobster-rigged-aWcVTCfhMxG0TtVUPtaNmkCKaUgB9v.glb',
  crab: 'https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-crab-khUCfgl6zHSHOdiP2cMPeBA38tZRo3.glb',
  mantis: 'https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-mantis-rigged-jMO6pjjbMa8XeQQbjM2OMyevvBYxcs.glb',
  hermit: 'https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-hermit-YnSbhLPGa5nGN4O4dgNoHb7d36y7f3.glb',
  shrimp: 'https://kqbdw25fudwhkara.public.blob.vercel-storage.com/3d/crustie-shrimp-rigged-R3MQvmXMlAGXXpAviKcQ3DcycXJzAM.glb',
};

/** Default species for each team slot */
const ALPHA_SPECIES = 'lobster';
const BETA_SPECIES = 'crab';

/* ── GLB scale (Meshy default is large — normalize) ──────────────── */

const GLB_SCALE = 0.5;

const C_WALL = Color3.FromHexString('#1a0a2e');
const C_WALL_TRIM = Color3.FromHexString('#6a1b9a');
const C_COVER = Color3.FromHexString('#1b2838');
const C_HAZARD = Color3.FromHexString('#ff6d00');
const C_HAZARD_BG = Color3.FromHexString('#331a00');

/* ── Action name mapping (engine → lore) ─────────────────────────── */

const LORE_NAMES: Record<string, string> = {
  MOVE: 'SCUTTLE',
  MELEE_STRIKE: 'PINCH',
  RANGED_SHOT: 'SPIT',
  GUARD: 'SHELL UP',
  DASH: 'BURST',
  UTILITY: 'UTILITY',
  NO_OP: 'IDLE',
};

/* ── MAP 001 "THE STANDARD" ──────────────────────────────────────── */

type TileType = 'OPEN' | 'WALL' | 'COVER' | 'HAZARD';

const MAP_STANDARD: TileType[][] = (() => {
  const raw = [
    '....................',
    '....................',
    '..WW..........WW..',
    '..W...C.....C..W..',
    '.....C.......C.....',
    '....................',
    '..C...........C....',
    '..C...HH....HH..C.',
    '.....HH....HH.....',
    '....................',
    '....................',
    '.....HH....HH.....',
    '.....HH....HH.....',
    '..C...........C....',
    '..C...........C....',
    '....................',
    '.....C.......C.....',
    '..W..C......C..W...',
    '..WW..........WW..',
    '....................',
  ];
  const charMap: Record<string, TileType> = { '.': 'OPEN', W: 'WALL', C: 'COVER', H: 'HAZARD' };
  const grid: TileType[][] = [];
  for (let r = 0; r < GRID_CELLS; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < GRID_CELLS; c++) {
      const ch = raw[r]?.[c] || '.';
      row.push(charMap[ch] || 'OPEN');
    }
    grid.push(row);
  }
  return grid;
})();

/* ── Snapshot types (consumed from WS) ───────────────────────────── */

export interface DecisionEntry {
  actorId: string;
  tick: number;
  action: { type: string; dir?: string | null; targetId?: string | null };
  reasoning?: string;
}

export interface MatchSnapshot {
  state: GameState;
  decisions: DecisionEntry[];
  newEvents: GameEvent[];
}

/* ── Coordinate helpers ──────────────────────────────────────────── */

function posToWorld(pos: { x: number; y: number }): Vector3 {
  // pos.x, pos.y are in UNIT_SCALE tenths (0-200 for 20 units)
  // Map to Babylon world coords: x right, z forward (we use x/z for ground plane)
  return new Vector3(
    (pos.x / UNIT_SCALE) * CELL_SIZE,
    0,
    (pos.y / UNIT_SCALE) * CELL_SIZE,
  );
}

function hpColorHex(hp: number): string {
  if (hp > 60) return '#00c853';
  if (hp > 30) return '#ffd600';
  return '#ff1744';
}

/* ══════════════════════════════════════════════════════════════════
   PitScene — Babylon.js Arena
   ══════════════════════════════════════════════════════════════════ */

export class PitScene {
  private engine: Engine;
  private scene: Scene;
  private canvas: HTMLCanvasElement;

  /* Crustie GLB roots */
  private alphaNode!: TransformNode;
  private betaNode!: TransformNode;
  private alphaMeshes: AbstractMesh[] = [];
  private betaMeshes: AbstractMesh[] = [];
  private alphaLoaded = false;
  private betaLoaded = false;

  /* GUI */
  private guiTexture!: AdvancedDynamicTexture;
  private alphaHpBar!: Rectangle;
  private alphaHpFill!: Rectangle;
  private alphaHpText!: TextBlock;
  private betaHpBar!: Rectangle;
  private betaHpFill!: Rectangle;
  private betaHpText!: TextBlock;
  private alphaNameText!: TextBlock;
  private betaNameText!: TextBlock;
  private tickText!: TextBlock;

  /* Skeletal animations */
  private alphaAnims: CrustieAnims | null = null;
  private betaAnims: CrustieAnims | null = null;
  private alphaAnimState: AnimState = 'idle';
  private betaAnimState: AnimState = 'idle';
  private alphaDead = false;
  private betaDead = false;

  /* SFX */
  private sfx: Record<SfxKey, HTMLAudioElement | null> = {
    pinch: null, spit: null, scuttle: null, shellUp: null, burst: null, ko: null,
  };
  private sfxReady = false;

  /* VFX */
  private glowLayer!: GlowLayer;

  /* Tile meshes for hazard pulse */
  private hazardMeshes: Mesh[] = [];
  private hazardPulseTime = 0;

  /* State */
  private botNames: Record<string, string> = {};
  private lastAlphaId = '';
  private lastBetaId = '';
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = C_BRINE_BG;

    this.setupCamera();
    this.setupLighting();
    this.setupGrid();
    this.setupMapTiles();
    this.setupCrusties();
    this.setupGUI();
    this.setupGlow();
    this.preloadSfx();

    // Render loop
    this.engine.runRenderLoop(() => {
      if (this.disposed) return;
      this.animateHazards();
      this.scene.render();
    });

    // Handle resize
    const onResize = () => this.engine.resize();
    window.addEventListener('resize', onResize);
    this.scene.onDisposeObservable.addOnce(() => {
      window.removeEventListener('resize', onResize);
    });
  }

  /* ── Camera ──────────────────────────────────────────────────── */

  private setupCamera(): void {
    // Isometric orthographic camera — TFT/LoL angle (~45° elevation)
    const camera = new UniversalCamera('camera', new Vector3(10, 18, -6), this.scene);
    camera.setTarget(new Vector3(10, 0, 10)); // Center of arena
    camera.mode = UniversalCamera.ORTHOGRAPHIC_CAMERA;

    // Orthographic bounds — fit 20x20 grid with padding
    const aspect = this.canvas.width / this.canvas.height;
    const orthoSize = 13; // Half the visible area in world units
    camera.orthoTop = orthoSize;
    camera.orthoBottom = -orthoSize;
    camera.orthoLeft = -orthoSize * aspect;
    camera.orthoRight = orthoSize * aspect;

    camera.minZ = 0.1;
    camera.maxZ = 100;
  }

  /* ── Lighting ────────────────────────────────────────────────── */

  private setupLighting(): void {
    // Ambient — dim deep-sea
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.3;
    ambient.diffuse = new Color3(0.05, 0.1, 0.15);
    ambient.groundColor = new Color3(0.02, 0.04, 0.06);

    // Bioluminescent point lights
    const biolum1 = new PointLight('biolum1', new Vector3(5, 3, 5), this.scene);
    biolum1.diffuse = C_CYAN.clone();
    biolum1.intensity = 0.4;
    biolum1.range = 15;

    const biolum2 = new PointLight('biolum2', new Vector3(15, 3, 15), this.scene);
    biolum2.diffuse = C_PURPLE.clone();
    biolum2.intensity = 0.3;
    biolum2.range = 15;

    // Overhead fill
    const fill = new PointLight('fill', new Vector3(10, 8, 10), this.scene);
    fill.diffuse = new Color3(0.15, 0.2, 0.3);
    fill.intensity = 0.6;
    fill.range = 30;
  }

  /* ── Grid floor ──────────────────────────────────────────────── */

  private setupGrid(): void {
    // Ground plane
    const ground = MeshBuilder.CreateGround('ground', {
      width: ARENA_WORLD,
      height: ARENA_WORLD,
    }, this.scene);
    ground.position = new Vector3(ARENA_WORLD / 2, -0.01, ARENA_WORLD / 2);

    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.02, 0.02, 0.05);
    groundMat.specularColor = Color3.Black();
    groundMat.emissiveColor = new Color3(0.01, 0.02, 0.03);
    ground.material = groundMat;

    // Grid lines (using thin boxes as lines)
    const lineMat = new StandardMaterial('lineMat', this.scene);
    lineMat.diffuseColor = C_GRID_LINE;
    lineMat.emissiveColor = C_GRID_LINE.scale(0.5);
    lineMat.specularColor = Color3.Black();

    const glowLineMat = new StandardMaterial('glowLineMat', this.scene);
    glowLineMat.diffuseColor = C_GRID_GLOW.scale(0.3);
    glowLineMat.emissiveColor = C_GRID_GLOW.scale(0.15);
    glowLineMat.specularColor = Color3.Black();

    for (let i = 0; i <= GRID_CELLS; i++) {
      const mat = i % 5 === 0 ? glowLineMat : lineMat;
      const thickness = i % 5 === 0 ? 0.04 : 0.02;

      // Horizontal line (along X)
      const hLine = MeshBuilder.CreateBox(`hLine${i}`, {
        width: ARENA_WORLD, height: 0.01, depth: thickness,
      }, this.scene);
      hLine.position = new Vector3(ARENA_WORLD / 2, 0, i * CELL_SIZE);
      hLine.material = mat;

      // Vertical line (along Z)
      const vLine = MeshBuilder.CreateBox(`vLine${i}`, {
        width: thickness, height: 0.01, depth: ARENA_WORLD,
      }, this.scene);
      vLine.position = new Vector3(i * CELL_SIZE, 0, ARENA_WORLD / 2);
      vLine.material = mat;
    }
  }

  /* ── Map tiles ───────────────────────────────────────────────── */

  private setupMapTiles(): void {
    const wallMat = new StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = C_WALL;
    wallMat.emissiveColor = C_WALL_TRIM.scale(0.3);
    wallMat.specularColor = Color3.Black();

    const coverMat = new StandardMaterial('coverMat', this.scene);
    coverMat.diffuseColor = C_COVER;
    coverMat.emissiveColor = C_COVER.scale(0.2);
    coverMat.specularColor = Color3.Black();

    const hazardMat = new StandardMaterial('hazardMat', this.scene);
    hazardMat.diffuseColor = C_HAZARD_BG;
    hazardMat.emissiveColor = C_HAZARD.scale(0.15);
    hazardMat.specularColor = Color3.Black();
    hazardMat.alpha = 0.8;

    for (let r = 0; r < GRID_CELLS; r++) {
      for (let c = 0; c < GRID_CELLS; c++) {
        const tile = MAP_STANDARD[r][c];
        if (tile === 'OPEN') continue;

        const cx = c * CELL_SIZE + CELL_SIZE / 2;
        const cz = r * CELL_SIZE + CELL_SIZE / 2;

        if (tile === 'WALL') {
          const wall = MeshBuilder.CreateBox(`wall_${r}_${c}`, {
            width: CELL_SIZE * 0.9, height: 0.6, depth: CELL_SIZE * 0.9,
          }, this.scene);
          wall.position = new Vector3(cx, 0.3, cz);
          wall.material = wallMat;

          // Trim glow dot on top
          const dot = MeshBuilder.CreateSphere(`wallDot_${r}_${c}`, { diameter: 0.12 }, this.scene);
          dot.position = new Vector3(cx, 0.62, cz);
          const dotMat = new StandardMaterial(`wallDotMat_${r}_${c}`, this.scene);
          dotMat.emissiveColor = C_WALL_TRIM;
          dotMat.disableLighting = true;
          dot.material = dotMat;
        } else if (tile === 'COVER') {
          const cover = MeshBuilder.CreateBox(`cover_${r}_${c}`, {
            width: CELL_SIZE * 0.8, height: 0.35, depth: CELL_SIZE * 0.8,
          }, this.scene);
          cover.position = new Vector3(cx, 0.175, cz);
          cover.material = coverMat;
        } else if (tile === 'HAZARD') {
          const hazard = MeshBuilder.CreateGround(`hazard_${r}_${c}`, {
            width: CELL_SIZE * 0.9, height: CELL_SIZE * 0.9,
          }, this.scene);
          hazard.position = new Vector3(cx, 0.01, cz);
          hazard.material = hazardMat;
          this.hazardMeshes.push(hazard);

          // Hazard glow sphere (pulses)
          const glow = MeshBuilder.CreateSphere(`hazGlow_${r}_${c}`, { diameter: 0.25 }, this.scene);
          glow.position = new Vector3(cx, 0.15, cz);
          const glowMat = new StandardMaterial(`hazGlowMat_${r}_${c}`, this.scene);
          glowMat.emissiveColor = C_HAZARD;
          glowMat.disableLighting = true;
          glowMat.alpha = 0.4;
          glow.material = glowMat;
        }
      }
    }
  }

  /* ── Crustie GLB models ──────────────────────────────────── */

  private setupCrusties(): void {
    // Create parent nodes immediately (position updates work before GLBs load)
    this.alphaNode = new TransformNode('alphaNode', this.scene);
    this.betaNode = new TransformNode('betaNode', this.scene);

    // Initial positions (off-grid, moved on first snapshot)
    this.alphaNode.position = new Vector3(-2, 0, -2);
    this.betaNode.position = new Vector3(-2, 0, -2);

    // Load GLBs async — Lobster vs Crab default
    this.loadCrustieGLB(ALPHA_SPECIES, this.alphaNode, 'alpha');
    this.loadCrustieGLB(BETA_SPECIES, this.betaNode, 'beta');
  }

  private async loadCrustieGLB(
    species: string,
    parentNode: TransformNode,
    team: 'alpha' | 'beta',
  ): Promise<void> {
    const url = CRUSTIE_GLBS[species];
    if (!url) return;

    try {
      const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);
      if (this.disposed) {
        result.meshes.forEach(m => m.dispose());
        return;
      }

      const root = result.meshes[0];
      if (!root) return;

      // Parent to team node
      root.parent = parentNode;
      root.scaling = new Vector3(GLB_SCALE, GLB_SCALE, GLB_SCALE);
      root.position = Vector3.Zero(); // offset handled by parentNode

      // Apply toon/cel-shading + outlines to all child meshes
      const meshes: AbstractMesh[] = [];
      for (const m of result.meshes) {
        if (m.material) {
          // GLB materials are PBRMaterial (albedoColor), not StandardMaterial (diffuseColor)
          const origMat = m.material;
          const color = origMat instanceof PBRMaterial
            ? origMat.albedoColor?.clone() ?? new Color3(1, 1, 1)
            : (origMat as StandardMaterial).diffuseColor?.clone() ?? new Color3(1, 1, 1);
          const toonMat = new StandardMaterial(`toon_${team}_${m.name}`, this.scene);
          toonMat.diffuseColor = color;
          toonMat.specularColor = Color3.Black(); // flat, no specular highlight
          toonMat.emissiveColor = color.scale(0.1); // subtle self-illumination in the dark
          m.material = toonMat;
        }

        // Borderlands-style thick outlines
        if (m instanceof Mesh) {
          m.renderOutline = true;
          m.outlineColor = Color3.Black();
          m.outlineWidth = 0.05;
        }

        meshes.push(m);
      }

      if (team === 'alpha') {
        this.alphaMeshes = meshes;
        this.alphaLoaded = true;
      } else {
        this.betaMeshes = meshes;
        this.betaLoaded = true;
      }

      // Load skeletal animation clips for rigged species
      if (RIGGED_SPECIES.has(species)) {
        const anims = await this.loadAnimationClips(species, result.meshes[0]);
        if (anims) {
          if (team === 'alpha') this.alphaAnims = anims;
          else this.betaAnims = anims;
          // Start idle loop
          anims.idle.start(true);
        }
      }
    } catch (err) {
      console.warn(`[PitScene] Failed to load ${species} GLB, using fallback capsule:`, err);
      this.createFallbackCapsule(parentNode, team);
    }
  }

  /** Capsule fallback if GLB load fails (network error, etc.) */
  private createFallbackCapsule(parent: TransformNode, team: 'alpha' | 'beta'): void {
    const color = team === 'alpha' ? C_CYAN : C_RED;
    const capsule = MeshBuilder.CreateCapsule(`${team}_fallback`, {
      height: 0.8, radius: 0.25,
    }, this.scene);
    capsule.parent = parent;
    capsule.position.y = 0.4;

    const mat = new StandardMaterial(`${team}_fallbackMat`, this.scene);
    mat.diffuseColor = color.scale(0.8);
    mat.emissiveColor = color.scale(0.3);
    mat.specularColor = Color3.Black();
    capsule.material = mat;
    capsule.renderOutline = true;
    capsule.outlineColor = Color3.Black();
    capsule.outlineWidth = 0.05;

    if (team === 'alpha') {
      this.alphaMeshes = [capsule];
      this.alphaLoaded = true;
    } else {
      this.betaMeshes = [capsule];
      this.betaLoaded = true;
    }
  }

  /* ── Load animation clips for rigged species ────────────────── */

  private async loadAnimationClips(
    species: string,
    baseRoot: AbstractMesh,
  ): Promise<CrustieAnims | null> {
    const clips = SPECIES_CLIPS[species];
    if (!clips || clips.length === 0) return null;

    // Get all target bones/transforms from the base model skeleton
    const baseDescendants = baseRoot.getDescendants(false);

    const loaded: Partial<Record<AnimClipName, AnimationGroup>> = {};

    await Promise.all(
      clips.map(async (clipName) => {
        try {
          const url = animClipUrl(species, clipName);
          const clipResult = await SceneLoader.ImportMeshAsync('', '', url, this.scene);
          if (this.disposed) {
            clipResult.meshes.forEach(m => m.dispose());
            return;
          }

          const group = clipResult.animationGroups[0];
          if (!group) {
            clipResult.meshes.forEach(m => m.dispose());
            return;
          }

          // Retarget: match animation targets to base skeleton by name
          for (const anim of group.targetedAnimations) {
            const srcTarget = anim.target;
            if (!srcTarget?.name) continue;
            const match = baseDescendants.find(d => d.name === srcTarget.name);
            if (match) {
              anim.target = match;
            }
          }

          // Dispose clip meshes (we only need the animation data)
          clipResult.meshes.forEach(m => m.dispose());

          group.stop();
          loaded[clipName] = group;
        } catch (err) {
          console.warn(`[PitScene] Failed to load ${species}/${clipName} clip:`, err);
        }
      }),
    );

    // idle is required — without it, no skeletal anims
    const idle = loaded.idle;
    if (!idle) return null;

    return {
      idle,
      walk: loaded.walk ?? idle,     // fallback to idle
      attack: loaded.attack ?? idle, // fallback to idle
      hit: loaded.hit ?? null,       // null → use vfxHitPulse
      death: loaded.death ?? null,   // null → no freeze-frame
    };
  }

  /* ── Animation state machine ────────────────────────────────── */

  private playAnimClip(
    anims: CrustieAnims,
    clipName: AnimState,
    team: 'alpha' | 'beta',
    loop = false,
  ): void {
    // Death is terminal — never interrupted
    if (team === 'alpha' && this.alphaDead) return;
    if (team === 'beta' && this.betaDead) return;

    const clip = anims[clipName];
    if (!clip) return;

    // Stop all clips (pass true to skip onAnimationEnd callbacks)
    for (const key of ['idle', 'walk', 'attack', 'hit', 'death'] as AnimClipName[]) {
      anims[key]?.stop();
    }

    if (team === 'alpha') this.alphaAnimState = clipName;
    else this.betaAnimState = clipName;

    if (clipName === 'death') {
      // Death: play once, freeze on last frame
      if (team === 'alpha') this.alphaDead = true;
      else this.betaDead = true;

      clip.start(false);
      clip.onAnimationGroupEndObservable.addOnce(() => {
        clip.goToFrame(clip.to);
        clip.pause();
      });
      return;
    }

    if (loop) {
      clip.start(true);
    } else {
      clip.start(false);
      // Auto-return to idle when non-looping clip finishes
      clip.onAnimationGroupEndObservable.addOnce(() => {
        if (team === 'alpha' && !this.alphaDead) {
          this.alphaAnimState = 'idle';
          anims.idle.start(true);
        } else if (team === 'beta' && !this.betaDead) {
          this.betaAnimState = 'idle';
          anims.idle.start(true);
        }
      });
    }
  }

  /* ── SFX preload + play ─────────────────────────────────────── */

  private preloadSfx(): void {
    for (const [key, path] of Object.entries(SFX_PATHS)) {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        this.sfx[key as SfxKey] = audio;
      } catch {
        // Silently skip — SFX is non-critical
      }
    }
    this.sfxReady = true;
  }

  private playSfx(key: SfxKey): void {
    if (!this.sfxReady) return;
    const audio = this.sfx[key];
    if (!audio) return;

    try {
      if (!audio.paused) {
        // Clone for overlapping playback
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.play().catch(() => {});
      } else {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {
      // Autoplay policy or other browser restriction — silently skip
    }
  }

  /* ── GUI (HP bars, names, tick counter) ────────────────────── */

  private setupGUI(): void {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, this.scene);

    // Tick counter (top-right)
    this.tickText = new TextBlock('tickText', 'TICK 0');
    this.tickText.color = '#555555';
    this.tickText.fontSize = 14;
    this.tickText.fontFamily = '"IBM Plex Mono", monospace';
    this.tickText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.tickText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.tickText.paddingRight = '12px';
    this.tickText.paddingTop = '8px';
    this.guiTexture.addControl(this.tickText);

    // Alpha HUD panel (top-left)
    const alphaPanel = this.createHudPanel('alphaPanel', '#00e5ff', 20, 8);
    this.guiTexture.addControl(alphaPanel.container);
    this.alphaNameText = alphaPanel.nameText;
    this.alphaHpBar = alphaPanel.hpBg;
    this.alphaHpFill = alphaPanel.hpFill;
    this.alphaHpText = alphaPanel.hpText;

    // Beta HUD panel (top-left, offset down)
    const betaPanel = this.createHudPanel('betaPanel', '#ff1744', 20, 52);
    this.guiTexture.addControl(betaPanel.container);
    this.betaNameText = betaPanel.nameText;
    this.betaHpBar = betaPanel.hpBg;
    this.betaHpFill = betaPanel.hpFill;
    this.betaHpText = betaPanel.hpText;
  }

  private createHudPanel(name: string, color: string, left: number, top: number) {
    const container = new StackPanel(`${name}_stack`);
    container.width = '220px';
    container.height = '38px';
    container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    container.left = `${left}px`;
    container.top = `${top}px`;
    container.isVertical = true;

    const nameText = new TextBlock(`${name}_name`, 'LOBSTER');
    nameText.color = color;
    nameText.fontSize = 11;
    nameText.fontFamily = '"IBM Plex Mono", monospace';
    nameText.height = '16px';
    nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.addControl(nameText);

    // HP bar background
    const hpBg = new Rectangle(`${name}_hpBg`);
    hpBg.width = '200px';
    hpBg.height = '10px';
    hpBg.background = '#111111';
    hpBg.thickness = 0;
    hpBg.cornerRadius = 2;
    hpBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    // HP fill
    const hpFill = new Rectangle(`${name}_hpFill`);
    hpFill.width = '200px';
    hpFill.height = '10px';
    hpFill.background = color;
    hpFill.thickness = 0;
    hpFill.cornerRadius = 2;
    hpFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    hpBg.addControl(hpFill);

    // HP text overlay
    const hpText = new TextBlock(`${name}_hpText`, '100/100');
    hpText.color = '#ffffff';
    hpText.fontSize = 8;
    hpText.fontFamily = '"IBM Plex Mono", monospace';
    hpBg.addControl(hpText);

    container.addControl(hpBg);

    return { container, nameText, hpBg, hpFill, hpText };
  }

  /* ── Glow layer ──────────────────────────────────────────────── */

  private setupGlow(): void {
    this.glowLayer = new GlowLayer('glow', this.scene, {
      mainTextureFixedSize: 512,
      blurKernelSize: 32,
    });
    this.glowLayer.intensity = 0.6;
  }

  /* ── Hazard pulse animation ──────────────────────────────────── */

  private animateHazards(): void {
    this.hazardPulseTime += this.engine.getDeltaTime();
    const pulse = 0.5 + 0.3 * Math.sin(this.hazardPulseTime * 0.003);
    for (const mesh of this.hazardMeshes) {
      const mat = mesh.material as StandardMaterial;
      if (mat) {
        mat.emissiveColor = C_HAZARD.scale(pulse * 0.3);
      }
    }
  }

  /* ── Public API ──────────────────────────────────────────────── */

  setBotNames(names: Record<string, string>): void {
    this.botNames = { ...this.botNames, ...names };
  }

  applySnapshot(snap: MatchSnapshot): void {
    if (this.disposed) return;

    const actors = snap.state.actors;
    const ids = Object.keys(actors).sort();
    const alphaId = ids[0];
    const betaId = ids[1];
    if (!alphaId || !betaId) return;

    const alpha = actors[alphaId];
    const beta = actors[betaId];
    if (!alpha || !beta) return;

    this.lastAlphaId = alphaId;
    this.lastBetaId = betaId;

    // Tick counter
    this.tickText.text = `TICK ${snap.state.tick}`;

    // Names
    const alphaName = this.botNames[alphaId] || alphaId;
    const betaName = this.botNames[betaId] || betaId;
    this.alphaNameText.text = alphaName;
    this.betaNameText.text = betaName;

    // Move Crusties (animated lerp)
    const aTarget = posToWorld(alpha.position);
    const bTarget = posToWorld(beta.position);
    aTarget.y = 0;
    bTarget.y = 0;

    this.animateNodeTo(this.alphaNode, aTarget);
    this.animateNodeTo(this.betaNode, bTarget);

    // Update HP bars
    this.updateHpBar(
      alpha.hp, this.alphaHpFill, this.alphaHpText,
      this.alphaNameText, alphaName,
    );
    this.updateHpBar(
      beta.hp, this.betaHpFill, this.betaHpText,
      this.betaNameText, betaName,
    );

    // Process events for VFX
    for (const evt of snap.newEvents) {
      this.processEvent(evt, actors);
    }

    // Match end
    if (snap.state.ended) {
      this.showMatchEnd(snap.state.winnerId, alphaId, betaId);
    }
  }

  /* ── Animation helper ────────────────────────────────────────── */

  private animateNodeTo(node: TransformNode, target: Vector3): void {
    const anim = new Animation(
      `${node.name}_move`,
      'position',
      FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    anim.setKeys([
      { frame: 0, value: node.position.clone() },
      { frame: TWEEN_FRAMES, value: target },
    ]);
    this.scene.beginDirectAnimation(node, [anim], 0, TWEEN_FRAMES, false);
  }

  /* ── HP bar update ───────────────────────────────────────────── */

  private updateHpBar(
    hp: number,
    fill: Rectangle,
    text: TextBlock,
    nameText: TextBlock,
    name: string,
  ): void {
    const pct = Math.max(0, hp) / HP_MAX;
    fill.width = `${Math.round(pct * 200)}px`;
    fill.background = hpColorHex(hp);
    text.text = `${Math.round(hp)}/${HP_MAX}`;
    nameText.text = `${name}  ${Math.round(hp)}/${HP_MAX}`;
  }

  /* ── Event VFX ───────────────────────────────────────────────── */

  private processEvent(evt: GameEvent, actors: Record<string, ActorState>): void {
    const data = evt.data as Record<string, unknown> | null;

    if (evt.type === 'DAMAGE_APPLIED' && data) {
      const targetId = evt.targetId;
      const target = targetId ? actors[targetId] : null;
      if (target) {
        this.vfxDamageNumber(posToWorld(target.position), data.amount as number);
        const isAlphaTarget = targetId === this.lastAlphaId;
        const hitNode = isAlphaTarget ? this.alphaNode : this.betaNode;
        const hitAnims = isAlphaTarget ? this.alphaAnims : this.betaAnims;
        const hitTeam: 'alpha' | 'beta' = isAlphaTarget ? 'alpha' : 'beta';

        // Skeletal hit animation if available, else procedural fallback
        if (hitAnims?.hit) {
          this.playAnimClip(hitAnims, 'hit', hitTeam);
        } else {
          this.vfxHitPulse(hitNode);
        }

        // Death check
        if (target.hp <= 0) {
          if (hitAnims) {
            this.playAnimClip(hitAnims, 'death', hitTeam);
          }
          this.playSfx('ko');
        }
      }
    }

    if (evt.type === 'ACTION_ACCEPTED' && data) {
      const actionType = (data.type as string) || '';
      const actorId = evt.actorId;
      const actor = actorId ? actors[actorId] : null;
      if (!actor) return;

      const origin = posToWorld(actor.position);
      const isAlpha = actorId === this.lastAlphaId;
      const anims = isAlpha ? this.alphaAnims : this.betaAnims;
      const team: 'alpha' | 'beta' = isAlpha ? 'alpha' : 'beta';

      if (actionType === 'MELEE_STRIKE') {
        if (anims) this.playAnimClip(anims, 'attack', team);
        this.playSfx('pinch');
        const target = evt.targetId ? actors[evt.targetId] : null;
        if (target) this.vfxPinch(origin, posToWorld(target.position));
      } else if (actionType === 'RANGED_SHOT') {
        if (anims) this.playAnimClip(anims, 'attack', team);
        this.playSfx('spit');
        const target = evt.targetId ? actors[evt.targetId] : null;
        if (target) this.vfxSpit(origin, posToWorld(target.position));
      } else if (actionType === 'MOVE') {
        if (anims) this.playAnimClip(anims, 'walk', team);
        this.playSfx('scuttle');
      } else if (actionType === 'GUARD') {
        this.playSfx('shellUp');
        this.vfxShellUp(origin);
      } else if (actionType === 'DASH') {
        this.playSfx('burst');
        this.vfxBurst(origin, isAlpha ? C_CYAN : C_RED);
      }
    }
  }

  /* ── VFX: PINCH (melee slash) ────────────────────────────────── */

  private vfxPinch(origin: Vector3, target: Vector3): void {
    // Slash line — box from origin to target
    const dir = target.subtract(origin);
    const dist = dir.length();
    const mid = origin.add(dir.scale(0.5));

    const slash = MeshBuilder.CreateBox('vfx_pinch', {
      width: 0.08, height: 0.08, depth: dist,
    }, this.scene);
    slash.position = mid.clone();
    slash.position.y = 0.5;
    slash.lookAt(target.add(new Vector3(0, 0.5, 0)));

    const slashMat = new StandardMaterial('slashMat', this.scene);
    slashMat.emissiveColor = C_RED;
    slashMat.disableLighting = true;
    slashMat.alpha = 0.9;
    slash.material = slashMat;

    // Impact flash at target
    const flash = MeshBuilder.CreateSphere('vfx_pinch_flash', { diameter: 0.5 }, this.scene);
    flash.position = target.clone();
    flash.position.y = 0.5;
    const flashMat = new StandardMaterial('flashMat', this.scene);
    flashMat.emissiveColor = Color3.White();
    flashMat.disableLighting = true;
    flashMat.alpha = 0.8;
    flash.material = flashMat;

    // Fade out
    this.fadeAndDispose(slash, slashMat, 300);
    this.fadeAndDispose(flash, flashMat, 200);
  }

  /* ── VFX: SPIT (ranged projectile) ──────────────────────────── */

  private vfxSpit(origin: Vector3, target: Vector3): void {
    const proj = MeshBuilder.CreateSphere('vfx_spit', { diameter: 0.2 }, this.scene);
    proj.position = origin.clone();
    proj.position.y = 0.5;

    const projMat = new StandardMaterial('spitMat', this.scene);
    projMat.emissiveColor = C_PURPLE;
    projMat.disableLighting = true;
    proj.material = projMat;

    // Animate to target
    const anim = new Animation(
      'spit_fly', 'position', FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    const targetPos = target.clone();
    targetPos.y = 0.5;
    anim.setKeys([
      { frame: 0, value: proj.position.clone() },
      { frame: 15, value: targetPos }, // ~250ms
    ]);
    proj.animations = [anim];

    this.scene.beginAnimation(proj, 0, 15, false, 1, () => {
      // Impact burst
      const burst = MeshBuilder.CreateSphere('vfx_spit_burst', { diameter: 0.6 }, this.scene);
      burst.position = targetPos.clone();
      const burstMat = new StandardMaterial('burstMat', this.scene);
      burstMat.emissiveColor = C_PURPLE;
      burstMat.disableLighting = true;
      burstMat.alpha = 0.6;
      burst.material = burstMat;
      this.fadeAndDispose(burst, burstMat, 300);
      proj.dispose();
    });
  }

  /* ── VFX: SHELL UP (shield bubble) ──────────────────────────── */

  private vfxShellUp(origin: Vector3): void {
    const shield = MeshBuilder.CreateSphere('vfx_guard', { diameter: 1.2 }, this.scene);
    shield.position = origin.clone();
    shield.position.y = 0.5;

    const shieldMat = new StandardMaterial('guardMat', this.scene);
    shieldMat.emissiveColor = C_GREEN;
    shieldMat.disableLighting = true;
    shieldMat.alpha = 0.2;
    shield.material = shieldMat;

    // Scale up and fade
    const scaleAnim = new Animation(
      'guard_scale', 'scaling', FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 36, value: new Vector3(1.4, 1.4, 1.4) }, // 600ms
    ]);
    shield.animations = [scaleAnim];
    this.scene.beginAnimation(shield, 0, 36, false);
    this.fadeAndDispose(shield, shieldMat, 600);
  }

  /* ── VFX: BURST (dash trail) ────────────────────────────────── */

  private vfxBurst(origin: Vector3, color: Color3): void {
    // Speed ring
    const ring = MeshBuilder.CreateTorus('vfx_burst', {
      diameter: 0.8, thickness: 0.06, tessellation: 24,
    }, this.scene);
    ring.position = origin.clone();
    ring.position.y = 0.3;

    const ringMat = new StandardMaterial('burstRingMat', this.scene);
    ringMat.emissiveColor = color;
    ringMat.disableLighting = true;
    ringMat.alpha = 0.7;
    ring.material = ringMat;

    const scaleAnim = new Animation(
      'burst_scale', 'scaling', FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 21, value: new Vector3(3, 1, 3) }, // 350ms
    ]);
    ring.animations = [scaleAnim];
    this.scene.beginAnimation(ring, 0, 21, false);
    this.fadeAndDispose(ring, ringMat, 350);
  }

  /* ── VFX: Scale pulse on hit (procedural — models not rigged) ── */

  private vfxHitPulse(node: TransformNode): void {
    const anim = new Animation(
      `${node.name}_hitpulse`, 'scaling', FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    anim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 4, value: new Vector3(1.2, 0.8, 1.2) },  // squash
      { frame: 8, value: new Vector3(0.9, 1.15, 0.9) },  // stretch
      { frame: 12, value: new Vector3(1, 1, 1) },         // settle
    ]);
    this.scene.beginDirectAnimation(node, [anim], 0, 12, false);
  }

  /* ── VFX: Damage number popup ───────────────────────────────── */

  private vfxDamageNumber(worldPos: Vector3, amount: number): void {
    const textBlock = new TextBlock('dmg', `-${Math.round(amount)}`);
    textBlock.color = '#ff1744';
    textBlock.fontSize = 18;
    textBlock.fontFamily = '"IBM Plex Mono", monospace';
    textBlock.fontWeight = 'bold';
    textBlock.outlineColor = '#000000';
    textBlock.outlineWidth = 3;
    this.guiTexture.addControl(textBlock);

    // Position above the target mesh
    textBlock.linkOffsetY = -60;

    // Find nearest mesh to link to
    const tempNode = new TransformNode('dmgAnchor', this.scene);
    tempNode.position = worldPos.clone();
    tempNode.position.y = 1;
    textBlock.linkWithMesh(tempNode);

    // Fade and remove
    let elapsed = 0;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      elapsed += this.engine.getDeltaTime();
      textBlock.linkOffsetY = -60 - (elapsed * 0.05);
      textBlock.alpha = Math.max(0, 1 - elapsed / 700);
      if (elapsed >= 700) {
        this.guiTexture.removeControl(textBlock);
        tempNode.dispose();
        this.scene.onBeforeRenderObservable.remove(observer);
      }
    });
  }

  /* ── Fade helper ─────────────────────────────────────────────── */

  private fadeAndDispose(mesh: Mesh, mat: StandardMaterial, durationMs: number): void {
    let elapsed = 0;
    const startAlpha = mat.alpha;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      elapsed += this.engine.getDeltaTime();
      mat.alpha = Math.max(0, startAlpha * (1 - elapsed / durationMs));
      if (elapsed >= durationMs) {
        mesh.dispose();
        mat.dispose();
        this.scene.onBeforeRenderObservable.remove(observer);
      }
    });
  }

  /* ── Match end overlay ──────────────────────────────────────── */

  private showMatchEnd(winnerId: string | null, alphaId: string, betaId: string): void {
    const winnerName = winnerId ? (this.botNames[winnerId] || winnerId) : 'DRAW';
    const winColor = winnerId === alphaId ? '#00e5ff' : winnerId === betaId ? '#ff1744' : '#ffd600';

    // Overlay background
    const overlay = new Rectangle('endOverlay');
    overlay.width = '100%';
    overlay.height = '100%';
    overlay.background = 'rgba(0, 0, 0, 0.75)';
    overlay.thickness = 0;
    this.guiTexture.addControl(overlay);

    // Title
    const title = new TextBlock('endTitle', 'SCUTTLE OVER');
    title.color = '#ffd600';
    title.fontSize = 36;
    title.fontFamily = '"IBM Plex Mono", monospace';
    title.fontWeight = 'bold';
    title.top = '-40px';
    overlay.addControl(title);

    // Winner name
    const winner = new TextBlock('endWinner', winnerName);
    winner.color = winColor;
    winner.fontSize = 28;
    winner.fontFamily = '"IBM Plex Mono", monospace';
    winner.fontWeight = 'bold';
    winner.top = '10px';
    overlay.addControl(winner);

    // "WINS" subtitle
    if (winnerId) {
      const subtitle = new TextBlock('endSub', 'WINS');
      subtitle.color = '#888888';
      subtitle.fontSize = 18;
      subtitle.fontFamily = '"IBM Plex Mono", monospace';
      subtitle.top = '45px';
      overlay.addControl(subtitle);
    }
  }

  /* ── Dispose ─────────────────────────────────────────────────── */

  dispose(): void {
    this.disposed = true;

    // Dispose animation groups
    for (const anims of [this.alphaAnims, this.betaAnims]) {
      if (!anims) continue;
      for (const key of ['idle', 'walk', 'attack', 'hit', 'death'] as AnimClipName[]) {
        const group = anims[key];
        if (group) {
          group.stop();
          group.dispose();
        }
      }
    }
    this.alphaAnims = null;
    this.betaAnims = null;

    // Release SFX audio elements
    for (const key of Object.keys(this.sfx) as SfxKey[]) {
      this.sfx[key] = null;
    }
    this.sfxReady = false;

    this.scene.dispose();
    this.engine.dispose();
  }
}
