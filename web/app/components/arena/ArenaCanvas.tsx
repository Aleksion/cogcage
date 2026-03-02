// ArenaCanvas — SVG arena map with real-time bot position tracking.
// Replaces the Babylon/Three.js stub. Called by CinematicBattle via ref.
import React, { forwardRef, useImperativeHandle, useState, useCallback } from 'react'

export interface ArenaHandle {
  updatePositions: (
    posA: { x: number; y: number } | null,
    posB: { x: number; y: number } | null,
  ) => void
  triggerAttack: (attacker: 'botA' | 'botB', type: 'melee' | 'ranged') => void
  triggerHit: (target: 'botA' | 'botB', damage: number) => void
  triggerDeath: (target: 'botA' | 'botB') => void
  triggerGuard: (target: 'botA' | 'botB') => void
  shakeCamera: () => void
}

// Grid constants (match QuickDemo)
const UNIT_SCALE = 10 // position units per grid cell
const CELL_PX = 18
const ARENA_SIZE_UNITS = 20
const ARENA_PX = ARENA_SIZE_UNITS * CELL_PX // 360px

interface BotPos { x: number; y: number }
interface FlashState { botA: string | null; botB: string | null }

const ArenaCanvas = forwardRef<ArenaHandle, object>((_props, ref) => {
  const [posA, setPosA] = useState<BotPos | null>(null)
  const [posB, setPosB] = useState<BotPos | null>(null)
  const [flash, setFlash] = useState<FlashState>({ botA: null, botB: null })
  const [deadA, setDeadA] = useState(false)
  const [deadB, setDeadB] = useState(false)

  const triggerFlash = useCallback((target: 'botA' | 'botB', color: string) => {
    setFlash(f => ({ ...f, [target]: color }))
    setTimeout(() => setFlash(f => ({ ...f, [target]: null })), 250)
  }, [])

  useImperativeHandle(ref, () => ({
    updatePositions: (pA, pB) => {
      if (pA) setPosA({ x: pA.x / UNIT_SCALE, y: pA.y / UNIT_SCALE })
      if (pB) setPosB({ x: pB.x / UNIT_SCALE, y: pB.y / UNIT_SCALE })
    },
    triggerAttack: (attacker) => {
      triggerFlash(attacker, '#FFD600')
    },
    triggerHit: (target) => {
      triggerFlash(target, '#FF4444')
    },
    triggerDeath: (target) => {
      if (target === 'botA') setDeadA(true)
      else setDeadB(true)
    },
    triggerGuard: (target) => {
      triggerFlash(target, '#00E5FF')
    },
    shakeCamera: () => {},
  }), [triggerFlash])

  const cx = ARENA_SIZE_UNITS / 2
  const cy = ARENA_SIZE_UNITS / 2

  const toSvg = (pos: BotPos) => ({
    x: pos.x * CELL_PX + CELL_PX / 2,
    y: pos.y * CELL_PX + CELL_PX / 2,
  })

  const svgA = posA ? toSvg(posA) : null
  const svgB = posB ? toSvg(posB) : null

  const distCells =
    posA && posB
      ? Math.sqrt(Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2)).toFixed(1)
      : null

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#050510',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        <span>ARENA MAP</span>
        {distCells && (
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>dist: {distCells} cells</span>
        )}
      </div>

      {/* SVG Grid */}
      <svg
        width={ARENA_PX}
        height={ARENA_PX}
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          background: '#07070f',
          display: 'block',
        }}
      >
        {/* Grid lines */}
        {Array.from({ length: ARENA_SIZE_UNITS + 1 }, (_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={i * CELL_PX} y1={0}
              x2={i * CELL_PX} y2={ARENA_PX}
              stroke="rgba(255,255,255,0.04)" strokeWidth={0.5}
            />
            <line
              x1={0} y1={i * CELL_PX}
              x2={ARENA_PX} y2={i * CELL_PX}
              stroke="rgba(255,255,255,0.04)" strokeWidth={0.5}
            />
          </React.Fragment>
        ))}

        {/* Center objective zone */}
        <circle
          cx={cx * CELL_PX} cy={cy * CELL_PX}
          r={3 * CELL_PX}
          fill="rgba(255,214,0,0.03)"
          stroke="rgba(255,214,0,0.18)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Connection line between bots */}
        {svgA && svgB && !deadA && !deadB && (
          <line
            x1={svgA.x} y1={svgA.y}
            x2={svgB.x} y2={svgB.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        )}

        {/* Bot A (red / attacker) */}
        {svgA && !deadA && (
          <g>
            {flash.botA && (
              <circle
                cx={svgA.x} cy={svgA.y}
                r={14}
                fill={flash.botA}
                opacity={0.35}
              />
            )}
            <rect
              x={svgA.x - 7} y={svgA.y - 7}
              width={14} height={14}
              rx={3}
              fill={flash.botA ?? '#EB4D4B'}
              opacity={0.9}
              style={{ transition: 'fill 0.1s' }}
            />
            <text
              x={svgA.x} y={svgA.y - 10}
              textAnchor="middle"
              fill="#EB4D4B"
              fontSize={9}
              fontWeight="bold"
              fontFamily="IBM Plex Mono, monospace"
            >A</text>
          </g>
        )}

        {/* Bot B (cyan / opponent) */}
        {svgB && !deadB && (
          <g>
            {flash.botB && (
              <circle
                cx={svgB.x} cy={svgB.y}
                r={14}
                fill={flash.botB}
                opacity={0.35}
              />
            )}
            <rect
              x={svgB.x - 7} y={svgB.y - 7}
              width={14} height={14}
              rx={3}
              fill={flash.botB ?? '#00E5FF'}
              opacity={0.9}
              style={{ transition: 'fill 0.1s' }}
            />
            <text
              x={svgB.x} y={svgB.y - 10}
              textAnchor="middle"
              fill="#00E5FF"
              fontSize={9}
              fontWeight="bold"
              fontFamily="IBM Plex Mono, monospace"
            >B</text>
          </g>
        )}

        {/* Dead markers */}
        {deadA && svgA && (
          <text x={svgA.x} y={svgA.y + 5} textAnchor="middle" fill="#FF4444" fontSize={18}>✕</text>
        )}
        {deadB && svgB && (
          <text x={svgB.x} y={svgB.y + 5} textAnchor="middle" fill="#FF4444" fontSize={18}>✕</text>
        )}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px',
        }}
      >
        <span style={{ color: '#EB4D4B' }}>■ BOT-A</span>
        <span style={{ color: '#00E5FF' }}>■ BOT-B</span>
        <span style={{ color: 'rgba(255,214,0,0.5)' }}>◯ ZONE</span>
      </div>
    </div>
  )
})

ArenaCanvas.displayName = 'ArenaCanvas'
export default ArenaCanvas
