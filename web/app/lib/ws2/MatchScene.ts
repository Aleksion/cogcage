import Phaser from 'phaser';
import { ARENA_SIZE_UNITS, UNIT_SCALE, HP_MAX } from './constants';
import type { GameState, GameEvent, ActorState } from './engine';

/* ── Layout ─────────────────────────────────────────────────────── */

const CELL_SIZE = 32;
const GRID_CELLS = ARENA_SIZE_UNITS; // 20
const CANVAS_SIZE = GRID_CELLS * CELL_SIZE; // 640
const SIDEBAR_WIDTH = 260;
const TOTAL_WIDTH = CANVAS_SIZE + SIDEBAR_WIDTH;
const TOTAL_HEIGHT = CANVAS_SIZE;
const HALF_CELL = CELL_SIZE / 2;

const TWEEN_DURATION = 180;
const LOG_LINES = 12;
const LOG_LINE_HEIGHT = 16;

/* ── Brine Palette (from ART-DIRECTION.md) ──────────────────────── */

const C_BRINE_BG = 0x050510;
const C_GRID_LINE = 0x0a1628;
const C_GRID_GLOW = 0x00e5ff;
const C_CYAN = 0x00e5ff;
const C_RED = 0xff1744;
const C_YELLOW = 0xffd600;
const C_GREEN = 0x00c853;
const C_PURPLE = 0x9c27b0;
const C_DARK = 0x050510;
const C_SIDEBAR_BG = 0x08081a;

const C_HP_HIGH = 0x00c853;
const C_HP_MED = 0xffd600;
const C_HP_LOW = 0xff1744;

const C_WALL = 0x1a0a2e;
const C_WALL_TRIM = 0x6a1b9a;
const C_COVER = 0x1b2838;
const C_COVER_TRIM = 0x37474f;
const C_HAZARD = 0xff6d00;
const C_HAZARD_BG = 0x331a00;

/* ── Action name mapping (engine → lore) ────────────────────────── */

const LORE_NAMES: Record<string, string> = {
  MOVE: 'SCUTTLE',
  MELEE_STRIKE: 'PINCH',
  RANGED_SHOT: 'SPIT',
  GUARD: 'SHELL UP',
  DASH: 'BURST',
  UTILITY: 'UTILITY',
  NO_OP: 'IDLE',
};

function loreName(engineAction: string): string {
  return LORE_NAMES[engineAction] || engineAction;
}

/* ── MAP 001 "THE STANDARD" from MAP-DESIGN.md ──────────────────── */

type TileType = 'OPEN' | 'WALL' | 'COVER' | 'HAZARD';

