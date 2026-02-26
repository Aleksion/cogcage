import {
  ACTION_COST,
  COOLDOWN_TICKS,
  DASH_DISTANCE,
  DECISION_WINDOW_TICKS,
  ENERGY_MAX,
  MELEE_RANGE,
  MOVE_DISTANCE,
  OBJECTIVE_CENTER,
  OBJECTIVE_RADIUS,
  RANGED_MAX,
  RANGED_MIN,
  UNIT_SCALE,
} from './constants.ts';
import type { ActionType } from './constants.ts';
import { DIRS, applyDirection, distanceTenths, directionFromVector } from './geometry.ts';
import type { Direction, Position } from './geometry.ts';
import type { GameState, ActorState, AgentAction } from './engine.ts';
import type { Rng } from './rng.ts';

export type Archetype = 'melee' | 'ranged' | 'balanced';

export interface Bot {
  archetype: Archetype;
  decide: (state: GameState, actorId: string) => AgentAction | null;
}

interface RangedPreference {
  preferredDistance: number;
  buffer: number;
}

const oppositeDir: Record<Direction, Direction> = {
  N: 'S',
  NE: 'SW',
  E: 'W',
  SE: 'NW',
  S: 'N',
  SW: 'NE',
  W: 'E',
  NW: 'SE',
};

const directionTo = (from: Position, to: Position): Direction => directionFromVector(to.x - from.x, to.y - from.y);

const canAfford = (actor: ActorState, type: string): boolean => actor.energy >= (ACTION_COST[type as ActionType] ?? 0);

const canUse = (actor: ActorState, type: string): boolean => actor.cooldowns[type] === 0 && canAfford(actor, type);

const pickMoveDir = (actor: ActorState, target: ActorState, preferAway: boolean = false): Direction => {
  const dir = directionTo(actor.position, target.position);
  return preferAway ? oppositeDir[dir] : dir;
};

const clampActionTick = (state: GameState): { tick: number } => ({ tick: state.tick });

const shouldGuard = (actor: ActorState, distance: number): boolean => distance <= MELEE_RANGE * 2 && canUse(actor, 'GUARD');

const pickRangedAction = (state: GameState, actor: ActorState, target: ActorState, preference: RangedPreference | null = null): AgentAction | null => {
  const dist = distanceTenths(actor.position, target.position);
  const preferred = preference?.preferredDistance ?? Math.round((RANGED_MIN + RANGED_MAX) / 2);
  const buffer = preference?.buffer ?? Math.round(0.75 * UNIT_SCALE);
  const actorObjDist = distanceTenths(actor.position, OBJECTIVE_CENTER);
  const targetObjDist = distanceTenths(target.position, OBJECTIVE_CENTER);
  const actorInObjective = actorObjDist <= OBJECTIVE_RADIUS;
  const targetInObjective = targetObjDist <= OBJECTIVE_RADIUS;
  if (dist < RANGED_MIN) {
    if (canUse(actor, 'DASH')) {
      const dir = pickMoveDir(actor, target, true);
      return { tick: state.tick, actorId: actor.id, type: 'DASH', dir };
    }
    return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir: pickMoveDir(actor, target, true) };
  }
  if (targetInObjective && !actorInObjective) {
    const dir = directionTo(actor.position, OBJECTIVE_CENTER);
    return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir };
  }
  if (dist >= RANGED_MIN && dist <= RANGED_MAX && canUse(actor, 'RANGED_SHOT')) {
    return { tick: state.tick, actorId: actor.id, type: 'RANGED_SHOT', targetId: target.id };
  }
  if (dist > RANGED_MAX) {
    return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir: pickMoveDir(actor, target, false) };
  }
  if (dist < preferred - buffer) {
    return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir: pickMoveDir(actor, target, true) };
  }
  if (dist > preferred + buffer) {
    return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir: pickMoveDir(actor, target, false) };
  }
  if (shouldGuard(actor, dist)) {
    return { tick: state.tick, actorId: actor.id, type: 'GUARD' };
  }
  return null;
};

