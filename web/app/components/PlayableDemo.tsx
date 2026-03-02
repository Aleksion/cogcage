import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ACTION_COST,
  ACTION_TYPES,
  COOLDOWN_TICKS,
  DECISION_WINDOW_TICKS,
  ENERGY_MAX,
  HP_MAX,
  MELEE_RANGE,
  RANGED_MAX,
  RANGED_MIN,
  TICK_MS,
  TICK_RATE,
  UNIT_SCALE,
} from '~/lib/ws2/constants'
import { createActorState, createInitialState, resolveTick, type AgentAction, type GameState } from '~/lib/ws2/engine'
import { directionFromVector, distanceTenths, type Direction } from '~/lib/ws2/geometry'

type ActionType = (typeof ACTION_TYPES)[number]

const PLAYER_ID = 'player'
const ENEMY_ID = 'enemy'
const GRID_SIZE = 12
const MAX_FEED = 24

function createGame(seed = Date.now() >>> 0): GameState {
  return createInitialState({
    seed: seed || 1,
    actors: {
      [PLAYER_ID]: createActorState({
        id: PLAYER_ID,
        position: { x: 4 * UNIT_SCALE, y: 10 * UNIT_SCALE },
        facing: 'E',
        armor: 'medium',
      }),
      [ENEMY_ID]: createActorState({
        id: ENEMY_ID,
        position: { x: 16 * UNIT_SCALE, y: 10 * UNIT_SCALE },
        facing: 'W',
        armor: 'medium',
      }),
    },
  })
}

function toGrid(value: number) {
  const normalized = value / (20 * UNIT_SCALE)
  return Math.max(0, Math.min(GRID_SIZE - 1, Math.round(normalized * (GRID_SIZE - 1))))
}

function formatEventLine(event: any) {
  const actor = event.actorId === PLAYER_ID ? 'YOU' : event.actorId === ENEMY_ID ? 'ENEMY' : 'SYSTEM'
  const tick = typeof event.tick === 'number' ? event.tick : '?'
  if (event.type === 'ACTION_ACCEPTED') {
    const type = event.data?.type ?? 'NO_OP'
    const dir = event.data?.dir ? ` ${event.data.dir}` : ''
    if (type === 'NO_OP') return null
    return `[${tick}] ${actor} → ${type}${dir}`
  }
  if (event.type === 'DAMAGE_APPLIED') {
    const target = event.targetId === PLAYER_ID ? 'YOU' : 'ENEMY'
    const dmg = event.data?.amount ?? '?'
    return `[${tick}] ${actor} hit ${target} for ${dmg}`
  }
  if (event.type === 'ILLEGAL_ACTION') {
    return `[${tick}] ${actor} ILLEGAL: ${event.data?.reason ?? 'UNKNOWN'}`
  }
  if (event.type === 'MATCH_END') {
    return `[${tick}] MATCH END: ${event.data?.reason ?? 'UNKNOWN'}`
  }
  return null
}

function chooseEnemyAction(state: GameState): AgentAction {
  const enemy = state.actors[ENEMY_ID]
  const player = state.actors[PLAYER_ID]
  const tick = state.tick
  const dist = distanceTenths(enemy.position, player.position)
  const dirToPlayer = directionFromVector(player.position.x - enemy.position.x, player.position.y - enemy.position.y)

  const canUse = (type: ActionType) =>
    enemy.energy >= ACTION_COST[type] && (enemy.cooldowns[type] ?? 0) <= 0

  if (dist <= MELEE_RANGE && canUse('MELEE_STRIKE')) return { tick, type: 'MELEE_STRIKE', targetId: PLAYER_ID }
  if (dist >= RANGED_MIN && dist <= RANGED_MAX && canUse('RANGED_SHOT')) return { tick, type: 'RANGED_SHOT', targetId: PLAYER_ID }
  if (dist > RANGED_MAX && canUse('DASH')) return { tick, type: 'DASH', dir: dirToPlayer }
  if (canUse('MOVE')) return { tick, type: 'MOVE', dir: dirToPlayer }
  if (canUse('GUARD')) return { tick, type: 'GUARD' }
  return { tick, type: 'NO_OP' }
}

