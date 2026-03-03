import React, { useEffect, useState } from 'react'

export interface BotHudEntry {
  id: string
  name: string
  hp: number
  energy: number
  color: string
  isPlayer?: boolean
}

interface FeedEntry {
  text: string
  reasoning?: string
}

interface BattleHUDProps {
  actors: BotHudEntry[]
  tick: number
  tickRate: number
  maxTicks: number
  feed: FeedEntry[]
  phase: 'playing' | 'ended'
  muted: boolean
  onToggleMute: () => void
}

const HP_MAX = 100
const ENERGY_MAX = 1000

const hpColor = (hp: number) =>
  hp > 60 ? '#2ecc71' : hp > 30 ? '#f39c12' : '#eb4d4b'

export default function BattleHUD({
  actors,
  tick,
  tickRate,
  maxTicks,
  feed,
  phase,
  muted,
  onToggleMute,
}: BattleHUDProps) {
  const timeSec = (tick / tickRate).toFixed(1)
  const matchProgress = Math.min(100, (tick / maxTicks) * 100)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const visibleActors = isMobile ? actors.slice(0, 2) : actors

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
        fontFamily: "'Kanit', sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: isMobile ? '6px 8px' : '8px 16px',
          gap: isMobile ? 8 : 12,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)',
        }}
      >
        {/* Actor HP bars — left side */}
        <div style={{ flex: 1, maxWidth: isMobile ? 180 : 400, display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 6 }}>
          {visibleActors.map((actor) => {
            const hpPct = Math.max(0, Math.round((actor.hp / HP_MAX) * 100))
            const energyPct = Math.round((actor.energy / ENERGY_MAX) * 100)
            return (
              <div key={actor.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span
                    style={{
                      fontFamily: "'Bangers', display",
                      fontSize: isMobile ? '0.9rem' : '1.1rem',
                      color: actor.color,
                      textShadow: '2px 2px 0 #000',
                      letterSpacing: 1,
                    }}
                  >
                    {isMobile ? actor.name.slice(0, 8) : actor.name}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: isMobile ? '0.6rem' : '0.7rem', color: '#fff', fontWeight: 700 }}>
                    {actor.hp} HP
                  </span>
                </div>
                {/* HP bar */}
                <div style={{ height: isMobile ? 6 : 8, background: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${hpPct}%`,
                      background: `linear-gradient(90deg, ${hpColor(actor.hp)}, ${hpColor(actor.hp)}cc)`,
                      transition: 'width 0.3s ease-out',
                      boxShadow: `0 0 10px ${hpColor(actor.hp)}66`,
                      borderRadius: 4,
                    }}
                  />
                </div>
                {/* Energy bar */}
                <div style={{ height: 3, background: 'rgba(0,0,0,0.4)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${energyPct}%`,
                      background: actor.color,
                      transition: 'width 0.2s ease-out',
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Center — timer + round */}
        <div style={{ textAlign: 'center', minWidth: isMobile ? 90 : 120, flexShrink: 0, marginTop: isMobile ? 2 : 0 }}>
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: isMobile ? '0.72rem' : '0.85rem',
              color: '#FFD600',
              textTransform: 'uppercase',
              letterSpacing: 2,
              textShadow: '1px 1px 0 #000',
            }}
          >
            {phase === 'playing' ? 'LIVE BATTLE' : 'MATCH OVER'}
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: isMobile ? '1.25rem' : '1.6rem',
              fontWeight: 700,
              color: '#fff',
              textShadow: '2px 2px 0 #000',
              lineHeight: 1,
            }}
          >
            {timeSec}s
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4 }}>
            <div
              style={{
                height: '100%',
                width: `${matchProgress}%`,
                background: '#FFD600',
                borderRadius: 2,
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
            TICK {tick}
          </div>
        </div>

        {/* Right spacer to balance layout */}
        <div style={{ flex: isMobile ? 0 : 1, maxWidth: isMobile ? 0 : 400 }} />

        {/* Mute button */}
        <button
          onClick={onToggleMute}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            padding: '4px 8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            position: 'absolute',
            top: isMobile ? 6 : 10,
            right: isMobile ? 6 : 10,
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </button>
      </div>

      {/* Action economy legend */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: isMobile ? '4px 8px' : '6px 12px',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 6,
          display: isMobile ? 'none' : 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: 0.5,
        }}
      >
        <span>{'\u2694\uFE0F'} MELEE &le;3</span>
        <span>{'\uD83C\uDFAF'} RANGED &le;10</span>
        <span>{'\uD83D\uDEE1\uFE0F'} GUARD blocks 40%</span>
        <span>{'\uD83D\uDCA8'} DASH move&times;2</span>
        <span>{'\u26A1'} UTILITY varies</span>
      </div>

      {/* Action feed — bottom center */}
      <div
        style={{
          position: 'fixed',
          bottom: isMobile ? 0 : 26,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: isMobile ? '100%' : 600,
          padding: isMobile ? '8px 10px' : '12px 20px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)',
          zIndex: 5,
        }}
      >
        {feed.slice(0, 4).map((entry, i) => (
          <div
            key={i}
            style={{
              fontSize: '0.78rem',
              fontFamily: "'IBM Plex Mono', monospace",
              color: `rgba(255,255,255,${1 - i * 0.2})`,
              padding: '2px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.text}
          </div>
        ))}
        {feed.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
            Waiting for battle to start...
          </div>
        )}
      </div>
    </div>
  )
}
