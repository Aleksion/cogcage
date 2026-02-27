// ── Geometry ──

export type Position = { x: number; y: number };
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

// ── Armor ──

export type ArmorType = 'light' | 'medium' | 'heavy';

// ── Actions ──

export const ACTION_TYPES = [
  'MOVE',
  'MELEE_STRIKE',
  'RANGED_SHOT',
  'GUARD',
  'DASH',
  'UTILITY',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface AgentAction {
  tick: number;
  type: string;
  dir?: Direction | null;
  targetId?: string | null;
  actorId?: string;
}

// ── Statuses ──

export interface StatusEffect {
  endsAt: number;
  charges?: number;
  kind?: string;
}

// ── Actor ──

export interface ActorStats {
  damageDealt: number;
  illegalActions: number;
}

export interface ActorState {
  id: string;
  hp: number;
  energy: number;
  position: Position;
  facing: Direction;
  armor: ArmorType;
  cooldowns: Record<string, number>;
  statuses: {
    guard: StatusEffect | null;
    dashBuff: StatusEffect | null;
    utility: StatusEffect | null;
  };
  stats: ActorStats;
  moveCost?: number;
}

// ── Events ──

export interface GameEvent {
  tick: number;
  type: string;
  actorId: string | null;
  targetId: string | null;
  data: Record<string, unknown> | null;
}

// ── Game State ──

export interface GameState {
  seed: number;
  tick: number;
  maxTicks: number;
  ruleset: string;
  actors: Record<string, ActorState>;
  objectiveScore: Record<string, number>;
  events: GameEvent[];
  winnerId: string | null;
  endReason: string | null;
  ended: boolean;
  durationSec: number;
}

// ── Bot Config (from Vercel lobby) ──

export interface BotConfig {
  id: string;
  name: string;
  systemPrompt?: string;
  loadout?: string[];
  armor?: ArmorType;
  position?: Position;
  moveCost?: number;
}

// ── Bot Performance Stats ──

export interface BotStats {
  ticksPlayed: number;
  ticksMissed: number;
  actionsQueued: number;
}

// ── Match Result ──

export interface MatchResult {
  winnerId: string | null;
  endReason: string | null;
  finalTick: number;
  actors: Record<string, { hp: number; damageDealt: number; illegalActions: number }>;
  objectiveScore: Record<string, number>;
  botStats?: Record<string, BotStats>;
}
