import {
  ACTION_COST,
  ACTION_TYPES,
  ARENA_SIZE,
  ARMOR_MULTIPLIER,
  BASE_DAMAGE,
  COOLDOWN_TICKS,
  DASH_BUFF_DURATION_TICKS,
  DASH_DISTANCE,
  DECISION_WINDOW_TICKS,
  ENERGY_MAX,
  ENERGY_REGEN_PER_TICK,
  GUARD_DURATION_TICKS,
  GUARD_MULTIPLIER,
  HP_MAX,
  HP_TIE_EPS,
  MATCH_DURATION_SEC,
  MAX_TICKS,
  MELEE_RANGE,
  MIN_DAMAGE,
  OBJECTIVE_CENTER,
  OBJECTIVE_RADIUS,
  OBJECTIVE_SCORE_PER_TICK,
  OBJECTIVE_SCORE_TO_WIN,
  POSTURE_DASH_MULTIPLIER,
  RANGED_DISTANCE_MULTIPLIER,
  RANGED_MAX,
  RANGED_MIN,
  RULESET_VERSION,
  UNIT_SCALE,
  UTILITY_DURATION_TICKS,
  MOVE_DISTANCE,
} from './constants.js';
import {
  DIRS,
  applyDirection,
  clamp,
  directionFromVector,
  distanceTenths,
  inGuardArc,
} from './geometry.js';

const ACTION_SET = new Set(ACTION_TYPES);

export const createActorState = ({
  id,
  position,
  facing = 'N',
  armor = 'medium',
}) => ({
  id,
  hp: HP_MAX,
  energy: ENERGY_MAX,
  position: { ...position },
  facing,
  armor,
  cooldowns: {
    MELEE_STRIKE: 0,
    RANGED_SHOT: 0,
    GUARD: 0,
    DASH: 0,
    UTILITY: 0,
  },
  statuses: {
    guard: null,
    dashBuff: null,
    utility: null,
  },
  stats: {
    damageDealt: 0,
    illegalActions: 0,
  },
});

export const createInitialState = ({ seed, actors }) => ({
  seed,
  tick: 0,
  maxTicks: MAX_TICKS,
  ruleset: RULESET_VERSION,
  actors,
  objectiveScore: Object.fromEntries(Object.keys(actors).map((id) => [id, 0])),
  events: [],
  winnerId: null,
  endReason: null,
  ended: false,
  durationSec: MATCH_DURATION_SEC,
});

const orderedActorIds = (state) => Object.keys(state.actors).sort();

const emitEvent = (state, event) => {
  state.events.push(event);
};

const makeEvent = (type, payload) => ({
  tick: payload.tick,
  type,
  actorId: payload.actorId ?? null,
  targetId: payload.targetId ?? null,
  data: payload.data ?? null,
});

const isDecisionTick = (tick) => tick % DECISION_WINDOW_TICKS === 0;

const isStatusActive = (status, tick) => status && tick < status.endsAt;

const expireStatuses = (actor, tick) => {
  if (actor.statuses.guard && !isStatusActive(actor.statuses.guard, tick)) {
    actor.statuses.guard = null;
  }
  if (actor.statuses.dashBuff && !isStatusActive(actor.statuses.dashBuff, tick)) {
    actor.statuses.dashBuff = null;
  }
  if (actor.statuses.utility && !isStatusActive(actor.statuses.utility, tick)) {
    actor.statuses.utility = null;
  }
};

const regenEnergy = (actor) => {
  actor.energy = clamp(actor.energy + ENERGY_REGEN_PER_TICK, 0, ENERGY_MAX);
};

const tickCooldowns = (actor) => {
  for (const key of Object.keys(actor.cooldowns)) {
    if (actor.cooldowns[key] > 0) actor.cooldowns[key] -= 1;
  }
};

const clampPosition = (pos) => ({
  x: clamp(pos.x, 0, ARENA_SIZE),
  y: clamp(pos.y, 0, ARENA_SIZE),
});

