export type Action = 'MOVE' | 'ATTACK' | 'DEFEND' | 'CHARGE' | 'STUN'
export type GameMode = 'watch' | 'play'

export interface Position {
  x: number
  y: number
}

export interface BotConfig {
  name: string
  color: string
  initial: string
  hp: number
  speed: number
  bias: Record<Action, number>
  start: Position
}

export interface BotState {
  hp: number
  pos: Position
  charged: boolean
  stunned: boolean
  defending: boolean
  ap: number
}

export interface TurnResult {
  turn: number
  p1Action: Action | 'WAIT'
  p2Action: Action | 'WAIT'
  p1Dmg: number
  p2Dmg: number
  p1Hp: number
  p2Hp: number
  p1Pos: Position
  p2Pos: Position
  p1Ap: number
  p2Ap: number
  log: string
}

export const GRID_SIZE = 7
export const MAX_TURNS = 15
export const MATCH_COUNT = 3

export const BERSERKER: BotConfig = {
  name: 'BERSERKER',
  color: '#EB4D4B',
  initial: 'B',
  hp: 100,
  speed: 1.2,
  bias: { MOVE: 20, ATTACK: 40, DEFEND: 5, CHARGE: 25, STUN: 10 },
  start: { x: 0, y: 0 },
}

export const TACTICIAN: BotConfig = {
  name: 'TACTICIAN',
  color: '#00E5FF',
  initial: 'T',
  hp: 100,
  speed: 0.9,
  bias: { MOVE: 15, ATTACK: 20, DEFEND: 25, CHARGE: 15, STUN: 25 },
  start: { x: 6, y: 6 },
}

export function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function moveToward(from: Position, to: Position): Position {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: from.x + Math.sign(dx), y: from.y }
  }
  return { x: from.x, y: from.y + Math.sign(dy) }
}

export function clampGrid(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(GRID_SIZE - 1, pos.x)),
    y: Math.max(0, Math.min(GRID_SIZE - 1, pos.y)),
  }
}

export function pickAction(
  bias: Record<Action, number>,
  dist: number,
  stunned: boolean,
  random: () => number = Math.random,
): Action {
  const actions: Action[] = ['MOVE', 'ATTACK', 'DEFEND', 'CHARGE', 'STUN']
  const weights = actions.map((a) => {
    if (a === 'MOVE' && stunned) return 0
    if (a === 'MOVE' && dist <= 2) return Math.floor(bias[a] * 0.3)
    if (dist > 2 && (a === 'ATTACK' || a === 'STUN')) return Math.floor(bias[a] * 0.2)
    if (dist > 2 && a === 'MOVE') return bias[a] * 3
    return bias[a]
  })
  const total = weights.reduce((s, w) => s + w, 0)
  let r = random() * total
  for (let i = 0; i < actions.length; i++) {
    r -= weights[i]
    if (r <= 0) return actions[i]
  }
  return 'MOVE'
}

export function rollDamage(random: () => number = Math.random) {
  return 15 + Math.floor(random() * 11)
}

