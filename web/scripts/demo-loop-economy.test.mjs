import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAffordAction,
  clampAp,
  DEMO_ACTION_AP_COST,
  DEMO_AP_MAX,
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