const getTargetId = (state, actorId, action) => {
  if (action?.targetId && state.actors[action.targetId]) return action.targetId;
  const others = orderedActorIds(state).filter((id) => id !== actorId);
  return others[0] ?? null;
};

const validateAction = (state, actor, action) => {
  if (!action || !ACTION_SET.has(action.type)) {
    return { valid: false, reason: 'UNKNOWN_ACTION' };
  }
  if (!isDecisionTick(state.tick)) {
    return { valid: false, reason: 'NOT_DECISION_TICK' };
  }
  if (action.tick !== state.tick) {
    return { valid: false, reason: 'WRONG_TICK' };
  }
  if (action.type === 'MOVE' || action.type === 'DASH') {
    if (!action.dir || !DIRS.includes(action.dir)) {
      return { valid: false, reason: 'INVALID_DIRECTION' };
    }
  }
  if (action.type === 'MELEE_STRIKE' || action.type === 'RANGED_SHOT') {
    const targetId = getTargetId(state, actor.id, action);
    if (!targetId) return { valid: false, reason: 'TARGET_MISSING' };
    const target = state.actors[targetId];
    const dist = distanceTenths(actor.position, target.position);
    if (action.type === 'MELEE_STRIKE' && dist > MELEE_RANGE) {
      return { valid: false, reason: 'OUT_OF_RANGE' };
    }
    if (action.type === 'RANGED_SHOT' && (dist < RANGED_MIN || dist > RANGED_MAX)) {
      return { valid: false, reason: 'OUT_OF_RANGE' };
    }
  }
  if (action.type === 'UTILITY' && isStatusActive(actor.statuses.utility, state.tick)) {
    return { valid: false, reason: 'UTILITY_ACTIVE' };
  }
  const cost = ACTION_COST[action.type];
  if (typeof cost === 'number' && actor.energy < cost) {
    return { valid: false, reason: 'INSUFFICIENT_ENERGY' };
  }
  if (actor.cooldowns[action.type] > 0) {
    return { valid: false, reason: 'COOLDOWN' };
  }
  return { valid: true };
};

const spendEnergy = (actor, action) => {
  const cost = ACTION_COST[action.type] ?? 0;
  actor.energy = clamp(actor.energy - cost, 0, ENERGY_MAX);
};

const applyCooldown = (actor, action) => {
  const cd = COOLDOWN_TICKS[action.type];
  if (cd) actor.cooldowns[action.type] = cd;
};

const applyMove = (actor, dir, distance) => {
  const next = clampPosition(applyDirection(actor.position, dir, distance));
  actor.position = next;
  actor.facing = dir;
};

const applyGuard = (state, actor) => {
  actor.statuses.guard = { endsAt: state.tick + GUARD_DURATION_TICKS };
  emitEvent(state, makeEvent('STATUS_APPLIED', {
    tick: state.tick,
    actorId: actor.id,
    data: { status: 'GUARD', endsAt: actor.statuses.guard.endsAt },
  }));
};

const applyDash = (state, actor, dir) => {
  applyMove(actor, dir, DASH_DISTANCE);
  actor.statuses.dashBuff = { endsAt: state.tick + DASH_BUFF_DURATION_TICKS, charges: 1 };
  emitEvent(state, makeEvent('STATUS_APPLIED', {
    tick: state.tick,
    actorId: actor.id,
    data: { status: 'DASH_BUFF', endsAt: actor.statuses.dashBuff.endsAt, charges: 1 },
  }));
};

const applyUtility = (state, actor) => {
  actor.statuses.utility = { endsAt: state.tick + UTILITY_DURATION_TICKS, kind: 'GENERIC' };
  emitEvent(state, makeEvent('STATUS_APPLIED', {
    tick: state.tick,
    actorId: actor.id,
    data: { status: 'UTILITY', endsAt: actor.statuses.utility.endsAt, kind: 'GENERIC' },
  }));
};

