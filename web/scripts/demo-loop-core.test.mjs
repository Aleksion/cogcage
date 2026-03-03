import test from 'node:test';
import assert from 'node:assert/strict';

const demo = await import('../app/components/DemoLoop.tsx');

const {
  ACTION_AP_MAX,
  ACTION_AP_COST,
  makeInitialLiveState,
  runPlayTurn,
} = demo;

test('play loop supports directional movement with AP spend', () => {
  const start = makeInitialLiveState();
  const next = runPlayTurn(start, { action: 'MOVE', moveDir: 'RIGHT' }, { forcedAiAction: 'WAIT' });

  assert.equal(next.p1.pos.x, 1);
  assert.equal(next.p1.pos.y, 0);
  const expectedAp = start.p1.ap + demo.BERSERKER.speed - ACTION_AP_COST.MOVE;
  assert.ok(Math.abs(next.p1.ap - expectedAp) < 1e-9);
});

test('insufficient AP forces WAIT, then AP regen enables action next turn', () => {
  const start = makeInitialLiveState();
  start.p1.ap = 0.1;

  const waitTurn = runPlayTurn(start, { action: 'STUN' }, { forcedAiAction: 'WAIT' });
  assert.equal(waitTurn.log[0].p1Action, 'WAIT');
  assert.equal(waitTurn.log[0].p1WaitReason, 'INSUFFICIENT_AP');
  assert.ok(waitTurn.log[0].p1ApRecovered > 0);
  assert.equal(waitTurn.log[0].p1ApSpent, 0);
  assert.ok(waitTurn.p1.ap > 1.0);

  const moveTurn = runPlayTurn(waitTurn, { action: 'MOVE', moveDir: 'DOWN' }, { forcedAiAction: 'WAIT' });
  assert.equal(moveTurn.log[1].p1Action, 'MOVE');
  assert.equal(moveTurn.p1.pos.y, 1);
});

test('movement clamps at map boundary', () => {
  const start = makeInitialLiveState();
  const next = runPlayTurn(start, { action: 'MOVE', moveDir: 'LEFT' }, { forcedAiAction: 'WAIT' });

  assert.equal(next.p1.pos.x, 0);
  assert.equal(next.p1.pos.y, 0);
});

test('action economy caps AP and keeps turns gated', () => {
  const state = makeInitialLiveState();
  state.p1.ap = ACTION_AP_MAX;
  const waited = runPlayTurn(state, { action: 'STUN' }, { forcedAiAction: 'WAIT' });

  assert.equal(waited.log[0].p1Action, 'STUN');
  assert.ok(waited.p1.ap < ACTION_AP_MAX);

  let rolling = waited;
  for (let i = 0; i < 8; i += 1) {
    rolling = runPlayTurn(rolling, { action: 'DEFEND' }, { forcedAiAction: 'WAIT' });
  }
  assert.ok(rolling.p1.ap <= ACTION_AP_MAX + Number.EPSILON);
});