export default function PlayableDemo() {
  const gameRef = useRef<GameState>(createGame())
  const queuedActionRef = useRef<AgentAction | null>(null)
  const seenEventsRef = useRef(0)

  const [version, setVersion] = useState(0)
  const [feed, setFeed] = useState<string[]>([])
  const [selectedAction, setSelectedAction] = useState<ActionType>('MOVE')
  const [selectedDir, setSelectedDir] = useState<Direction>('E')
  const [awaitingTurn, setAwaitingTurn] = useState(true)

  const game = gameRef.current
  const player = game.actors[PLAYER_ID]
  const enemy = game.actors[ENEMY_ID]
  const decisionTick = game.tick % DECISION_WINDOW_TICKS === 0
  const ticksToTurn = decisionTick ? 0 : DECISION_WINDOW_TICKS - (game.tick % DECISION_WINDOW_TICKS)
  const playerEnergy = (player.energy / UNIT_SCALE).toFixed(1)
  const playerAp = Math.floor(player.energy / ACTION_COST.MOVE)

  const actionStats = useMemo(() => {
    return ACTION_TYPES.map((type) => {
      const cost = ACTION_COST[type]
      const cooldown = player.cooldowns[type] ?? 0
      const canAfford = player.energy >= cost
      return { type, cost: (cost / UNIT_SCALE).toFixed(1), cooldown, canAfford, usable: canAfford && cooldown <= 0 }
    })
  }, [player.cooldowns, player.energy])

  const step = () => {
    const state = gameRef.current
    const isDecisionTick = state.tick % DECISION_WINDOW_TICKS === 0
    const actions = new Map<string, AgentAction>()

    if (isDecisionTick) {
      const queued = queuedActionRef.current
      if (!queued) {
        setAwaitingTurn(true)
        return
      }
      actions.set(PLAYER_ID, { ...queued, tick: state.tick })
      actions.set(ENEMY_ID, chooseEnemyAction(state))
      queuedActionRef.current = null
      setAwaitingTurn(false)
    }

    resolveTick(state, actions)

    const newEvents = state.events.slice(seenEventsRef.current)
    seenEventsRef.current = state.events.length
    if (newEvents.length) {
      const lines = newEvents.map(formatEventLine).filter((line): line is string => Boolean(line))
      if (lines.length) {
        setFeed((prev) => [...lines.reverse(), ...prev].slice(0, MAX_FEED))
      }
    }

    if (state.ended || state.tick % DECISION_WINDOW_TICKS === 0) {
      setAwaitingTurn(true)
    }

    setVersion((v) => v + 1)
  }

  useEffect(() => {
    const interval = window.setInterval(step, TICK_MS)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const queuePlayerAction = () => {
    if (!awaitingTurn || game.ended || !decisionTick) return
    const action: AgentAction = { tick: game.tick, type: selectedAction }
    if (selectedAction === 'MOVE' || selectedAction === 'DASH') {
      action.dir = selectedDir
    }
    if (selectedAction === 'MELEE_STRIKE' || selectedAction === 'RANGED_SHOT') {
      action.targetId = ENEMY_ID
    }
    queuedActionRef.current = action
    setAwaitingTurn(false)
  }

  const resetMatch = () => {
    gameRef.current = createGame()
    queuedActionRef.current = null
    seenEventsRef.current = 0
    setFeed([])
    setSelectedAction('MOVE')
    setSelectedDir('E')
    setAwaitingTurn(true)
    setVersion((v) => v + 1)
  }

  const playerCell = { x: toGrid(player.position.x), y: toGrid(player.position.y) }
  const enemyCell = { x: toGrid(enemy.position.x), y: toGrid(enemy.position.y) }
  const winnerLabel = game.winnerId === PLAYER_ID ? 'You' : game.winnerId === ENEMY_ID ? 'Enemy' : 'Draw'

  return (
    <div key={version} style={{ minHeight: '100vh', padding: '1.5rem', background: '#f5f4ef', color: '#1a1a1a' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: '1rem' }}>
        <h1 style={{ fontFamily: "'Bangers', display", fontSize: '2.4rem', margin: 0 }}>Playable Demo Loop</h1>
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', fontWeight: 800 }}>
          <span>Tick {game.tick}</span>
          <span>Time {(game.tick / TICK_RATE).toFixed(1)}s</span>
          <span>Turn Gate {decisionTick ? 'OPEN' : `in ${ticksToTurn} ticks`}</span>
          <span>Energy {playerEnergy}</span>
          <span>Action Pts {playerAp}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '3px solid #111', borderRadius: 14, padding: '0.8rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gap: 4,
                background: '#111',
                borderRadius: 10,
                padding: 6,
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
                const x = idx % GRID_SIZE
                const y = Math.floor(idx / GRID_SIZE)
                const isPlayer = playerCell.x === x && playerCell.y === y
                const isEnemy = enemyCell.x === x && enemyCell.y === y
                const isCenter = Math.abs(x - Math.floor(GRID_SIZE / 2)) <= 1 && Math.abs(y - Math.floor(GRID_SIZE / 2)) <= 1
                return (
                  <div
                    key={`${x}-${y}`}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 6,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      background: isCenter ? '#ffe9a5' : '#f8f8f8',
                      border: `2px solid ${isPlayer ? '#00a8d6' : isEnemy ? '#d63c3c' : '#d8d8d8'}`,
                    }}
                  >
                    {isPlayer ? 'YOU' : isEnemy ? 'EN' : ''}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}>
              HP: You {player.hp}/{HP_MAX} · Enemy {enemy.hp}/{HP_MAX}
            </div>
          </div>

          <div style={{ background: '#fff', border: '3px solid #111', borderRadius: 14, padding: '0.8rem' }}>
            <div style={{ fontFamily: "'Bangers', display", fontSize: '1.3rem', marginBottom: '0.5rem' }}>Turn Controls</div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: 6 }}>Action</label>
            <select
              value={selectedAction}
              onChange={(event) => setSelectedAction(event.target.value as ActionType)}
              style={{ width: '100%', height: 36, border: '2px solid #111', borderRadius: 8, marginBottom: 8 }}
              disabled={!awaitingTurn || game.ended || !decisionTick}
            >
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {(selectedAction === 'MOVE' || selectedAction === 'DASH') && (
              <>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: 6 }}>Direction</label>
                <select
                  value={selectedDir}
                  onChange={(event) => setSelectedDir(event.target.value as Direction)}
                  style={{ width: '100%', height: 36, border: '2px solid #111', borderRadius: 8, marginBottom: 8 }}
                  disabled={!awaitingTurn || game.ended || !decisionTick}
                >
                  {(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'] as Direction[]).map((dir) => (
                    <option key={dir} value={dir}>{dir}</option>
                  ))}
                </select>
              </>
            )}

            <button
              onClick={queuePlayerAction}
              disabled={!awaitingTurn || game.ended || !decisionTick}
              style={{
                width: '100%',
                height: 40,
                border: '3px solid #111',
                borderRadius: 999,
                fontFamily: "'Bangers', display",
                fontSize: '1.1rem',
                background: '#ffd233',
                cursor: awaitingTurn && !game.ended && decisionTick ? 'pointer' : 'not-allowed',
              }}
            >
              Submit Turn
            </button>

            <div style={{ marginTop: 8, fontSize: '0.8rem' }}>
              {game.ended
                ? `Result: ${winnerLabel} (${game.endReason ?? 'ENDED'})`
                : awaitingTurn && decisionTick
                  ? 'Gate open: choose action now.'
                  : 'Resolving tick window...'}
            </div>
            <button
              onClick={resetMatch}
              style={{ width: '100%', marginTop: 10, height: 34, border: '2px solid #111', borderRadius: 10, background: '#fff' }}
            >
              Reset Match
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '3px solid #111', borderRadius: 14, padding: '0.8rem' }}>
          <div style={{ fontFamily: "'Bangers', display", fontSize: '1.3rem', marginBottom: '0.4rem' }}>Action Economy</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {actionStats.map((row) => (
              <div key={row.type} style={{ border: '2px solid #ddd', borderRadius: 10, padding: '0.5rem' }}>
                <div style={{ fontWeight: 900 }}>{row.type}</div>
                <div style={{ fontSize: '0.8rem' }}>Cost {row.cost}</div>
                <div style={{ fontSize: '0.8rem' }}>Cooldown {row.cooldown}</div>
                <div style={{ fontSize: '0.75rem', color: row.usable ? '#188d4d' : '#c0392b' }}>
                  {row.usable ? 'usable' : row.canAfford ? 'cooldown' : 'insufficient energy'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#0f0f0f', color: '#f6f6f6', borderRadius: 12, padding: '0.8rem', minHeight: 140 }}>
          <div style={{ fontFamily: "'Bangers', display", fontSize: '1.2rem', marginBottom: '0.5rem' }}>Combat Log</div>
          {feed.length === 0 && <div style={{ opacity: 0.7 }}>Waiting for first turn...</div>}
          {feed.map((line, idx) => (
            <div key={`${line}-${idx}`} style={{ fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.2rem 0' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

