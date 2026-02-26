import Phaser from 'phaser';
import { ARENA_SIZE_UNITS, UNIT_SCALE, HP_MAX, OBJECTIVE_RADIUS } from './constants.ts';
import type { GameState, GameEvent } from './engine.ts';

const CELL_SIZE = 28;
const GRID_CELLS = ARENA_SIZE_UNITS; // 20
const CANVAS_SIZE = GRID_CELLS * CELL_SIZE; // 560

const SIDEBAR_WIDTH = 240;
const TOTAL_WIDTH = CANVAS_SIZE + SIDEBAR_WIDTH;
const TOTAL_HEIGHT = CANVAS_SIZE;

const OBJ_CENTER_PX = (GRID_CELLS / 2) * CELL_SIZE; // 280
const OBJ_RADIUS_PX = (OBJECTIVE_RADIUS / UNIT_SCALE) * CELL_SIZE; // 2.5 * 28 = 70

const TWEEN_DURATION = 200;
const LOG_LINES = 8;
const LOG_LINE_HEIGHT = 18;

const COLOR_ALPHA_BOT = 0x00e5ff; // cyan
const COLOR_BETA_BOT = 0xeb4d4b; // red
const COLOR_GRID_LINE = 0x333333;
const COLOR_GRID_BG = 0x1a1a1a;
const COLOR_OBJECTIVE = 0xffd600;
const COLOR_HP_HIGH = 0x2ecc71;
const COLOR_HP_MED = 0xf39c12;
const COLOR_HP_LOW = 0xff4d4d;
const COLOR_SIDEBAR_BG = 0x111111;

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

function posToPixel(pos: { x: number; y: number }): { px: number; py: number } {
  return {
    px: (pos.x / UNIT_SCALE) * CELL_SIZE,
    py: (pos.y / UNIT_SCALE) * CELL_SIZE,
  };
}

function hpColor(hp: number): number {
  if (hp > 60) return COLOR_HP_HIGH;
  if (hp > 30) return COLOR_HP_MED;
  return COLOR_HP_LOW;
}

export class MatchScene extends Phaser.Scene {
  private alphaRect!: Phaser.GameObjects.Rectangle;
  private betaRect!: Phaser.GameObjects.Rectangle;
  private alphaLabel!: Phaser.GameObjects.Text;
  private betaLabel!: Phaser.GameObjects.Text;
  private hpGraphics!: Phaser.GameObjects.Graphics;
  private logTexts: Phaser.GameObjects.Text[] = [];
  private logEntries: string[] = [];
  private botNames: Record<string, string> = { alpha: 'Alpha', beta: 'Beta' };

  constructor() {
    super({ key: 'MatchScene' });
  }

  setBotNames(names: Record<string, string>): void {
    this.botNames = { ...this.botNames, ...names };
  }

  create(): void {
    // Background
    this.cameras.main.setBackgroundColor(COLOR_GRID_BG);

    // Grid lines
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, COLOR_GRID_LINE, 0.3);
    for (let i = 0; i <= GRID_CELLS; i++) {
      const p = i * CELL_SIZE;
      gridGfx.lineBetween(p, 0, p, CANVAS_SIZE);
      gridGfx.lineBetween(0, p, CANVAS_SIZE, p);
    }

    // Objective zone
    const objGfx = this.add.graphics();
    objGfx.fillStyle(COLOR_OBJECTIVE, 0.15);
    objGfx.fillCircle(OBJ_CENTER_PX, OBJ_CENTER_PX, OBJ_RADIUS_PX);
    objGfx.lineStyle(2, COLOR_OBJECTIVE, 0.5);
    objGfx.strokeCircle(OBJ_CENTER_PX, OBJ_CENTER_PX, OBJ_RADIUS_PX);