const applyDamage = (state, attacker, defender, base, distanceTenthsValue) => {
  const postureMult = attacker.statuses.dashBuff?.charges ? POSTURE_DASH_MULTIPLIER : 1.0;
  const distanceMult = base === BASE_DAMAGE.RANGED_SHOT ? RANGED_DISTANCE_MULTIPLIER(distanceTenthsValue) : 1.0;
  const guardActive = isStatusActive(defender.statuses.guard, state.tick) && inGuardArc(defender.facing, defender.position, attacker.position);
  const guardMult = guardActive ? GUARD_MULTIPLIER : 1.0;
  const armorMult = ARMOR_MULTIPLIER[defender.armor] ?? ARMOR_MULTIPLIER.medium;
  const raw = base * postureMult * distanceMult * guardMult * armorMult;
  const final = Math.max(MIN_DAMAGE, Math.floor(raw));

  defender.hp = Math.max(0, defender.hp - final);
  attacker.stats.damageDealt += final;
  if (attacker.statuses.dashBuff?.charges) {
    attacker.statuses.dashBuff.charges -= 1;
    if (attacker.statuses.dashBuff.charges <= 0) attacker.statuses.dashBuff = null;
  }

  emitEvent(state, makeEvent('DAMAGE_APPLIED', {
    tick: state.tick,
    actorId: attacker.id,
    targetId: defender.id,
    data: {
      amount: final,
      base,
      postureMult,
      distanceMult,
      guardMult,
      armorMult,
      distanceTenths: distanceTenthsValue,
      defenderGuarded: guardActive,
    },
  }));
};

const resolveAction = (state, actor, action) => {
  if (!action || action.type === 'NO_OP') return;
  spendEnergy(actor, action);
  applyCooldown(actor, action);

  if (action.type === 'MOVE') {
    applyMove(actor, action.dir, MOVE_DISTANCE);
    return;
  }
  if (action.type === 'DASH') {
    applyDash(state, actor, action.dir);
    return;
  }
  if (action.type === 'GUARD') {
    applyGuard(state, actor);
    return;
  }
  if (action.type === 'UTILITY') {
    applyUtility(state, actor);
    return;
  }
  if (action.type === 'MELEE_STRIKE' || action.type === 'RANGED_SHOT') {
    const targetId = getTargetId(state, actor.id, action);
    if (!targetId) return;
    const target = state.actors[targetId];
    const dist = distanceTenths(actor.position, target.position);
    if (action.type === 'MELEE_STRIKE') {
      actor.facing = directionFromVector(target.position.x - actor.position.x, target.position.y - actor.position.y);
      applyDamage(state, actor, target, BASE_DAMAGE.MELEE_STRIKE, dist);
      return;
    }
    if (action.type === 'RANGED_SHOT') {
      actor.facing = directionFromVector(target.position.x - actor.position.x, target.position.y - actor.position.y);
      applyDamage(state, actor, target, BASE_DAMAGE.RANGED_SHOT, dist);
    }
  }
};

const scoreObjective = (state) => {
  const ids = orderedActorIds(state);
  if (ids.length < 2) return;
  const [aId, bId] = ids;
  const a = state.actors[aId];
  const b = state.actors[bId];
  const aDist = distanceTenths(a.position, OBJECTIVE_CENTER);
  const bDist = distanceTenths(b.position, OBJECTIVE_CENTER);
  const aIn = aDist <= OBJECTIVE_RADIUS;
  const bIn = bDist <= OBJECTIVE_RADIUS;
  if (aIn && !bIn) {
    state.objectiveScore[aId] += OBJECTIVE_SCORE_PER_TICK;
    emitEvent(state, makeEvent('OBJECTIVE_TICK', {
      tick: state.tick,
      actorId: aId,
      data: { score: state.objectiveScore[aId] / UNIT_SCALE },
    }));
  } else if (bIn && !aIn) {
    state.objectiveScore[bId] += OBJECTIVE_SCORE_PER_TICK;
    emitEvent(state, makeEvent('OBJECTIVE_TICK', {
      tick: state.tick,
      actorId: bId,
      data: { score: state.objectiveScore[bId] / UNIT_SCALE },
    }));
  }
};

