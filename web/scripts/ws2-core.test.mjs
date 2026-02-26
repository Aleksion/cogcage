import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createActorState,
  createInitialState,
  runMatchFromLog,
  runMatchWithProvider,
  createStandardActors,
} from '../src/lib/ws2/engine.js';
import { hashEvents, replayMatch } from '../src/lib/ws2/replay.js';
import { Rng } from '../src/lib/ws2/rng.js';
import { createBot } from '../src/lib/ws2/bots.js';
import { UNIT_SCALE } from '../src/lib/ws2/constants.js';

const findEvent = (events, type) => events.find((event) => event.type === type);

const setupActors = () => ({
  alpha: createActorState({ id: 'alpha', position: { x: 9 * UNIT_SCALE, y: 10 * UNIT_SCALE }, facing: 'E', armor: 'medium' }),
  beta: createActorState({ id: 'beta', position: { x: 10 * UNIT_SCALE, y: 10 * UNIT_SCALE }, facing: 'W', armor: 'medium' }),
});

test('guard arc applies multiplier when attacker is in front', () => {
  const actors = setupActors();
  const actionLog = [
    { tick: 0, actorId: 'alpha', type: 'GUARD' },
    { tick: 0, actorId: 'beta', type: 'MELEE_STRIKE', targetId: 'alpha' },
  ];
  const state = runMatchFromLog({ seed: 1, actors, actionLog });
  const dmg = findEvent(state.events, 'DAMAGE_APPLIED');
  assert.ok(dmg, 'expected damage event');
  assert.equal(dmg.data.guardMult, 0.65);
  assert.equal(dmg.data.defenderGuarded, true);
});

test('guard arc does not apply when attacker is behind', () => {
  const actors = setupActors();
  actors.alpha.facing = 'W';
  const actionLog = [
    { tick: 0, actorId: 'alpha', type: 'GUARD' },
    { tick: 0, actorId: 'beta', type: 'MELEE_STRIKE', targetId: 'alpha' },
  ];
  const state = runMatchFromLog({ seed: 1, actors, actionLog });
  const dmg = findEvent(state.events, 'DAMAGE_APPLIED');
  assert.ok(dmg, 'expected damage event');
  assert.equal(dmg.data.guardMult, 1.0);
  assert.equal(dmg.data.defenderGuarded, false);
});

test('illegal action falls back to no-op without energy spend', () => {
  const actors = setupActors();
  actors.beta.energy = 0;
  const actionLog = [
    { tick: 0, actorId: 'beta', type: 'MELEE_STRIKE', targetId: 'alpha' },
  ];
  const state = runMatchFromLog({ seed: 2, actors, actionLog });
  const illegal = findEvent(state.events, 'ILLEGAL_ACTION');
  assert.ok(illegal, 'expected illegal action event');
  assert.equal(illegal.data.reason, 'INSUFFICIENT_ENERGY');
  assert.equal(illegal.data.energyAtReject, 6);
});

test('replay parity matches event hash and winner', () => {
  const rng = new Rng(42);
  const actors = createStandardActors();
  const botA = createBot('melee', rng);
  const botB = createBot('ranged', rng);
  const { state, actionLog } = runMatchWithProvider({
    seed: 42,
    actors,
    actionProvider: (matchState, actorId) => {
      return actorId === 'alpha' ? botA.decide(matchState, actorId) : botB.decide(matchState, actorId);
    },
  });

  const replay = replayMatch({ seed: 42, actors: createStandardActors(), actionLog });
  assert.equal(hashEvents(state.events), replay.eventHash);
  assert.equal(state.winnerId, replay.state.winnerId);
});
