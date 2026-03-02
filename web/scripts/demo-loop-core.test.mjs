import test from 'node:test'
import assert from 'node:assert/strict'

import { __demoCore } from '../app/components/DemoLoop.tsx'

function freshBots() {
  const live = __demoCore.makeInitialLiveState()
  return {
    p1: { ...live.p1, pos: { ...live.p1.pos } },
    p2: { ...live.p2, pos: { ...live.p2.pos } },
  }
}

test('demo loop move action updates map position by direction', () => {
  const { p1, p2 } = freshBots()
  const result = __demoCore.resolveTurn('MOVE', 'WAIT', p1, p2, 1, { p1Dir: 'RIGHT' })
  assert.deepEqual(result.p1Pos, { x: 1, y: 0 })
  assert.deepEqual(result.p2Pos, { x: 6, y: 6 })
})

test('demo action economy gates actions by AP', () => {
  assert.equal(__demoCore.canAffordAction(0.7, 'MOVE'), false)
  assert.equal(__demoCore.canAffordAction(0.8, 'MOVE'), true)
  assert.equal(__demoCore.canAffordAction(1.1, 'ATTACK'), false)
  assert.equal(__demoCore.canAffordAction(1.2, 'ATTACK'), true)
  assert.equal(__demoCore.chooseAffordableAction(__demoCore.BERSERKER.bias, 1, false, 0.79), 'WAIT')
})

test('demo defend applies single 50 percent mitigation to incoming attack', () => {
  const { p1, p2 } = freshBots()
  p2.pos = { x: 1, y: 0 } // in range for attack
  const result = __demoCore.resolveTurn('DEFEND', 'ATTACK', p1, p2, 1, {}, () => 0)
  // rollDamage at random=0 => 15, defended => floor(7.5) => 7
  assert.equal(result.p2Dmg, 7)
  assert.equal(result.p1Hp, __demoCore.BERSERKER.hp - 7)
})