const MAP_STANDARD: TileType[][] = (() => {
  const raw = [
    '....................', // row 0
    '....................', // row 1
    '..WW..........WW..', // row 2
    '..W...C.....C..W..', // row 3
    '.....C.....C.....', // row 4
    '....................', // row 5
    '..C...........C..', // row 6
    '..C...HH....HH...C..', // row 7
    '.....HH....HH.....', // row 8
    '....................', // row 9
    '....................', // row 10
    '.....HH....HH.....', // row 11
    '.....HH....HH.....', // row 12
    '..C...........C..', // row 13
    '..C...........C..', // row 14
    '....................', // row 15
    '.....C.....C.....', // row 16
    '..W..C......C..W...', // row 17
    '..WW..........WW..', // row 18
    '....................', // row 19
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

/* ── Interfaces ─────────────────────────────────────────────────── */

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

/* ── Helpers ─────────────────────────────────────────────────────── */

function posToPixel(pos: { x: number; y: number }): { px: number; py: number } {
  return {
    px: (pos.x / UNIT_SCALE) * CELL_SIZE + HALF_CELL,
    py: (pos.y / UNIT_SCALE) * CELL_SIZE + HALF_CELL,
  };
}

function hpColor(hp: number): number {
  if (hp > 60) return C_HP_HIGH;
  if (hp > 30) return C_HP_MED;
  return C_HP_LOW;
}

/* ── Lobster drawing (procedural sprite) ────────────────────────── */

function drawLobster(
  gfx: Phaser.GameObjects.Graphics,
  color: number,
  size: number,
): void {
  const s = size;
  const hs = s / 2;

  gfx.clear();

  // Body (rounded capsule shape)
  gfx.fillStyle(color, 1);
  gfx.fillRoundedRect(-hs * 0.7, -hs * 0.8, s * 0.7, s * 0.85, 4);

  // Carapace highlight
  gfx.fillStyle(0xffffff, 0.15);
  gfx.fillRoundedRect(-hs * 0.5, -hs * 0.7, s * 0.4, s * 0.3, 3);

  // Claws
  gfx.fillStyle(color, 0.9);
  gfx.fillCircle(-hs * 0.85, -hs * 0.3, s * 0.15);
  gfx.fillCircle(hs * 0.85, -hs * 0.3, s * 0.15);

  // Claw pincers
  gfx.lineStyle(2, color, 0.8);
  gfx.lineBetween(-hs * 0.95, -hs * 0.5, -hs * 0.75, -hs * 0.1);
  gfx.lineBetween(hs * 0.95, -hs * 0.5, hs * 0.75, -hs * 0.1);

  // Eyes (stalked compound eyes with emissive glow)
  gfx.fillStyle(0x000000, 1);
  gfx.fillCircle(-hs * 0.25, -hs * 0.65, 3);
  gfx.fillCircle(hs * 0.25, -hs * 0.65, 3);
  gfx.fillStyle(0xffffff, 0.9);
  gfx.fillCircle(-hs * 0.25, -hs * 0.65, 1.5);
  gfx.fillCircle(hs * 0.25, -hs * 0.65, 1.5);

  // Antennae
  gfx.lineStyle(1, color, 0.5);
  gfx.lineBetween(-hs * 0.15, -hs * 0.8, -hs * 0.4, -hs * 1.1);
  gfx.lineBetween(hs * 0.15, -hs * 0.8, hs * 0.4, -hs * 1.1);

  // Tail fan
  gfx.fillStyle(color, 0.6);
  gfx.fillTriangle(
    -hs * 0.3, hs * 0.3,
    hs * 0.3, hs * 0.3,
    0, hs * 0.7,
  );

  // Outline
  gfx.lineStyle(2, 0xffffff, 0.3);
  gfx.strokeRoundedRect(-hs * 0.7, -hs * 0.8, s * 0.7, s * 0.85, 4);
}

/* ══════════════════════════════════════════════════════════════════
   THE PIT — Phaser 3 Arena Scene
   ══════════════════════════════════════════════════════════════════ */

export class MatchScene extends Phaser.Scene {
  /* Lobster containers (sprite group: body + label + hp bar) */
  private alphaContainer!: Phaser.GameObjects.Container;
  private betaContainer!: Phaser.GameObjects.Container;
  private alphaGfx!: Phaser.GameObjects.Graphics;
  private betaGfx!: Phaser.GameObjects.Graphics;

  /* HP bar graphics (drawn on each lobster) */
  private hpBarGfx!: Phaser.GameObjects.Graphics;

  /* VFX layer */
  private vfxGfx!: Phaser.GameObjects.Graphics;

  /* Sidebar elements */
  private logTexts: Phaser.GameObjects.Text[] = [];
  private logEntries: string[] = [];
  private sidebarHpGfx!: Phaser.GameObjects.Graphics;
  private tickText!: Phaser.GameObjects.Text;
  private alphaHpLabel!: Phaser.GameObjects.Text;
  private betaHpLabel!: Phaser.GameObjects.Text;

  /* Map tiles */
  private tileGfx!: Phaser.GameObjects.Graphics;
  private hazardPulseTimer = 0;

  /* State tracking */
  private botNames: Record<string, string> = {};
  private lastAlphaId = '';
  private lastBetaId = '';

  constructor() {
    super({ key: 'MatchScene' });
  }

  setBotNames(names: Record<string, string>): void {
    this.botNames = { ...this.botNames, ...names };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C_BRINE_BG);

    // ── Arena background glow ──
    const bgGlow = this.add.graphics();
    bgGlow.fillStyle(C_CYAN, 0.03);
    bgGlow.fillCircle(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.4);

    // ── Map tiles ──
    this.tileGfx = this.add.graphics();
    this.drawMapTiles();

    // ── Grid lines (bioluminescent) ──
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, C_GRID_LINE, 0.4);
    for (let i = 0; i <= GRID_CELLS; i++) {
      const p = i * CELL_SIZE;
      gridGfx.lineBetween(p, 0, p, CANVAS_SIZE);
      gridGfx.lineBetween(0, p, CANVAS_SIZE, p);
    }
    // Subtle cyan glow on every 5th line
    gridGfx.lineStyle(1, C_GRID_GLOW, 0.08);
    for (let i = 0; i <= GRID_CELLS; i += 5) {
      const p = i * CELL_SIZE;
      gridGfx.lineBetween(p, 0, p, CANVAS_SIZE);
      gridGfx.lineBetween(0, p, CANVAS_SIZE, p);
    }

    // ── VFX layer ──
    this.vfxGfx = this.add.graphics();

    // ── HP bar layer (drawn above lobsters) ──
    this.hpBarGfx = this.add.graphics();

    // ── Alpha Lobster ──
    this.alphaGfx = this.add.graphics();
    drawLobster(this.alphaGfx, C_CYAN, CELL_SIZE);
    const alphaLbl = this.add.text(0, HALF_CELL + 2, '', {
      fontSize: '9px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#00e5ff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.alphaContainer = this.add.container(0, 0, [this.alphaGfx, alphaLbl]);

    // ── Beta Lobster ──
    this.betaGfx = this.add.graphics();
    drawLobster(this.betaGfx, C_RED, CELL_SIZE);
    const betaLbl = this.add.text(0, HALF_CELL + 2, '', {
      fontSize: '9px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ff1744',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.betaContainer = this.add.container(0, 0, [this.betaGfx, betaLbl]);

    // ── Sidebar ──
    this.createSidebar();
  }

  update(_time: number, delta: number): void {
    // Animate hazard tile pulse
    this.hazardPulseTimer += delta;
    if (this.hazardPulseTimer > 1500) {
      this.hazardPulseTimer = 0;
      this.pulseHazards();
    }
  }

  /* ── Map tile rendering ───────────────────────────────────────── */

  private drawMapTiles(): void {
    const g = this.tileGfx;
    g.clear();

    for (let r = 0; r < GRID_CELLS; r++) {
      for (let c = 0; c < GRID_CELLS; c++) {
        const tile = MAP_STANDARD[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (tile === 'WALL') {
          g.fillStyle(C_WALL, 0.9);
          g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          g.lineStyle(1, C_WALL_TRIM, 0.6);
          g.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          // Bioluminescent trim dots
          g.fillStyle(C_PURPLE, 0.4);
          g.fillCircle(x + HALF_CELL, y + HALF_CELL, 2);
        } else if (tile === 'COVER') {
          g.fillStyle(C_COVER, 0.7);
          g.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          g.lineStyle(1, C_COVER_TRIM, 0.5);
          g.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          // Debris detail
          g.fillStyle(C_COVER_TRIM, 0.3);
          g.fillRect(x + 6, y + 6, 8, 4);
          g.fillRect(x + 16, y + 18, 6, 3);
        } else if (tile === 'HAZARD') {
          g.fillStyle(C_HAZARD_BG, 0.6);
          g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          g.lineStyle(1, C_HAZARD, 0.4);
          g.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          g.fillStyle(C_HAZARD, 0.15);
          g.fillCircle(x + HALF_CELL, y + HALF_CELL, CELL_SIZE * 0.3);
        }
      }
    }
  }

  private pulseHazards(): void {
    for (let r = 0; r < GRID_CELLS; r++) {
      for (let c = 0; c < GRID_CELLS; c++) {
        if (MAP_STANDARD[r][c] === 'HAZARD') {
          const x = c * CELL_SIZE + HALF_CELL;
          const y = r * CELL_SIZE + HALF_CELL;
          const pulse = this.add.graphics();
          pulse.fillStyle(C_HAZARD, 0.3);
          pulse.fillCircle(x, y, 4);
          this.tweens.add({
            targets: pulse,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 600,
            ease: 'Sine.easeOut',
            onComplete: () => pulse.destroy(),
          });
        }
      }
    }
  }

  /* ── Sidebar ──────────────────────────────────────────────────── */

  private createSidebar(): void {
    const sx = CANVAS_SIZE;
    const g = this.add.graphics();

    // Background
    g.fillStyle(C_SIDEBAR_BG, 0.95);
    g.fillRect(sx, 0, SIDEBAR_WIDTH, TOTAL_HEIGHT);
    g.lineStyle(2, C_CYAN, 0.15);
    g.lineBetween(sx, 0, sx, TOTAL_HEIGHT);

    // Title
    this.add.text(sx + 14, 10, 'THE PIT', {
      fontSize: '16px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ffd600',
      fontStyle: 'bold',
    });

    // Tick counter
    this.tickText = this.add.text(sx + SIDEBAR_WIDTH - 14, 12, 'TICK 0', {
      fontSize: '11px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#555',
    }).setOrigin(1, 0);

    // Lobster A header
    this.add.text(sx + 14, 36, '', {
      fontSize: '11px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#00e5ff',
      fontStyle: 'bold',
    });

    // HP labels
    this.alphaHpLabel = this.add.text(sx + 14, 36, 'LOBSTER A', {
      fontSize: '11px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#00e5ff',
      fontStyle: 'bold',
    });

    this.betaHpLabel = this.add.text(sx + 14, 70, 'LOBSTER B', {
      fontSize: '11px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ff1744',
      fontStyle: 'bold',
    });

    // HP bar graphics
    this.sidebarHpGfx = this.add.graphics();

    // Combat log header
    this.add.text(sx + 14, 104, 'COMBAT LOG', {
      fontSize: '10px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ffd600',
      fontStyle: 'bold',
      letterSpacing: 2,
    });

    // Separator line
    const sepG = this.add.graphics();
    sepG.lineStyle(1, C_YELLOW, 0.2);
    sepG.lineBetween(sx + 14, 120, sx + SIDEBAR_WIDTH - 14, 120);

    // Log text lines
    const logStartY = 128;
    for (let i = 0; i < LOG_LINES; i++) {
      const t = this.add.text(sx + 14, logStartY + i * LOG_LINE_HEIGHT, '', {
        fontSize: '9px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: '#667',
        wordWrap: { width: SIDEBAR_WIDTH - 28 },
      });
      this.logTexts.push(t);
    }

    // Action legend
    const legendY = TOTAL_HEIGHT - 120;
    this.add.text(sx + 14, legendY, 'ACTIONS', {
      fontSize: '10px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ffd600',
      fontStyle: 'bold',
      letterSpacing: 2,
    });

    const legendItems = [
      { name: 'SCUTTLE', desc: 'Move 1 tile', color: '#00e5ff' },
      { name: 'PINCH', desc: 'Melee, adj', color: '#ff1744' },
      { name: 'SPIT', desc: 'Ranged, 3 tile', color: '#9c27b0' },
      { name: 'SHELL UP', desc: '-50% dmg', color: '#00c853' },
      { name: 'BURST', desc: 'Dash 2 tiles', color: '#ffd600' },
    ];

    legendItems.forEach((item, i) => {
      const ly = legendY + 18 + i * 14;
      this.add.text(sx + 14, ly, item.name, {
        fontSize: '8px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: item.color,
        fontStyle: 'bold',
      });
      this.add.text(sx + 90, ly, item.desc, {
        fontSize: '8px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: '#555',
      });
    });
  }

  /* ── Apply game state snapshot ────────────────────────────────── */

  applySnapshot(snap: MatchSnapshot): void {
    if (!this.alphaContainer) return;

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

    // Update tick counter
    this.tickText.setText(`TICK ${snap.state.tick}`);

    // Update lobster name labels
    const alphaName = this.botNames[alphaId] || alphaId;
    const betaName = this.botNames[betaId] || betaId;
    (this.alphaContainer.getAt(1) as Phaser.GameObjects.Text).setText(alphaName);
    (this.betaContainer.getAt(1) as Phaser.GameObjects.Text).setText(betaName);

    // Move lobsters
    const aPx = posToPixel(alpha.position);
    const bPx = posToPixel(beta.position);

    this.tweens.add({
      targets: this.alphaContainer,
      x: aPx.px,
      y: aPx.py,
      duration: TWEEN_DURATION,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.betaContainer,
      x: bPx.px,
      y: bPx.py,
      duration: TWEEN_DURATION,
      ease: 'Sine.easeInOut',
    });

    // Draw HP bars on grid (above each lobster)
    this.drawGridHpBars(alpha, aPx, beta, bPx);

    // Draw sidebar HP bars
    this.drawSidebarHp(alpha, alphaName, beta, betaName);

    // Process events for VFX
    for (const evt of snap.newEvents) {
      this.processEvent(evt, actors);
    }

    // Process decisions for combat log
    for (const dec of snap.decisions) {
      const name = this.botNames[dec.actorId] || dec.actorId;
      const lore = loreName(dec.action.type);
      const reasoning = dec.reasoning ? ` — ${dec.reasoning.slice(0, 60)}` : '';
      const color = dec.actorId === alphaId ? '#00e5ff' : '#ff1744';
      this.logEntries.unshift(`<${color}>[${name}]</> ${lore}${reasoning}`);
    }

    // Update log display
    const visible = this.logEntries.slice(0, LOG_LINES);
    for (let i = 0; i < LOG_LINES; i++) {
      if (this.logTexts[i]) {
        const raw = visible[i] || '';
        // Simple color tag parsing: <#color>text</>
        const match = raw.match(/^<(#[0-9a-f]+)>(.*?)<\/>\s*(.*)$/i);
        if (match) {
          this.logTexts[i].setText(`${match[2]} ${match[3]}`);
          this.logTexts[i].setColor(match[1]);
        } else {
          this.logTexts[i].setText(raw);
          this.logTexts[i].setColor('#667');
        }
      }
    }

    // Match end
    if (snap.state.ended) {
      this.showMatchEnd(snap.state.winnerId, alphaId, betaId);
    }
  }

  /* ── HP bars on grid ──────────────────────────────────────────── */

  private drawGridHpBars(
    alpha: ActorState,
    aPx: { px: number; py: number },
    beta: ActorState,
    bPx: { px: number; py: number },
  ): void {
    const g = this.hpBarGfx;
    g.clear();

    const barW = CELL_SIZE * 0.8;
    const barH = 4;
    const barY = -HALF_CELL - 8;

    // Alpha HP bar
    const aHpPct = Math.max(0, alpha.hp) / HP_MAX;
    g.fillStyle(0x111111, 0.8);
    g.fillRect(aPx.px - barW / 2, aPx.py + barY, barW, barH);
    g.fillStyle(hpColor(alpha.hp), 1);
    g.fillRect(aPx.px - barW / 2, aPx.py + barY, barW * aHpPct, barH);

    // Beta HP bar
    const bHpPct = Math.max(0, beta.hp) / HP_MAX;
    g.fillStyle(0x111111, 0.8);
    g.fillRect(bPx.px - barW / 2, bPx.py + barY, barW, barH);
    g.fillStyle(hpColor(beta.hp), 1);
    g.fillRect(bPx.px - barW / 2, bPx.py + barY, barW * bHpPct, barH);

    // Energy pips (small dots under HP bar)
    const pipY = barY + barH + 2;
    const ePipsAlpha = Math.floor((alpha.energy / 1000) * 5);
    const ePipsBeta = Math.floor((beta.energy / 1000) * 5);

    for (let i = 0; i < 5; i++) {
      g.fillStyle(i < ePipsAlpha ? C_CYAN : 0x222222, i < ePipsAlpha ? 0.8 : 0.3);
      g.fillCircle(aPx.px - 8 + i * 4, aPx.py + pipY, 1.5);
      g.fillStyle(i < ePipsBeta ? C_RED : 0x222222, i < ePipsBeta ? 0.8 : 0.3);
      g.fillCircle(bPx.px - 8 + i * 4, bPx.py + pipY, 1.5);
    }
  }

  /* ── Sidebar HP bars ──────────────────────────────────────────── */

  private drawSidebarHp(
    alpha: ActorState,
    alphaName: string,
    beta: ActorState,
    betaName: string,
  ): void {
    const g = this.sidebarHpGfx;
    g.clear();

    const sx = CANVAS_SIZE;
    const barW = SIDEBAR_WIDTH - 60;
    const barH = 10;

    // Update name labels
    this.alphaHpLabel.setText(`${alphaName}  ${alpha.hp}/${HP_MAX}`);
    this.betaHpLabel.setText(`${betaName}  ${beta.hp}/${HP_MAX}`);

    // Alpha HP bar
    const aY = 50;
    g.fillStyle(0x111111, 1);
    g.fillRoundedRect(sx + 14, aY, barW, barH, 2);
    g.fillStyle(hpColor(alpha.hp), 1);
    g.fillRoundedRect(sx + 14, aY, barW * (alpha.hp / HP_MAX), barH, 2);

    // Beta HP bar
    const bY = 84;
    g.fillStyle(0x111111, 1);
    g.fillRoundedRect(sx + 14, bY, barW, barH, 2);
    g.fillStyle(hpColor(beta.hp), 1);
    g.fillRoundedRect(sx + 14, bY, barW * (beta.hp / HP_MAX), barH, 2);
  }

  /* ── Event VFX ────────────────────────────────────────────────── */

  private processEvent(evt: GameEvent, actors: Record<string, ActorState>): void {
    const data = evt.data as Record<string, unknown> | null;

    if (evt.type === 'DAMAGE_APPLIED' && data) {
      const targetId = evt.targetId;
      const target = targetId ? actors[targetId] : null;
      if (target) {
        const tPx = posToPixel(target.position);
        this.spawnDamageNumber(tPx.px, tPx.py, data.amount as number);
      }
    }

    if (evt.type === 'ACTION_ACCEPTED' && data) {
      const actionType = (data.type as string) || '';
      const actorId = evt.actorId;
      const actor = actorId ? actors[actorId] : null;
      if (!actor) return;

      const aPx = posToPixel(actor.position);

      if (actionType === 'MELEE_STRIKE') {
        this.vfxPinch(aPx, evt.targetId ? actors[evt.targetId] : null);
      } else if (actionType === 'RANGED_SHOT') {
        this.vfxSpit(aPx, evt.targetId ? actors[evt.targetId] : null);
      } else if (actionType === 'GUARD') {
        this.vfxShellUp(aPx);
      } else if (actionType === 'DASH') {
        this.vfxBurst(aPx, actorId === this.lastAlphaId ? C_CYAN : C_RED);
      }
    }
  }

  /* ── VFX: PINCH (melee slash) ─────────────────────────────────── */

  private vfxPinch(
    origin: { px: number; py: number },
    target: ActorState | null,
  ): void {
    if (!target) return;
    const tPx = posToPixel(target.position);

    // Slash line from attacker to target
    const slash = this.add.graphics();
    slash.lineStyle(3, C_RED, 0.9);
    slash.lineBetween(origin.px, origin.py, tPx.px, tPx.py);

    // Impact flash at target
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillCircle(tPx.px, tPx.py, CELL_SIZE * 0.4);

    // Slash arc
    const arc = this.add.graphics();
    arc.lineStyle(2, C_RED, 0.7);
    arc.beginPath();
    arc.arc(tPx.px, tPx.py, CELL_SIZE * 0.5, -0.5, 0.5);
    arc.strokePath();

    this.tweens.add({
      targets: [slash, flash, arc],
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => { slash.destroy(); flash.destroy(); arc.destroy(); },
    });

    // Action label
    this.spawnActionLabel(origin.px, origin.py - HALF_CELL - 16, 'PINCH', '#ff1744');
  }

  /* ── VFX: SPIT (ranged projectile) ────────────────────────────── */

  private vfxSpit(
    origin: { px: number; py: number },
    target: ActorState | null,
  ): void {
    if (!target) return;
    const tPx = posToPixel(target.position);

    // Projectile (circle traveling from origin to target)
    const proj = this.add.graphics();
    proj.fillStyle(C_PURPLE, 0.9);
    proj.fillCircle(0, 0, 4);
    proj.fillStyle(0xffffff, 0.5);
    proj.fillCircle(0, 0, 2);
    proj.setPosition(origin.px, origin.py);

    // Trail particles
    const trail = this.add.graphics();

    this.tweens.add({
      targets: proj,
      x: tPx.px,
      y: tPx.py,
      duration: 250,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        trail.fillStyle(C_PURPLE, 0.3);
        trail.fillCircle(proj.x, proj.y, 2);
      },
      onComplete: () => {
        // Impact burst
        const burst = this.add.graphics();
        burst.fillStyle(C_PURPLE, 0.6);
        burst.fillCircle(tPx.px, tPx.py, 6);

        this.tweens.add({
          targets: burst,
          alpha: 0,
          scaleX: 2.5,
          scaleY: 2.5,
          duration: 300,
          onComplete: () => burst.destroy(),
        });

        proj.destroy();
        this.tweens.add({
          targets: trail,
          alpha: 0,
          duration: 200,
          onComplete: () => trail.destroy(),
        });
      },
    });

    this.spawnActionLabel(origin.px, origin.py - HALF_CELL - 16, 'SPIT', '#9c27b0');
  }

  /* ── VFX: SHELL UP (shield bubble) ────────────────────────────── */

  private vfxShellUp(origin: { px: number; py: number }): void {
    const shield = this.add.graphics();
    shield.lineStyle(2, C_GREEN, 0.8);
    shield.strokeCircle(origin.px, origin.py, CELL_SIZE * 0.55);
    shield.fillStyle(C_GREEN, 0.1);
    shield.fillCircle(origin.px, origin.py, CELL_SIZE * 0.55);

    this.tweens.add({
      targets: shield,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => shield.destroy(),
    });

    this.spawnActionLabel(origin.px, origin.py - HALF_CELL - 16, 'SHELL UP', '#00c853');
  }

  /* ── VFX: BURST (dash trail) ──────────────────────────────────── */

  private vfxBurst(origin: { px: number; py: number }, color: number): void {
    // Speed lines
    for (let i = 0; i < 3; i++) {
      const line = this.add.graphics();
      const offsetY = (i - 1) * 6;
      line.lineStyle(2, color, 0.6);
      line.lineBetween(
        origin.px - CELL_SIZE * 0.8,
        origin.py + offsetY,
        origin.px - CELL_SIZE * 0.2,
        origin.py + offsetY,
      );

      this.tweens.add({
        targets: line,
        alpha: 0,
        x: -CELL_SIZE,
        duration: 400,
        delay: i * 50,
        ease: 'Sine.easeOut',
        onComplete: () => line.destroy(),
      });
    }

    // Impact ring
    const ring = this.add.graphics();
    ring.lineStyle(2, color, 0.5);
    ring.strokeCircle(origin.px, origin.py, 4);

    this.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.spawnActionLabel(origin.px, origin.py - HALF_CELL - 16, 'BURST', '#ffd600');
  }

  /* ── Damage number popup ──────────────────────────────────────── */

  private spawnDamageNumber(x: number, y: number, amount: number): void {
    const txt = this.add.text(x, y - 12, `-${Math.round(amount)}`, {
      fontSize: '14px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ff1744',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 36,
      alpha: 0,
      duration: 700,
      ease: 'Sine.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  /* ── Action label popup ───────────────────────────────────────── */

  private spawnActionLabel(x: number, y: number, label: string, color: string): void {
    const txt = this.add.text(x, y, label, {
      fontSize: '10px',
      fontFamily: '"IBM Plex Mono", monospace',
      color,
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: y - 14,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  /* ── Match end overlay ────────────────────────────────────────── */

  private showMatchEnd(winnerId: string | null, alphaId: string, betaId: string): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const winnerName = winnerId
      ? (this.botNames[winnerId] || winnerId)
      : 'DRAW';
    const winColor = winnerId === alphaId ? '#00e5ff' : winnerId === betaId ? '#ff1744' : '#ffd600';

    const title = this.add.text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 30, 'SCUTTLE OVER', {
      fontSize: '28px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#ffd600',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    const winner = this.add.text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10, winnerName, {
      fontSize: '22px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: winColor,
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = this.add.text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 40, winnerId ? 'WINS' : '', {
      fontSize: '16px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: '#888',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, y: CANVAS_SIZE / 2 - 40, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: winner, alpha: 1, duration: 400, delay: 200, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 400, delay: 350, ease: 'Sine.easeOut' });

    this.events.emit('match-ended', winnerId);
  }

  /* ── Static config ────────────────────────────────────────────── */

  static getConfig(): Phaser.Types.Core.GameConfig {
    return {
      type: Phaser.AUTO,
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      backgroundColor: '#050510',
      scene: [MatchScene],
      parent: 'phaser-arena',
      render: {
        pixelArt: false,
        antialias: true,
      },
    };
  }
}