const determineWinner = (state) => {
  const ids = orderedActorIds(state);
  if (ids.length < 2) return { winnerId: ids[0] ?? null, reason: 'BYE' };
  const [aId, bId] = ids;
  const a = state.actors[aId];
  const b = state.actors[bId];

  if (a.hp > 0 && b.hp <= 0) return { winnerId: aId, reason: 'KO' };
  if (b.hp > 0 && a.hp <= 0) return { winnerId: bId, reason: 'KO' };

  const aObj = state.objectiveScore[aId];
  const bObj = state.objectiveScore[bId];
  const objDiff = aObj - bObj;
  if (Math.abs(objDiff) >= OBJECTIVE_SCORE_TO_WIN) {
    return { winnerId: objDiff > 0 ? aId : bId, reason: 'TIME_OBJECTIVE' };
  }

  const aHpPct = a.hp / HP_MAX;
  const bHpPct = b.hp / HP_MAX;
  if (Math.abs(aHpPct - bHpPct) > HP_TIE_EPS) {
    return { winnerId: aHpPct > bHpPct ? aId : bId, reason: 'TIME_HP' };
  }

  if (a.stats.damageDealt !== b.stats.damageDealt) {
    return { winnerId: a.stats.damageDealt > b.stats.damageDealt ? aId : bId, reason: 'TIME_DAMAGE' };
  }

  if (a.stats.illegalActions !== b.stats.illegalActions) {
    return { winnerId: a.stats.illegalActions < b.stats.illegalActions ? aId : bId, reason: 'TIME_ILLEGAL' };
  }

  return { winnerId: null, reason: 'DRAW' };
};

const endMatch = (state, reasonOverride = null) => {
  if (state.ended) return;
  const { winnerId, reason } = determineWinner(state);
  state.winnerId = winnerId;
  state.endReason = reasonOverride ?? reason;
  state.ended = true;
  emitEvent(state, makeEvent('MATCH_END', {
    tick: state.tick,
    actorId: winnerId,
    data: {
      reason: state.endReason,
      objectiveScore: state.objectiveScore,
      hp: Object.fromEntries(Object.entries(state.actors).map(([id, actor]) => [id, actor.hp])),
      damageDealt: Object.fromEntries(Object.entries(state.actors).map(([id, actor]) => [id, actor.stats.damageDealt])),
      illegalActions: Object.fromEntries(Object.entries(state.actors).map(([id, actor]) => [id, actor.stats.illegalActions])),
    },
  }));
};

const sanitizeAction = (action) => ({
  tick: action.tick,
  type: action.type,
  dir: action.dir ?? null,
  targetId: action.targetId ?? null,
});

const markIllegal = (state, actor, action, reason) => {
  actor.stats.illegalActions += 1;
  emitEvent(state, makeEvent('ILLEGAL_ACTION', {
    tick: state.tick,
    actorId: actor.id,
    data: {
      reason,
      action: sanitizeAction(action),
      energyAtReject: actor.energy,
      cooldowns: { ...actor.cooldowns },
    },
  }));
};

