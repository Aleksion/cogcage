import { UNIT_SCALE } from './constants.js';

export const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const SQRT1_2 = Math.SQRT1_2;

export const DIR_VECTORS = {
  N: { x: 0, y: -1 },
  NE: { x: SQRT1_2, y: -SQRT1_2 },
  E: { x: 1, y: 0 },
  SE: { x: SQRT1_2, y: SQRT1_2 },
  S: { x: 0, y: 1 },
  SW: { x: -SQRT1_2, y: SQRT1_2 },
  W: { x: -1, y: 0 },
  NW: { x: -SQRT1_2, y: -SQRT1_2 },
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const distanceTenths = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  return Math.round(dist);
};

export const applyDirection = (pos, dir, distance) => {
  const vec = DIR_VECTORS[dir];
  if (!vec) return { ...pos };
  return {
    x: Math.round(pos.x + vec.x * distance),
    y: Math.round(pos.y + vec.y * distance),
  };
};

export const directionFromVector = (dx, dy) => {
  if (dx === 0 && dy === 0) return 'N';
  const angle = Math.atan2(dy, dx);
  const octant = Math.round((8 * angle) / (2 * Math.PI)) & 7;
  const mapping = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  return mapping[octant];
};

export const facingDot = (facing, dx, dy) => {
  const vec = DIR_VECTORS[facing] ?? DIR_VECTORS.N;
  const length = Math.hypot(dx, dy);
  if (length === 0) return 1;
  return (vec.x * (dx / length)) + (vec.y * (dy / length));
};

export const inGuardArc = (facing, defender, attacker) => {
  const dx = attacker.x - defender.x;
  const dy = attacker.y - defender.y;
  const dot = facingDot(facing, dx, dy);
  return dot >= 0.5; // cos(60deg)
};

export const toUnits = (valueTenths) => valueTenths / UNIT_SCALE;