    // Bot rectangles
    const botSize = CELL_SIZE * 0.8;
    this.alphaRect = this.add.rectangle(0, 0, botSize, botSize, COLOR_ALPHA_BOT);
    this.alphaRect.setStrokeStyle(2, 0xffffff);
    this.alphaLabel = this.add.text(0, 0, 'A', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.betaRect = this.add.rectangle(0, 0, botSize, botSize, COLOR_BETA_BOT);
    this.betaRect.setStrokeStyle(2, 0xffffff);
    this.betaLabel = this.add.text(0, 0, 'B', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // HP bar graphics (drawn on sidebar area)
    this.hpGraphics = this.add.graphics();

    // Sidebar background
    const sidebarGfx = this.add.graphics();
    sidebarGfx.fillStyle(COLOR_SIDEBAR_BG, 0.95);
    sidebarGfx.fillRect(CANVAS_SIZE, 0, SIDEBAR_WIDTH, TOTAL_HEIGHT);
    sidebarGfx.lineStyle(2, 0x333333, 1);
    sidebarGfx.lineBetween(CANVAS_SIZE, 0, CANVAS_SIZE, TOTAL_HEIGHT);

    // Sidebar title
    this.add.text(CANVAS_SIZE + 12, 10, 'COMBAT LOG', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffd600',
      fontStyle: 'bold',
    });

    // HP labels
    this.add.text(CANVAS_SIZE + 12, 32, this.botNames.alpha || 'Alpha', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#00e5ff',
      fontStyle: 'bold',
    });
    this.add.text(CANVAS_SIZE + 12, 62, this.botNames.beta || 'Beta', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#eb4d4b',
      fontStyle: 'bold',
    });

    // Log text lines
    const logStartY = 100;
    for (let i = 0; i < LOG_LINES; i++) {
      const t = this.add.text(CANVAS_SIZE + 12, logStartY + i * LOG_LINE_HEIGHT, '', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#aaa',
        wordWrap: { width: SIDEBAR_WIDTH - 24 },
      });
      this.logTexts.push(t);
    }
  }

  applySnapshot(snap: MatchSnapshot): void {
    if (!this.alphaRect) return;

    const actors = snap.state.actors;
    const alphaId = Object.keys(actors).sort()[0];
    const betaId = Object.keys(actors).sort()[1];
    const alpha = actors[alphaId];
    const beta = actors[betaId];

    if (!alpha || !beta) return;

    // Tween bots to new positions
    const aPx = posToPixel(alpha.position);
    const bPx = posToPixel(beta.position);

    this.tweens.add({
      targets: [this.alphaRect, this.alphaLabel],
      x: aPx.px,
      y: aPx.py,
      duration: TWEEN_DURATION,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: [this.betaRect, this.betaLabel],
      x: bPx.px,
      y: bPx.py,
      duration: TWEEN_DURATION,
      ease: 'Sine.easeInOut',
    });

    // Draw HP bars
    this.hpGraphics.clear();
    const barWidth = SIDEBAR_WIDTH - 40;
    const barHeight = 10;

    // Alpha HP bar
    const alphaHpPct = alpha.hp / HP_MAX;
    this.hpGraphics.fillStyle(0x333333);
    this.hpGraphics.fillRect(CANVAS_SIZE + 12, 45, barWidth, barHeight);
    this.hpGraphics.fillStyle(hpColor(alpha.hp));
    this.hpGraphics.fillRect(CANVAS_SIZE + 12, 45, barWidth * alphaHpPct, barHeight);

    // Beta HP bar
    const betaHpPct = beta.hp / HP_MAX;
    this.hpGraphics.fillStyle(0x333333);
    this.hpGraphics.fillRect(CANVAS_SIZE + 12, 75, barWidth, barHeight);
    this.hpGraphics.fillStyle(hpColor(beta.hp));
    this.hpGraphics.fillRect(CANVAS_SIZE + 12, 75, barWidth * betaHpPct, barHeight);

    // HP text
    this.hpGraphics.fillStyle(0xffffff);
    // Small HP numbers at end of bars
    const alphaHpText = this.add.text(CANVAS_SIZE + 14 + barWidth, 44, `${alpha.hp}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#fff',
    }).setOrigin(0, 0);
    this.time.delayedCall(500, () => alphaHpText.destroy());

    const betaHpText = this.add.text(CANVAS_SIZE + 14 + barWidth, 74, `${beta.hp}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#fff',
    }).setOrigin(0, 0);
    this.time.delayedCall(500, () => betaHpText.destroy());

    // Process new decisions for combat log
    for (const dec of snap.decisions) {
      const name = this.botNames[dec.actorId] || dec.actorId;
      const reasoning = dec.reasoning ? ` — ${dec.reasoning}` : '';
      this.logEntries.unshift(`[${name}] ${dec.action.type}${reasoning}`);
    }

    // Process new events for VFX
    for (const evt of snap.newEvents) {
      if (evt.type === 'DAMAGE_APPLIED' && evt.data) {
        const targetId = evt.targetId;
        const target = targetId ? actors[targetId] : null;
        if (target) {
          const tPx = posToPixel(target.position);
          this.spawnDamageNumber(tPx.px, tPx.py, (evt.data as Record<string, unknown>).amount as number);
        }
      }
    }

    // Update log display
    const visible = this.logEntries.slice(0, LOG_LINES);
    for (let i = 0; i < LOG_LINES; i++) {
      if (this.logTexts[i]) {
        this.logTexts[i].setText(visible[i] || '');
      }
    }

    // Check match end
    if (snap.state.ended) {
      this.events.emit('match-ended', snap.state.winnerId);
    }
  }

  private spawnDamageNumber(x: number, y: number, amount: number): void {
    const dmgText = this.add.text(x, y - 10, `-${amount}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff4d4d',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: dmgText,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  static getConfig(): Phaser.Types.Core.GameConfig {
    return {
      type: Phaser.AUTO,
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      backgroundColor: '#1a1a1a',
      scene: [MatchScene],
      parent: 'game-container',
      render: {
        pixelArt: false,
        antialias: true,
      },
    };
  }
}