export const resolveTick = (state, actionsByActor) => {
  const actorIds = orderedActorIds(state);
  for (const actorId of actorIds) {
    const actor = state.actors[actorId];
    regenEnergy(actor);
    tickCooldowns(actor);
    expireStatuses(actor, state.tick);
  }

  const acceptedActions = new Map();

  if (isDecisionTick(state.tick)) {
    for (const actorId of actorIds) {
      const actor = state.actors[actorId];
      const action = actionsByActor.get(actorId) ?? { tick: state.tick, type: 'NO_OP' };
      const validation = validateAction(state, actor, action);
      if (!validation.valid) {
        if (action.type !== 'NO_OP') {
          markIllegal(state, actor, action, validation.reason);
        }
        acceptedActions.set(actorId, { tick: state.tick, type: 'NO_OP' });
      } else {
        emitEvent(state, makeEvent('ACTION_ACCEPTED', {
          tick: state.tick,
          actorId: actor.id,
          data: sanitizeAction(action),
        }));
        acceptedActions.set(actorId, action);
      }
    }
  }

  const seedParity = state.seed % 2;
  const resolveOrder = (state.tick + seedParity) % 2 === 0 ? actorIds : [...actorIds].reverse();

  // Defensive actions (GUARD, UTILITY) resolve before offensive ones within the same tick
  // so that a guard declared in the same decision window can absorb a simultaneous attack.
  const DEFENSIVE_ACTIONS = new Set(['GUARD', 'UTILITY']);
  for (const actorId of resolveOrder) {
    const action = acceptedActions.get(actorId);
    if (action && DEFENSIVE_ACTIONS.has(action.type)) {
      resolveAction(state, state.actors[actorId], action);
    }
  }
  for (const actorId of resolveOrder) {
    const action = acceptedActions.get(actorId);
    if (action && !DEFENSIVE_ACTIONS.has(action.type)) {
      resolveAction(state, state.actors[actorId], action);
    }
  }

  scoreObjective(state);

  if (state.tick >= state.maxTicks - 1) {
    endMatch(state, 'TIMEOUT');
  } else {
    const alive = actorIds.filter((id) => state.actors[id].hp > 0);
    if (alive.length <= 1) {
      endMatch(state, 'KO');
    }
  }

  state.tick += 1;
};

const buildActionIndex = (actionLog) => {
  const byTick = new Map();
  for (const action of actionLog) {
    const tick = action.tick;
    if (!byTick.has(tick)) byTick.set(tick, new Map());
    const byActor = byTick.get(tick);
    if (!byActor.has(action.actorId)) byActor.set(action.actorId, []);
    byActor.get(action.actorId).push(action);
  }
  return byTick;
};

export const runMatchFromLog = ({ seed, actors, actionLog }) => {
  const state = createInitialState({ seed, actors });
  const indexed = buildActionIndex(actionLog ?? []);

  while (!state.ended && state.tick < state.maxTicks) {
    const actionsAtTick = indexed.get(state.tick) ?? new Map();
    const actionsByActor = new Map();
    for (const [actorId, actions] of actionsAtTick.entries()) {
      if (actions.length > 1) {
        for (let i = 1; i < actions.length; i += 1) {
          const actor = state.actors[actorId];
          if (actor) {
            markIllegal(state, actor, actions[i], 'DUPLICATE_ACTION');
          }
        }
      }
      actionsByActor.set(actorId, actions[0]);
    }

    resolveTick(state, actionsByActor);
  }

  return state;
};

const cloneActors = (actors) => JSON.parse(JSON.stringify(actors));

export const runMatchWithProvider = ({ seed, actors, actionProvider }) => {
  const initialActors = cloneActors(actors);
  const state = createInitialState({ seed, actors });
  const actionLog = [];

  while (!state.ended && state.tick < state.maxTicks) {
    const actionsByActor = new Map();
    if (isDecisionTick(state.tick) && actionProvider) {
      for (const actorId of orderedActorIds(state)) {
        const action = actionProvider(state, actorId);
        if (action) {
          actionLog.push(action);
          actionsByActor.set(actorId, action);
        }
      }
    }
    resolveTick(state, actionsByActor);
  }

  return { state, actionLog, initialActors };
};

export const createStandardActors = () => ({
  alpha: createActorState({ id: 'alpha', position: { x: 3 * UNIT_SCALE, y: 10 * UNIT_SCALE }, facing: 'E', armor: 'medium' }),
  beta: createActorState({ id: 'beta', position: { x: 17 * UNIT_SCALE, y: 10 * UNIT_SCALE }, facing: 'W', armor: 'medium' }),
});
