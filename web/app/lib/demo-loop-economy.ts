export type DemoAction = 'MOVE' | 'ATTACK' | 'DEFEND' | 'CHARGE' | 'STUN'
export type DemoChosenAction = DemoAction | 'WAIT'
export type DemoGridPosition = { x: number; y: number }

export const DEMO_AP_MAX = 3

export const DEMO_ACTION_AP_COST: Record<DemoAction, number> = {
  MOVE: 0.8,
  ATTACK: 1.2,
  DEFEND: 0.7,
  CHARGE: 1.0,
  STUN: 1.4,
}

export function clampAp(ap: number) {
  return Math.max(0, Math.min(DEMO_AP_MAX, ap))
}

export function clampGridPosition(pos: DemoGridPosition, gridSize: number): DemoGridPosition {
  return {
    x: Math.max(0, Math.min(gridSize - 1, pos.x)),
    y: Math.max(0, Math.min(gridSize - 1, pos.y)),
  }
}

export function moveTowardOnGrid(from: DemoGridPosition, to: DemoGridPosition, gridSize: number): DemoGridPosition {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const next = Math.abs(dx) >= Math.abs(dy)
    ? { x: from.x + Math.sign(dx), y: from.y }
    : { x: from.x, y: from.y + Math.sign(dy) }
  return clampGridPosition(next, gridSize)
}

export function canAffordAction(ap: number, action: DemoAction) {
  return ap >= (DEMO_ACTION_AP_COST[action] ?? Number.POSITIVE_INFINITY)
}

function weightedPick<T>(entries: Array<{ value: T; weight: number }>, fallback: T): T {
  const viable = entries.filter((entry) => entry.weight > 0)
  const total = viable.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) return fallback

  let random = Math.random() * total
  for (const entry of viable) {
    random -= entry.weight
    if (random <= 0) return entry.value
  }
  return viable[viable.length - 1]?.value ?? fallback
}

export function pickAffordableAction(
  bias: Record<DemoAction, number>,
  dist: number,
  stunned: boolean,
  ap: number,
): DemoChosenAction {
  if (ap < Math.min(...Object.values(DEMO_ACTION_AP_COST))) {
    return 'WAIT'
  }

  const actions: DemoAction[] = ['MOVE', 'ATTACK', 'DEFEND', 'CHARGE', 'STUN']
  const weighted = actions.map((action) => {
    if (!canAffordAction(ap, action)) return { value: action, weight: 0 }
    if (action === 'MOVE' && stunned) return { value: action, weight: 0 }
    if (action === 'MOVE' && dist <= 2) return { value: action, weight: Math.floor((bias[action] ?? 0) * 0.3) }
    // Out-of-range offensive actions should not consume turns in the demo loop:
    // force bots to close distance so map movement + AP economy stay legible/playable.
    if (dist > 2 && (action === 'ATTACK' || action === 'STUN')) return { value: action, weight: 0 }
    if (dist > 2 && action === 'MOVE') return { value: action, weight: (bias[action] ?? 0) * 3 }
    return { value: action, weight: bias[action] ?? 0 }
  })

  return weightedPick(weighted, 'WAIT')
}

export function spendActionAp(ap: number, action: DemoChosenAction) {
  if (action === 'WAIT') return clampAp(ap)
  return clampAp(ap - (DEMO_ACTION_AP_COST[action] ?? 0))
}
