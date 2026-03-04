import React from 'react'

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
  playerActorId: string
  focusedTargetId?: string | null
  viewport: 'desktop' | 'tablet' | 'mobile'
  aliveCount: number
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

const ACTION_GUIDE = [
  '\u2694\uFE0F PINCH \u22643',
  '\uD83C\uDFAF SPIT \u226410',
  '\uD83D\uDEE1\uFE0F GUARD 40%',
  '\uD83D\uDCA8 DASH x2',
]

const hpColor = (hp: number) =>
  hp > 60 ? '#2ecc71' : hp > 30 ? '#f39c12' : '#eb4d4b'

export default function BattleHUD({
  actors,
  playerActorId,
  focusedTargetId,
  viewport,
  aliveCount,
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
  const isMobile = viewport === 'mobile'
  const isTablet = viewport === 'tablet'

  const playerActor = actors.find((actor) => actor.id === playerActorId) ?? actors[0]
  const focusedTarget =
    (focusedTargetId ? actors.find((actor) => actor.id === focusedTargetId) : null) ??
    actors.find((actor) => actor.id !== playerActor?.id) ??
    null

  const sideActors = actors.filter(
    (actor) => actor.id !== playerActor?.id && actor.id !== focusedTarget?.id,
  )

  const topPad = isMobile ? 'calc(env(safe-area-inset-top, 0px) + 8px)' : 'calc(env(safe-area-inset-top, 0px) + 14px)'
  const sidePad = isMobile ? 8 : isTablet ? 12 : 18
  const feedBottom = isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : 'calc(env(safe-area-inset-bottom, 0px) + 18px)'
  const feedRows = isMobile ? 3 : 5

  const renderActorCard = (actor: BotHudEntry | null, role: string, align: 'left' | 'right') => {
    if (!actor) return <div />
    const hpPct = Math.max(0, Math.round((actor.hp / HP_MAX) * 100))
    const energyPct = Math.max(0, Math.round((actor.energy / ENERGY_MAX) * 100))
    return (
      <div
        style={{
          width: isMobile ? 136 : isTablet ? 170 : 220,
          justifySelf: align,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 4,
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "'Bangers', display",
              fontSize: 'clamp(0.78rem, 1.6vw, 1.08rem)',
              color: actor.color,
              textShadow: '2px 2px 0 #000',
              letterSpacing: 0.8,
              lineHeight: 1,
              maxWidth: isMobile ? 86 : 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {actor.name}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 'clamp(0.56rem, 1.05vw, 0.68rem)',
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            {actor.hp} HP
          </span>
        </div>
        <div
          style={{
            height: isMobile ? 7 : 8,
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.58)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${hpPct}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${hpColor(actor.hp)}, ${hpColor(actor.hp)}cc)`,
              boxShadow: `0 0 12px ${hpColor(actor.hp)}66`,
              transition: 'width 220ms ease-out',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 3,
            height: 3,
            borderRadius: 999,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.14)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${energyPct}%`,
              borderRadius: 999,
              background: actor.color,
              opacity: 0.78,
              transition: 'width 200ms ease-out',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 2,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.58rem',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {role}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12,
        pointerEvents: 'none',
        fontFamily: "'Kanit', sans-serif",
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: topPad,
          left: sidePad,
          right: sidePad,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr auto' : '1fr auto 1fr',
          alignItems: 'center',
          columnGap: isMobile ? 10 : 14,
          rowGap: 6,
        }}
      >
        {!isMobile && renderActorCard(playerActor ?? null, 'YOU', 'left')}
        {isMobile ? null : renderActorCard(focusedTarget, 'FOCUS', 'right')}
        <div
          style={{
            gridColumn: isMobile ? '1 / span 2' : '2 / 3',
            justifySelf: 'center',
            minWidth: isMobile ? 168 : 206,
            maxWidth: isMobile ? 250 : 280,
            width: '100%',
            position: 'relative',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.63) 100%)',
            backdropFilter: 'blur(6px)',
            padding: isMobile ? '8px 10px 7px' : '9px 12px 8px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: 'clamp(0.68rem, 1.4vw, 0.88rem)',
              color: '#FFD600',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              textShadow: '1px 1px 0 #000',
              textAlign: 'center',
            }}
          >
            {phase === 'playing' ? 'LIVE BATTLE' : 'MATCH OVER'}
          </div>
          <div
            style={{
              marginTop: 1,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 'clamp(1.05rem, 2.5vw, 1.56rem)',
              fontWeight: 700,
              color: '#fff',
              textShadow: '2px 2px 0 #000',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {timeSec}s
          </div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 'clamp(0.56rem, 1.04vw, 0.68rem)',
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 0.6,
            }}
          >
            <span>TICK {tick}</span>
            <span>ALIVE {aliveCount}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 999, marginTop: 6 }}>
            <div
              style={{
                height: '100%',
                width: `${matchProgress}%`,
                background: '#FFD600',
                borderRadius: 999,
                transition: 'width 240ms ease-out',
              }}
            />
          </div>
          <button
            onClick={onToggleMute}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              pointerEvents: 'auto',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              width: isMobile ? 24 : 26,
              height: isMobile ? 24 : 26,
              cursor: 'pointer',
              fontSize: isMobile ? '0.78rem' : '0.84rem',
              lineHeight: 1,
            }}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: feedBottom,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `min(${isMobile ? '96vw' : 'min(68vw, 620px)'}, ${isMobile ? '96vw' : '620px'})`,
          padding: isMobile ? '8px 11px' : '10px 14px',
          borderRadius: 12,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.64) 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(5px)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.38)',
        }}
      >
        {!isMobile && phase === 'playing' && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.58rem',
              color: 'rgba(255,255,255,0.56)',
              letterSpacing: 0.4,
            }}
          >
            {ACTION_GUIDE.map((guide) => (
              <span
                key={guide}
                style={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  padding: '2px 7px',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {guide}
              </span>
            ))}
          </div>
        )}
        {feed.slice(0, feedRows).map((entry, i) => (
          <div
            key={i}
            style={{
              fontSize: isMobile ? '0.66rem' : '0.76rem',
              fontFamily: "'IBM Plex Mono', monospace",
              color: `rgba(255,255,255,${1 - i * 0.18})`,
              padding: '1px 0',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.35,
            }}
          >
            {entry.text}
          </div>
        ))}
        {feed.length === 0 && (
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
            Waiting for battle to start...
          </div>
        )}
      </div>

      {sideActors.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: isMobile ? `calc(${topPad} + 132px)` : `calc(${topPad} + 94px)`,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            maxWidth: '86vw',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {sideActors.map((actor) => (
            <div
              key={actor.id}
              style={{
                padding: '4px 8px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.62)',
                border: '1px solid rgba(255,255,255,0.16)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.58rem',
                color: actor.color,
                letterSpacing: 0.4,
              }}
            >
              {actor.name} {Math.max(0, actor.hp)} HP
            </div>
          ))}
        </div>
      )}

      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: topPad,
            left: sidePad,
            width: 132,
          }}
        >
          {renderActorCard(playerActor ?? null, 'YOU', 'left')}
        </div>
      )}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: topPad,
            right: sidePad,
            width: 132,
          }}
        >
          {renderActorCard(focusedTarget, 'FOCUS', 'right')}
        </div>
      )}
    </div>
  )
}
