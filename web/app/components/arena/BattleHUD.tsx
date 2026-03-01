import React from 'react'

interface BattleHUDProps {
  botAHp: number
  botBHp: number
  botAEnergy: number
  botBEnergy: number
  tick: number
  tickRate: number
  maxTicks: number
  feed: Array<{ text: string; reasoning?: string }>
  phase: 'playing' | 'ended'
  muted: boolean
  onToggleMute: () => void
}

const HP_MAX = 100
const ENERGY_MAX = 1000

const hpColor = (hp: number) =>
  hp > 60 ? '#2ecc71' : hp > 30 ? '#f39c12' : '#eb4d4b'

export default function BattleHUD({
  botAHp,
  botBHp,
  botAEnergy,
  botBEnergy,
  tick,
  tickRate,
  maxTicks,
  feed,
  phase,
  muted,
  onToggleMute,
}: BattleHUDProps) {
  const hpPctA = Math.max(0, Math.round((botAHp / HP_MAX) * 100))
  const hpPctB = Math.max(0, Math.round((botBHp / HP_MAX) * 100))
  const energyPctA = Math.round((botAEnergy / ENERGY_MAX) * 100)
  const energyPctB = Math.round((botBEnergy / ENERGY_MAX) * 100)
  const timeSec = (tick / tickRate).toFixed(1)
  const matchProgress = Math.min(100, (tick / maxTicks) * 100)

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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          gap: 12,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)',
        }}
      >
        {/* BERSERKER side */}
        <div style={{ flex: 1, maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.3rem',
                color: '#EB4D4B',
                textShadow: '2px 2px 0 #000',
                letterSpacing: 1,
              }}
            >
              BERSERKER
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>
              {botAHp} HP
            </span>
          </div>
          {/* HP bar */}
          <div style={{ height: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div
              style={{
                height: '100%',
                width: `${hpPctA}%`,
                background: `linear-gradient(90deg, ${hpColor(botAHp)}, ${hpColor(botAHp)}cc)`,
                transition: 'width 0.3s ease-out',
                boxShadow: `0 0 10px ${hpColor(botAHp)}66`,
                borderRadius: 5,
              }}
            />
          </div>
          {/* Energy bar */}
          <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
            <div
              style={{
                height: '100%',
                width: `${energyPctA}%`,
                background: '#EB4D4B',
                transition: 'width 0.2s ease-out',
                opacity: 0.7,
              }}
            />
          </div>
        </div>

        {/* Center — timer + round */}
        <div style={{ textAlign: 'center', minWidth: 120, flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: '0.85rem',
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
              fontSize: '1.6rem',
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

        {/* TACTICIAN side */}
        <div style={{ flex: 1, maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.3rem',
                color: '#00E5FF',
                textShadow: '2px 2px 0 #000',
                letterSpacing: 1,
              }}
            >
              TACTICIAN
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>
              {botBHp} HP
            </span>
          </div>
          <div style={{ height: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div
              style={{
                height: '100%',
                width: `${hpPctB}%`,
                background: `linear-gradient(90deg, ${hpColor(botBHp)}, ${hpColor(botBHp)}cc)`,
                transition: 'width 0.3s ease-out',
                boxShadow: `0 0 10px ${hpColor(botBHp)}66`,
                borderRadius: 5,
              }}
            />
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
            <div
              style={{
                height: '100%',
                width: `${energyPctB}%`,
                background: '#00E5FF',
                transition: 'width 0.2s ease-out',
                opacity: 0.7,
              }}
            />
          </div>
        </div>

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
            top: 10,
            right: 10,
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </button>
      </div>

      {/* Action feed — bottom center */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 600,
          padding: '12px 20px',
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