const pickMeleeAction = (state: GameState, actor: ActorState, target: ActorState): AgentAction => {
  const dist = distanceTenths(actor.position, target.position);
  if (dist <= MELEE_RANGE && canUse(actor, 'MELEE_STRIKE')) {
    return { tick: state.tick, actorId: actor.id, type: 'MELEE_STRIKE', targetId: target.id };
  }
  if (dist > MELEE_RANGE && canUse(actor, 'DASH') && dist <= MELEE_RANGE + DASH_DISTANCE) {
    const dir = pickMoveDir(actor, target, false);
    return { tick: state.tick, actorId: actor.id, type: 'DASH', dir };
  }
  if (shouldGuard(actor, dist)) {
    return { tick: state.tick, actorId: actor.id, type: 'GUARD' };
  }
  return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir: pickMoveDir(actor, target, false) };
};

const pickBalancedAction = (state: GameState, actor: ActorState, target: ActorState): AgentAction => {
  const dist = distanceTenths(actor.position, target.position);
  if (dist <= MELEE_RANGE && canUse(actor, 'MELEE_STRIKE')) {
    return { tick: state.tick, actorId: actor.id, type: 'MELEE_STRIKE', targetId: target.id };
  }
  if (dist >= RANGED_MIN && dist <= RANGED_MAX && canUse(actor, 'RANGED_SHOT')) {
    return { tick: state.tick, actorId: actor.id, type: 'RANGED_SHOT', targetId: target.id };
  }
  if (shouldGuard(actor, dist)) {
    return { tick: state.tick, actorId: actor.id, type: 'GUARD' };
  }
  return { tick: state.tick, actorId: actor.id, type: 'MOVE', dir: pickMoveDir(actor, target, dist < RANGED_MIN) };
};

export const BOT_ARCHETYPES: readonly Archetype[] = ['melee', 'ranged', 'balanced'];

export const createBot = (archetype: Archetype, rng: Rng): Bot => {
  const rangedPreference: RangedPreference | null = archetype === 'ranged'
    ? {
      preferredDistance: Math.round(RANGED_MIN + (RANGED_MAX - RANGED_MIN) * (0.35 + rng.next() * 0.3)),
      buffer: Math.round(0.6 * UNIT_SCALE),
    }
    : null;
  const meleeGuardBias = archetype === 'melee'
    ? 0.2 + (rng.next() * 0.15)
    : 0;

  return {
    archetype,
    decide(state: GameState, actorId: string): AgentAction | null {
      const actor = state.actors[actorId];
      const targetId = Object.keys(state.actors).find((id) => id !== actorId);
      const target = targetId ? state.actors[targetId] : undefined;
      if (!actor || !target) return null;
      if (state.tick % DECISION_WINDOW_TICKS !== 0) return null;

      if (archetype === 'ranged') return pickRangedAction(state, actor, target, rangedPreference);
      if (archetype === 'melee') {
        const dist = distanceTenths(actor.position, target.position);
        if (dist <= MELEE_RANGE * 2 && canUse(actor, 'GUARD') && rng.next() < meleeGuardBias) {
          return { tick: state.tick, actorId: actor.id, type: 'GUARD' };
        }
        return pickMeleeAction(state, actor, target);
      }
      const roll = rng.next();
      if (roll < 0.15 && canUse(actor, 'GUARD')) {
        return { tick: state.tick, actorId: actor.id, type: 'GUARD' };
      }
      return pickBalancedAction(state, actor, target);
    },
  };
};

export const createArchetypePair = (rng: Rng, archetypeA: Archetype, archetypeB: Archetype): { alpha: Bot; beta: Bot } => ({
  alpha: createBot(archetypeA, rng),
  beta: createBot(archetypeB, rng),
});

export const randomizeSpawn = (actors: Record<string, ActorState>, rng: Rng): void => {
  const radius = 6 * UNIT_SCALE;
  const offsetX = Math.round((rng.next() - 0.5) * radius);
  const offsetY = Math.round((rng.next() - 0.5) * radius);
  actors.alpha.position.x = clamp(actors.alpha.position.x + offsetX, 0, 20 * UNIT_SCALE);
  actors.alpha.position.y = clamp(actors.alpha.position.y + offsetY, 0, 20 * UNIT_SCALE);
  actors.beta.position.x = clamp(actors.beta.position.x - offsetX, 0, 20 * UNIT_SCALE);
  actors.beta.position.y = clamp(actors.beta.position.y - offsetY, 0, 20 * UNIT_SCALE);
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
