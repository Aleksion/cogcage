import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAffordAction,
  clampAp,
  DEMO_ACTION_AP_COST,
  DEMO_AP_MAX,
  moveTowardOnGrid,
  pickAffordableAction,
  spendActionAp,
} from '../app/lib/demo-loop-economy.ts'

test('action affordability enforces AP thresholds', () => {
  assert.equal(canAffordAction(DEMO_ACTION_AP_COST.MOVE, 'MOVE'), true)
  assert.equal(canAffordAction(DEMO_ACTION_AP_COST.ATTACK - 0.1, 'ATTACK'), false)
  assert.equal(canAffordAction(DEMO_ACTION_AP_COST.STUN + 0.2, 'STUN'), true)
})

test('AP spend and clamp enforce economy bounds', () => {
  assert.equal(spendActionAp(2.0, 'ATTACK'), 0.8)
  assert.equal(spendActionAp(0.4, 'WAIT'), 0.4)
  assert.equal(clampAp(DEMO_AP_MAX + 10), DEMO_AP_MAX)
  assert.equal(clampAp(-1), 0)
})

test('AI action picker waits when AP cannot afford any action', () => {
  const action = pickAffordableAction(
    { MOVE: 10, ATTACK: 10, DEFEND: 10, CHARGE: 10, STUN: 10 },
    3,
    false,
    0.2,
  )
  assert.equal(action, 'WAIT')
})

test('AI action picker prevents MOVE while stunned', () => {
  const originalRandom = Math.random
  Math.random = () => 0
  try {
    const action = pickAffordableAction(
      { MOVE: 100, ATTACK: 0, DEFEND: 0, CHARGE: 0, STUN: 0 },
      5,
      true,
      2,
    )
    assert.equal(action, 'WAIT')
  } finally {
    Math.random = originalRandom
  }
})

test('AI action picker closes distance instead of picking out-of-range attacks', () => {
  const originalRandom = Math.random
  Math.random = () => 0
  try {
    const action = pickAffordableAction(
      { MOVE: 1, ATTACK: 100, DEFEND: 0, CHARGE: 0, STUN: 100 },
      6,
      false,
      2,
    )
    assert.equal(action, 'MOVE')
  } finally {
    Math.random = originalRandom
  }
})

test('grid movement advances one tile and clamps to arena bounds', () => {
  assert.deepEqual(moveTowardOnGrid({ x: 0, y: 0 }, { x: 6, y: 2 }, 7), { x: 1, y: 0 })
  assert.deepEqual(moveTowardOnGrid({ x: 3, y: 3 }, { x: 3, y: 0 }, 7), { x: 3, y: 2 })
  assert.deepEqual(moveTowardOnGrid({ x: 6, y: 6 }, { x: 8, y: 9 }, 7), { x: 6, y: 6 })
})
