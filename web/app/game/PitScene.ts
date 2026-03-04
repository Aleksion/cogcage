/**
 * PitScene.ts — Babylon.js arena renderer for The Molt Pit.
 *
 * Isometric orthographic camera, 20x20 grid, MAP 001 "THE STANDARD",
 * real Crustie GLB models from CDN, HP bars (GUI billboards),
 * bioluminescent deep-sea lighting, and action VFX animations.
 *
 * N-actor architecture: supports any number of combatants via
 * a Map<string, ActorRenderState>. Actors are created on demand
 * from the first snapshot that references them.
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

/* ── N-actor color palette (cycle for >2 actors) ──────────────── */

const ACTOR_COLORS = [
  Color3.FromHexString('#00e5ff'), // cyan
  Color3.FromHexString('#ff1744'), // red
  Color3.FromHexString('#ffd600'), // yellow
  Color3.FromHexString('#00c853'), // green
  Color3.FromHexString('#9c27b0'), // purple
];

const DEFAULT_SPECIES = ['lobster', 'crab', 'mantis', 'hermit', 'shrimp'];

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

/* ── GLB scale (Meshy default is large — normalize) ──────────────── */

const GLB_BASE_SCALE = 0.5;
const WORLD_Y_OFFSET = 0.08;

type ViewportBucket = 'desktop' | 'tablet' | 'mobile';

interface ArenaStylePreset {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    orthoSize: number;
  };
  actorScale: number;
  outlineWidth: number;
  toonBands: number;
  toonContrast: number;
  emissiveFloor: number;
  rimIntensity: number;
  rimTint: Color3;
  ambientIntensity: number;
  fillIntensity: number;
}

const ARENA_STYLE_PRESETS: Record<ViewportBucket, ArenaStylePreset> = {
  desktop: {
    camera: { position: [10, 18.2, -6.6], target: [10, 0.45, 10], orthoSize: 12.8 },
    actorScale: 1.0,
    outlineWidth: 0.058,
    toonBands: 4,
    toonContrast: 0.9,
    emissiveFloor: 0.08,
    rimIntensity: 0.15,
    rimTint: Color3.FromHexString('#00e5ff'),
    ambientIntensity: 0.34,
    fillIntensity: 0.68,
  },
  tablet: {
    camera: { position: [10, 19.2, -7.8], target: [10, 0.42, 10], orthoSize: 14.1 },
    actorScale: 0.93,
    outlineWidth: 0.048,
    toonBands: 4,
    toonContrast: 0.86,
    emissiveFloor: 0.09,
    rimIntensity: 0.18,
    rimTint: Color3.FromHexString('#00e5ff'),
    ambientIntensity: 0.32,
    fillIntensity: 0.63,
  },
  mobile: {
    camera: { position: [10, 21.0, -9.8], target: [10, 0.36, 10.2], orthoSize: 16.1 },
    actorScale: 0.86,
    outlineWidth: 0.04,
    toonBands: 3,
    toonContrast: 0.82,
    emissiveFloor: 0.11,
    rimIntensity: 0.22,
    rimTint: Color3.FromHexString('#ffd600'),
    ambientIntensity: 0.3,
    fillIntensity: 0.56,
  },
};

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

/* ── Per-actor render state ──────────────────────────────────────── */

interface ActorRenderState {
  node: TransformNode;
  meshes: AbstractMesh[];
  loaded: boolean;
  anims: CrustieAnims | null;
  animState: AnimState;
  dead: boolean;
  hpFill: Rectangle;
  hpText: TextBlock;
  nameText: TextBlock;
  color: Color3;
}

/* ── Coordinate helpers ──────────────────────────────────────────── */

