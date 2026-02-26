export const RULESET_VERSION = 'ws2-core-v1';

export const TICK_RATE = 10;
export const TICK_MS = 100;
export const MATCH_DURATION_SEC = 90;
export const MAX_TICKS = MATCH_DURATION_SEC * TICK_RATE;
export const DECISION_WINDOW_TICKS = 3;
export const DECISION_WINDOW_SEC = DECISION_WINDOW_TICKS / TICK_RATE;

export const UNIT_SCALE = 10; // 0.1 units per integer step
export const ARENA_SIZE_UNITS = 20;
export const ARENA_SIZE = ARENA_SIZE_UNITS * UNIT_SCALE;

export const OBJECTIVE_CENTER = { x: 10 * UNIT_SCALE, y: 10 * UNIT_SCALE };
export const OBJECTIVE_RADIUS = 2.5 * UNIT_SCALE;

export const HP_MAX = 100;
export const ENERGY_MAX = 100 * UNIT_SCALE;
export const ENERGY_REGEN_PER_TICK = 6; // 0.6 energy per tick

export const MOVE_SPEED_UNITS = 4;
export const MOVE_DISTANCE = Math.round(MOVE_SPEED_UNITS * DECISION_WINDOW_SEC * UNIT_SCALE); // 1.2 units
export const DASH_DISTANCE = 3 * UNIT_SCALE;

export const MELEE_RANGE = 1.5 * UNIT_SCALE;
export const RANGED_MIN = 2.0 * UNIT_SCALE;
export const RANGED_MAX = 14 * UNIT_SCALE;

export const ACTION_TYPES = [
  'MOVE',
  'MELEE_STRIKE',
  'RANGED_SHOT',
  'GUARD',
  'DASH',
  'UTILITY',
];

export const ACTION_COST = {
  MOVE: 4 * UNIT_SCALE,
  MELEE_STRIKE: 18 * UNIT_SCALE,
  RANGED_SHOT: 14 * UNIT_SCALE,
  GUARD: 10 * UNIT_SCALE,
  DASH: 22 * UNIT_SCALE,
  UTILITY: 20 * UNIT_SCALE,
};

export const COOLDOWN_TICKS = {
  MELEE_STRIKE: Math.round(1.2 * TICK_RATE),
  RANGED_SHOT: Math.round(0.9 * TICK_RATE),
  GUARD: Math.round(1.5 * TICK_RATE),
  DASH: Math.round(3.0 * TICK_RATE),
  UTILITY: Math.round(5.0 * TICK_RATE),
};

export const GUARD_DURATION_TICKS = Math.round(0.8 * TICK_RATE);
export const DASH_BUFF_DURATION_TICKS = Math.round(1.2 * TICK_RATE);
export const UTILITY_DURATION_TICKS = Math.round(1.2 * TICK_RATE);

export const BASE_DAMAGE = {
  MELEE_STRIKE: 16,
  RANGED_SHOT: 24,
};

export const ARMOR_MULTIPLIER = {
  light: 1.0,
  medium: 0.9,
  heavy: 0.82,
};

export const GUARD_MULTIPLIER = 0.65;

export const POSTURE_DASH_MULTIPLIER = 1.15;

export const RANGED_DISTANCE_MULTIPLIER = (distanceTenths) => {
  if (distanceTenths >= 40 && distanceTenths <= 70) return 1.1;
  if (distanceTenths >= 25 && distanceTenths < 40) return 0.85;
  if (distanceTenths > 70 && distanceTenths <= 100) return 0.8;
  return 1.0;
};

export const MIN_DAMAGE = 1;

export const OBJECTIVE_SCORE_PER_TICK = 1; // tenths-of-point per tick
export const OBJECTIVE_SCORE_TO_WIN = 30; // tenths-of-point lead required
