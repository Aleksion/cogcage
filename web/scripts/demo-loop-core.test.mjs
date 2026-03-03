import test from 'node:test'
import assert from 'node:assert/strict'

const demo = await import('../app/lib/demo-loop-core.ts')

test('resolveTurn MOVE advances actor on grid', () => {
  const p1 = { hp: 100, pos: { x: 0, y: 0 }, charged: false, stunned: false, defending: false, ap: 0 }
  const p2 = { hp: 100, pos: { x: 6, y: 6 }, charged: false, stunned: false, defending: false, ap: 0 }

  const result = demo.resolveTurn('MOVE', 'WAIT', p1, p2, 1, () => 0)

  assert.deepEqual(result.p1Pos, { x: 1, y: 0 })
  assert.equal(result.p1Dmg, 0)
  assert.equal(result.p2Dmg, 0)
})

test('resolveTurn DEFEND applies 50% damage reduction', () => {
  const p1 = { hp: 100, pos: { x: 2, y: 2 }, charged: false, stunned: false, defending: false, ap: 0 }
  const p2 = { hp: 100, pos: { x: 3, y: 2 }, charged: false, stunned: false, defending: false, ap: 0 }

  const result = demo.resolveTurn('ATTACK', 'DEFEND', p1, p2, 1, () => 0)

  // rollDamage with rng=0 => 15; DEFEND halves to 7.
  assert.equal(result.p1Dmg, 7)
  assert.equal(result.p2Hp, 93)
})

test('action economy accrues AP by speed and spends 1 AP per action', () => {
  const live = demo.makeInitialLiveState()
  const p1 = { ...live.p1 }
  const p2 = { ...live.p2 }

  p1.ap += demo.BERSERKER.speed
  p2.ap += demo.TACTICIAN.speed

  const p1CanAct = p1.ap >= 1
  const p2CanAct = p2.ap >= 1
  if (p1CanAct) p1.ap -= 1
  if (p2CanAct) p2.ap -= 1

  assert.equal(p1CanAct, true)
  assert.equal(p2CanAct, true)
  assert.equal(Number(p1.ap.toFixed(1)), 1.4)
  assert.equal(Number(p2.ap.toFixed(1)), 0.8)
})

test('simulateMatch stays bounded and produces turn data', () => {
  const result = demo.simulateMatch(() => 0)
  assert.ok(result.turns.length > 0)
  assert.ok(result.turns.length <= demo.MAX_TURNS)
  assert.ok(['BERSERKER', 'TACTICIAN', 'DRAW'].includes(result.winner))
  assert.equal(typeof result.turns[0].log, 'string')
})