function posToWorld(pos: { x: number; y: number }): Vector3 {
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
   PitScene — Babylon.js Arena (N-actor)
   ══════════════════════════════════════════════════════════════════ */

export class PitScene {
  private engine: Engine;
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private camera!: UniversalCamera;

  private ambientLight!: HemisphericLight;
  private biolum1!: PointLight;
  private biolum2!: PointLight;
  private fillLight!: PointLight;

  private viewportBucket: ViewportBucket = 'desktop';
  private activeStylePreset: ArenaStylePreset = ARENA_STYLE_PRESETS.desktop;

  /* N-actor state map */
  private actorStates = new Map<string, ActorRenderState>();
  private botNames: Record<string, string> = {};
  /** Stable insertion order of actor IDs (for color/species assignment) */
  private actorOrder: string[] = [];

  /* GUI */
  private guiTexture!: AdvancedDynamicTexture;
  private tickText!: TextBlock;

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
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = C_BRINE_BG;

    this.setupCamera();
    this.setupLighting();
    this.applyViewportPreset();
    this.setupGrid();
    this.setupMapTiles();
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
    const onResize = () => {
      this.engine.resize();
      this.applyViewportPreset();
    };
    window.addEventListener('resize', onResize);
    this.scene.onDisposeObservable.addOnce(() => {
      window.removeEventListener('resize', onResize);
    });
  }

  /* ── Camera ──────────────────────────────────────────────────── */

  private setupCamera(): void {
    this.camera = new UniversalCamera('camera', new Vector3(10, 18, -6), this.scene);
    this.camera.mode = UniversalCamera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 100;
  }

  /* ── Lighting ────────────────────────────────────────────────── */

  private setupLighting(): void {
    this.ambientLight = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    this.ambientLight.diffuse = new Color3(0.05, 0.1, 0.15);
    this.ambientLight.groundColor = new Color3(0.02, 0.04, 0.06);

    this.biolum1 = new PointLight('biolum1', new Vector3(5, 3, 5), this.scene);
    this.biolum1.diffuse = C_CYAN.clone();
    this.biolum1.range = 16;

    this.biolum2 = new PointLight('biolum2', new Vector3(15, 3, 15), this.scene);
    this.biolum2.diffuse = C_PURPLE.clone();
    this.biolum2.range = 16;

    this.fillLight = new PointLight('fill', new Vector3(10, 8, 10), this.scene);
    this.fillLight.diffuse = new Color3(0.15, 0.2, 0.3);
    this.fillLight.range = 30;
  }

  private detectViewportBucket(): ViewportBucket {
    const width = this.engine.getRenderWidth() || this.canvas.clientWidth || this.canvas.width;
    if (width <= 700) return 'mobile';
    if (width <= 1150) return 'tablet';
    return 'desktop';
  }

  private applyViewportPreset(): void {
    this.viewportBucket = this.detectViewportBucket();
    this.activeStylePreset = ARENA_STYLE_PRESETS[this.viewportBucket];
    this.applyCameraProfile();
    this.applyLightingProfile();
    this.applyActorVisualProfile();
  }

  private applyCameraProfile(): void {
    const profile = this.activeStylePreset.camera;
    const width = Math.max(1, this.engine.getRenderWidth() || this.canvas.clientWidth || this.canvas.width);
    const height = Math.max(1, this.engine.getRenderHeight() || this.canvas.clientHeight || this.canvas.height);
    const aspect = width / height;
    const portraitBoost = aspect < 0.78 ? (0.78 - aspect) * 8 : 0;
    const orthoSize = profile.orthoSize + portraitBoost;

    this.camera.position = new Vector3(profile.position[0], profile.position[1], profile.position[2]);
    this.camera.setTarget(new Vector3(profile.target[0], profile.target[1], profile.target[2]));

    this.camera.orthoTop = orthoSize;
    this.camera.orthoBottom = -orthoSize;
    this.camera.orthoLeft = -orthoSize * aspect;
    this.camera.orthoRight = orthoSize * aspect;
  }

  private applyLightingProfile(): void {
    const preset = this.activeStylePreset;
    this.ambientLight.intensity = preset.ambientIntensity;
    this.biolum1.intensity = 0.34 + preset.rimIntensity * 0.5;
    this.biolum2.intensity = 0.28 + preset.rimIntensity * 0.45;
    this.fillLight.intensity = preset.fillIntensity;
  }

  private quantizeChannel(value: number): number {
    const bands = Math.max(2, this.activeStylePreset.toonBands);
    return Math.round(value * (bands - 1)) / (bands - 1);
  }

  private buildToonColors(baseColor: Color3, actorColor: Color3): { diffuse: Color3; emissive: Color3 } {
    const contrast = this.activeStylePreset.toonContrast;
    const q = (v: number) => this.quantizeChannel(Math.pow(Math.max(0, v), contrast));
    const diffuse = new Color3(q(baseColor.r), q(baseColor.g), q(baseColor.b));

    const rim = actorColor.scale(this.activeStylePreset.rimIntensity)
      .add(this.activeStylePreset.rimTint.scale(this.activeStylePreset.rimIntensity * 0.4));

    const emissive = diffuse.scale(this.activeStylePreset.emissiveFloor).add(rim);
    emissive.r = Math.min(1, emissive.r);
    emissive.g = Math.min(1, emissive.g);
    emissive.b = Math.min(1, emissive.b);

    return { diffuse, emissive };
  }

  private applyActorVisualProfile(): void {
    const scale = this.activeStylePreset.actorScale;
    for (const [, actor] of this.actorStates) {
      actor.node.scaling = new Vector3(scale, scale, scale);
      for (const mesh of actor.meshes) {
        if (mesh instanceof Mesh) {
          mesh.renderOutline = true;
          mesh.outlineColor = Color3.Black();
          mesh.outlineWidth = this.activeStylePreset.outlineWidth;
        }

        if (mesh.material instanceof StandardMaterial) {
          const mat = mesh.material;
          const metadata = (mat.metadata ?? {}) as { baseColorHex?: string };
          const base = metadata.baseColorHex
            ? Color3.FromHexString(metadata.baseColorHex)
            : mat.diffuseColor?.clone() ?? new Color3(1, 1, 1);
          const colors = this.buildToonColors(base, actor.color);
          mat.diffuseColor = colors.diffuse;
          mat.emissiveColor = colors.emissive;
          mat.specularColor = Color3.Black();
        }
      }
    }
  }

  /* ── Grid floor ──────────────────────────────────────────────── */

  private setupGrid(): void {
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

      const hLine = MeshBuilder.CreateBox(`hLine${i}`, {
        width: ARENA_WORLD, height: 0.01, depth: thickness,
      }, this.scene);
      hLine.position = new Vector3(ARENA_WORLD / 2, 0, i * CELL_SIZE);
      hLine.material = mat;

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

  /* ── Ensure actor exists (create on demand) ────────────────── */

  private ensureActor(actorId: string): ActorRenderState {
    const existing = this.actorStates.get(actorId);
    if (existing) return existing;

    // Assign stable index
    if (!this.actorOrder.includes(actorId)) {
      this.actorOrder.push(actorId);
    }
    const index = this.actorOrder.indexOf(actorId);
    const color = ACTOR_COLORS[index % ACTOR_COLORS.length];
    const species = DEFAULT_SPECIES[index % DEFAULT_SPECIES.length];

    // Create transform node
    const node = new TransformNode(`actor_${actorId}`, this.scene);
    node.position = new Vector3(-2, WORLD_Y_OFFSET, -2); // off-grid until first snapshot
    node.scaling = new Vector3(this.activeStylePreset.actorScale, this.activeStylePreset.actorScale, this.activeStylePreset.actorScale);

    // Create HUD panel
    const hud = this.createHudPanel(actorId, color.toHexString(), 20, 8 + index * 44);
    this.guiTexture.addControl(hud.container);

    const state: ActorRenderState = {
      node,
      meshes: [],
      loaded: false,
      anims: null,
      animState: 'idle',
      dead: false,
      hpFill: hud.hpFill,
      hpText: hud.hpText,
      nameText: hud.nameText,
      color,
    };

    this.actorStates.set(actorId, state);

    // Load GLB async
    this.loadCrustieGLB(species, node, actorId);

    return state;
  }

  /* ── Crustie GLB models ──────────────────────────────────── */

  private async loadCrustieGLB(
    species: string,
    parentNode: TransformNode,
    actorId: string,
  ): Promise<void> {
    const url = CRUSTIE_GLBS[species];
    if (!url) return;

    try {
      const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);
      if (this.disposed) {
        result.meshes.forEach(m => m.dispose());
        return;
      }

      const state = this.actorStates.get(actorId);
      if (!state) {
        result.meshes.forEach(m => m.dispose());
        return;
      }

      const root = result.meshes[0];
      if (!root) return;

      root.parent = parentNode;
      root.scaling = new Vector3(GLB_BASE_SCALE, GLB_BASE_SCALE, GLB_BASE_SCALE);
      root.position = Vector3.Zero();

      const meshes: AbstractMesh[] = [];
      for (const m of result.meshes) {
        if (m.material) {
          const origMat = m.material;
          const color = origMat instanceof PBRMaterial
            ? origMat.albedoColor?.clone() ?? new Color3(1, 1, 1)
            : (origMat as StandardMaterial).diffuseColor?.clone() ?? new Color3(1, 1, 1);
          const toonMat = new StandardMaterial(`toon_${actorId}_${m.name}`, this.scene);
          const profile = this.buildToonColors(color, state.color);
          toonMat.diffuseColor = profile.diffuse;
          toonMat.specularColor = Color3.Black();
          toonMat.emissiveColor = profile.emissive;
          toonMat.metadata = { baseColorHex: color.toHexString(), actorId };
          m.material = toonMat;
        }

        if (m instanceof Mesh) {
          m.renderOutline = true;
          m.outlineColor = Color3.Black();
          m.outlineWidth = this.activeStylePreset.outlineWidth;
        }

        meshes.push(m);
      }

      state.meshes = meshes;
      state.loaded = true;
      this.applyActorVisualProfile();

      // Load skeletal animation clips for rigged species
      if (RIGGED_SPECIES.has(species)) {
        const anims = await this.loadAnimationClips(species, result.meshes[0]);
        if (anims) {
          state.anims = anims;
          anims.idle.start(true);
        }
      }
    } catch (err) {
      console.warn(`[PitScene] Failed to load ${species} GLB for ${actorId}, using fallback capsule:`, err);
      this.createFallbackCapsule(parentNode, actorId);
    }
  }

  private createFallbackCapsule(parent: TransformNode, actorId: string): void {
    const state = this.actorStates.get(actorId);
    const color = state?.color ?? C_CYAN;

    const capsule = MeshBuilder.CreateCapsule(`${actorId}_fallback`, {
      height: 0.8, radius: 0.25,
    }, this.scene);
    capsule.parent = parent;
    capsule.position.y = 0.4;

    const mat = new StandardMaterial(`${actorId}_fallbackMat`, this.scene);
    const tuned = this.buildToonColors(color.scale(0.8), color);
    mat.diffuseColor = tuned.diffuse;
    mat.emissiveColor = tuned.emissive;
    mat.specularColor = Color3.Black();
    mat.metadata = { baseColorHex: color.scale(0.8).toHexString(), actorId };
    capsule.material = mat;
    capsule.renderOutline = true;
    capsule.outlineColor = Color3.Black();
    capsule.outlineWidth = this.activeStylePreset.outlineWidth;

    if (state) {
      state.meshes = [capsule];
      state.loaded = true;
    }
  }

  /* ── Load animation clips for rigged species ────────────────── */

  private async loadAnimationClips(
    species: string,
    baseRoot: AbstractMesh,
  ): Promise<CrustieAnims | null> {
    const clips = SPECIES_CLIPS[species];
    if (!clips || clips.length === 0) return null;

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

          for (const anim of group.targetedAnimations) {
            const srcTarget = anim.target;
            if (!srcTarget?.name) continue;
            const match = baseDescendants.find(d => d.name === srcTarget.name);
            if (match) {
              anim.target = match;
            }
          }

          clipResult.meshes.forEach(m => m.dispose());

          group.stop();
          loaded[clipName] = group;
        } catch (err) {
          console.warn(`[PitScene] Failed to load ${species}/${clipName} clip:`, err);
        }
      }),
    );

    const idle = loaded.idle;
    if (!idle) return null;

    return {
      idle,
      walk: loaded.walk ?? idle,
      attack: loaded.attack ?? idle,
      hit: loaded.hit ?? null,
      death: loaded.death ?? null,
    };
  }

  /* ── Animation state machine ────────────────────────────────── */

  private playAnimClip(
    anims: CrustieAnims,
    clipName: AnimState,
    actorId: string,
    loop = false,
  ): void {
    const state = this.actorStates.get(actorId);
    if (!state || state.dead) return;

    const clip = anims[clipName];
    if (!clip) return;

    for (const key of ['idle', 'walk', 'attack', 'hit', 'death'] as AnimClipName[]) {
      anims[key]?.stop();
    }

    state.animState = clipName;

    if (clipName === 'death') {
      state.dead = true;
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
      clip.onAnimationGroupEndObservable.addOnce(() => {
        if (state && !state.dead) {
          state.animState = 'idle';
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

  /* ── GUI (tick counter only — per-actor HUD created in ensureActor) */

  private setupGUI(): void {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, this.scene);

    this.tickText = new TextBlock('tickText', 'TICK 0');
    this.tickText.color = '#555555';
    this.tickText.fontSize = 14;
    this.tickText.fontFamily = '"IBM Plex Mono", monospace';
    this.tickText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.tickText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.tickText.paddingRight = '12px';
    this.tickText.paddingTop = '8px';
    this.guiTexture.addControl(this.tickText);
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

    const nameText = new TextBlock(`${name}_name`, name.toUpperCase());
    nameText.color = color;
    nameText.fontSize = 11;
    nameText.fontFamily = '"IBM Plex Mono", monospace';
    nameText.height = '16px';
    nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.addControl(nameText);

    const hpBg = new Rectangle(`${name}_hpBg`);
    hpBg.width = '200px';
    hpBg.height = '10px';
    hpBg.background = '#111111';
    hpBg.thickness = 0;
    hpBg.cornerRadius = 2;
    hpBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const hpFill = new Rectangle(`${name}_hpFill`);
    hpFill.width = '200px';
    hpFill.height = '10px';
    hpFill.background = color;
    hpFill.thickness = 0;
    hpFill.cornerRadius = 2;
    hpFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    hpBg.addControl(hpFill);

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

    // Tick counter
    this.tickText.text = `TICK ${snap.state.tick}`;

    // Update each actor
    for (const [id, actor] of Object.entries(actors)) {
      const state = this.ensureActor(id);

      // Name
      const displayName = this.botNames[id] || id;
      state.nameText.text = displayName;

      // Move (animated lerp)
      const target = posToWorld(actor.position);
      target.y = WORLD_Y_OFFSET;
      this.animateNodeTo(state.node, target);

      // HP bar
      this.updateHpBar(actor.hp, state.hpFill, state.hpText, state.nameText, displayName);
    }

    // Process events for VFX
    for (const evt of snap.newEvents) {
      this.processEvent(evt, actors);
    }

    // Match end
    if (snap.state.ended) {
      this.showMatchEnd(snap.state.winnerId);
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

        const targetState = targetId ? this.actorStates.get(targetId) : null;
        if (targetState) {
          if (targetState.anims?.hit) {
            this.playAnimClip(targetState.anims, 'hit', targetId!);
          } else {
            this.vfxHitPulse(targetState.node);
          }

          if (target.hp <= 0 && targetState.anims) {
            this.playAnimClip(targetState.anims, 'death', targetId!);
            this.playSfx('ko');
          }
        }
      }
    }

    if (evt.type === 'ACTION_ACCEPTED' && data) {
      const actionType = (data.type as string) || '';
      const actorId = evt.actorId;
      const actor = actorId ? actors[actorId] : null;
      if (!actor) return;

      const origin = posToWorld(actor.position);
      const actorState = actorId ? this.actorStates.get(actorId) : null;
      const anims = actorState?.anims ?? null;
      const actorColor = actorState?.color ?? C_CYAN;

      if (actionType === 'MELEE_STRIKE') {
        if (anims && actorId) this.playAnimClip(anims, 'attack', actorId);
        this.playSfx('pinch');
        const target = evt.targetId ? actors[evt.targetId] : null;
        if (target) this.vfxPinch(origin, posToWorld(target.position));
      } else if (actionType === 'RANGED_SHOT') {
        if (anims && actorId) this.playAnimClip(anims, 'attack', actorId);
        this.playSfx('spit');
        const target = evt.targetId ? actors[evt.targetId] : null;
        if (target) this.vfxSpit(origin, posToWorld(target.position));
      } else if (actionType === 'MOVE') {
        if (anims && actorId) this.playAnimClip(anims, 'walk', actorId);
        this.playSfx('scuttle');
      } else if (actionType === 'GUARD') {
        this.playSfx('shellUp');
        this.vfxShellUp(origin);
      } else if (actionType === 'DASH') {
        this.playSfx('burst');
        this.vfxBurst(origin, actorColor);
      }
    }
  }

  /* ── VFX: PINCH (melee slash) ────────────────────────────────── */

  private vfxPinch(origin: Vector3, target: Vector3): void {
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

    const flash = MeshBuilder.CreateSphere('vfx_pinch_flash', { diameter: 0.5 }, this.scene);
    flash.position = target.clone();
    flash.position.y = 0.5;
    const flashMat = new StandardMaterial('flashMat', this.scene);
    flashMat.emissiveColor = Color3.White();
    flashMat.disableLighting = true;
    flashMat.alpha = 0.8;
    flash.material = flashMat;

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

    const anim = new Animation(
      'spit_fly', 'position', FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    const targetPos = target.clone();
    targetPos.y = 0.5;
    anim.setKeys([
      { frame: 0, value: proj.position.clone() },
      { frame: 15, value: targetPos },
    ]);
    proj.animations = [anim];

    this.scene.beginAnimation(proj, 0, 15, false, 1, () => {
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

    const scaleAnim = new Animation(
      'guard_scale', 'scaling', FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 36, value: new Vector3(1.4, 1.4, 1.4) },
    ]);
    shield.animations = [scaleAnim];
    this.scene.beginAnimation(shield, 0, 36, false);
    this.fadeAndDispose(shield, shieldMat, 600);
  }

  /* ── VFX: BURST (dash trail) ────────────────────────────────── */

  private vfxBurst(origin: Vector3, color: Color3): void {
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
      { frame: 21, value: new Vector3(3, 1, 3) },
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
      { frame: 4, value: new Vector3(1.2, 0.8, 1.2) },
      { frame: 8, value: new Vector3(0.9, 1.15, 0.9) },
      { frame: 12, value: new Vector3(1, 1, 1) },
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

    textBlock.linkOffsetY = -60;

    const tempNode = new TransformNode('dmgAnchor', this.scene);
    tempNode.position = worldPos.clone();
    tempNode.position.y = 1;
    textBlock.linkWithMesh(tempNode);

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

  private showMatchEnd(winnerId: string | null): void {
    const winnerName = winnerId ? (this.botNames[winnerId] || winnerId) : 'DRAW';
    const winnerState = winnerId ? this.actorStates.get(winnerId) : null;
    const winColor = winnerState ? winnerState.color.toHexString() : '#ffd600';

    const overlay = new Rectangle('endOverlay');
    overlay.width = '100%';
    overlay.height = '100%';
    overlay.background = 'rgba(0, 0, 0, 0.75)';
    overlay.thickness = 0;
    this.guiTexture.addControl(overlay);

    const title = new TextBlock('endTitle', 'SCUTTLE OVER');
    title.color = '#ffd600';
    title.fontSize = 36;
    title.fontFamily = '"IBM Plex Mono", monospace';
    title.fontWeight = 'bold';
    title.top = '-40px';
    overlay.addControl(title);

    const winner = new TextBlock('endWinner', winnerName);
    winner.color = winColor;
    winner.fontSize = 28;
    winner.fontFamily = '"IBM Plex Mono", monospace';
    winner.fontWeight = 'bold';
    winner.top = '10px';
    overlay.addControl(winner);

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

    // Dispose all actor animation groups
    for (const [, state] of this.actorStates) {
      if (state.anims) {
        for (const key of ['idle', 'walk', 'attack', 'hit', 'death'] as AnimClipName[]) {
          const group = state.anims[key];
          if (group) {
            group.stop();
            group.dispose();
          }
        }
      }
    }
    this.actorStates.clear();

    // Release SFX audio elements
    for (const key of Object.keys(this.sfx) as SfxKey[]) {
      this.sfx[key] = null;
    }
    this.sfxReady = false;

    this.scene.dispose();
    this.engine.dispose();
  }
}