export function resolveTurn(
  p1Act: Action | 'WAIT',
  p2Act: Action | 'WAIT',
  p1: BotState,
  p2: BotState,
  turnNum: number,
  random: () => number = Math.random,
): TurnResult {
  let p1Dmg = 0
  let p2Dmg = 0
  p1.defending = false
  p2.defending = false

  if (p1Act !== 'WAIT') {
    const dist = manhattan(p1.pos, p2.pos)
    switch (p1Act) {
      case 'MOVE':
        if (!p1.stunned) p1.pos = clampGrid(moveToward(p1.pos, p2.pos))
        break
      case 'ATTACK':
        if (dist <= 2) {
          let dmg = rollDamage(random)
          if (p1.charged) {
            dmg = Math.floor(dmg * 1.4)
            p1.charged = false
          }
          if (p1.stunned && random() < 0.5) dmg = 0
          if (p2Act === 'DEFEND') dmg = Math.floor(dmg * 0.5)
          p1Dmg = dmg
        }
        break
      case 'CHARGE':
        p1.charged = true
        break
      case 'STUN':
        if (dist <= 2) p2.stunned = true
        break
      case 'DEFEND':
        p1.defending = true
        break
    }
  }

  if (p2Act !== 'WAIT') {
    const dist2 = manhattan(p1.pos, p2.pos)
    switch (p2Act) {
      case 'MOVE':
        if (!p2.stunned) p2.pos = clampGrid(moveToward(p2.pos, p1.pos))
        break
      case 'ATTACK':
        if (dist2 <= 2) {
          let dmg = rollDamage(random)
          if (p2.charged) {
            dmg = Math.floor(dmg * 1.4)
            p2.charged = false
          }
          if (p2.stunned && random() < 0.5) dmg = 0
          if (p1Act === 'DEFEND') dmg = Math.floor(dmg * 0.5)
          p2Dmg = dmg
        }
        break
      case 'CHARGE':
        p2.charged = true
        break
      case 'STUN': {
        const dist2s = manhattan(p1.pos, p2.pos)
        if (dist2s <= 2) p1.stunned = true
        break
      }
      case 'DEFEND':
        p2.defending = true
        break
    }
  }

  p2.hp = Math.max(0, p2.hp - p1Dmg)
  p1.hp = Math.max(0, p1.hp - p2Dmg)
  if (p1Act !== 'STUN') p2.stunned = false
  if (p2Act !== 'STUN') p1.stunned = false

  const logParts: string[] = [`T${turnNum}:`]
  if (p1Act === 'WAIT') logParts.push(`${BERSERKER.initial} WAIT`)
  else {
    logParts.push(`${BERSERKER.initial} ${p1Act}`)
    const d = manhattan(p1.pos, p2.pos)
    if (p1Act === 'ATTACK' && d > 2) logParts.push('(miss)')
    else if (p1Dmg > 0) logParts.push(`(${p1Dmg})`)
  }
  if (p2Act === 'WAIT') logParts.push(`vs ${TACTICIAN.initial} WAIT`)
  else {
    logParts.push(`vs ${TACTICIAN.initial} ${p2Act}`)
    const d2 = manhattan(p1.pos, p2.pos)
    if (p2Act === 'ATTACK' && d2 > 2) logParts.push('(miss)')
    else if (p2Dmg > 0) logParts.push(`(${p2Dmg})`)
  }

  return {
    turn: turnNum,
    p1Action: p1Act,
    p2Action: p2Act,
    p1Dmg,
    p2Dmg,
    p1Hp: p1.hp,
    p2Hp: p2.hp,
    p1Pos: { ...p1.pos },
    p2Pos: { ...p2.pos },
    p1Ap: p1.ap,
    p2Ap: p2.ap,
    log: logParts.join(' '),
  }
}

export function simulateMatch(random: () => number = Math.random): { turns: TurnResult[]; winner: string } {
  const p1: BotState = { hp: BERSERKER.hp, pos: { ...BERSERKER.start }, charged: false, stunned: false, defending: false, ap: 0 }
  const p2: BotState = { hp: TACTICIAN.hp, pos: { ...TACTICIAN.start }, charged: false, stunned: false, defending: false, ap: 0 }
  const turns: TurnResult[] = []

  for (let t = 1; t <= MAX_TURNS; t++) {
    p1.ap += BERSERKER.speed
    p2.ap += TACTICIAN.speed
    const p1CanAct = p1.ap >= 1.0
    const p2CanAct = p2.ap >= 1.0
    const dist = manhattan(p1.pos, p2.pos)
    const p1Act: Action | 'WAIT' = p1CanAct ? pickAction(BERSERKER.bias, dist, p1.stunned, random) : 'WAIT'
    const p2Act: Action | 'WAIT' = p2CanAct ? pickAction(TACTICIAN.bias, dist, p2.stunned, random) : 'WAIT'
    if (p1CanAct) p1.ap -= 1.0
    if (p2CanAct) p2.ap -= 1.0

    const result = resolveTurn(p1Act, p2Act, p1, p2, t, random)
    turns.push(result)
    if (p1.hp <= 0 || p2.hp <= 0) break
  }

  const winner = p1.hp > p2.hp ? BERSERKER.name : p2.hp > p1.hp ? TACTICIAN.name : 'DRAW'
  return { turns, winner }
}

export function makeInitialLiveState() {
  return {
    p1: { hp: BERSERKER.hp, pos: { ...BERSERKER.start }, charged: false, stunned: false, defending: false, ap: BERSERKER.speed } as BotState,
    p2: { hp: TACTICIAN.hp, pos: { ...TACTICIAN.start }, charged: false, stunned: false, defending: false, ap: TACTICIAN.speed } as BotState,
    turn: 1,
    log: [] as TurnResult[],
    winner: null as string | null,
    waitingForPlayer: true,
    lastResult: null as TurnResult | null,
  }
}
