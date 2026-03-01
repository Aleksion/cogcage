import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { runMatchAsync } from '~/lib/ws2/run-match'
import { HP_MAX, TICK_RATE, MAX_TICKS, UNIT_SCALE } from '~/lib/ws2/index'
import type { BotConfig, MatchSnapshot } from '~/lib/ws2/match-types'
import { PARTS, composeMold, type Part } from '~/lib/ws2/parts'
import ArenaCanvas, { type ArenaHandle } from './ArenaCanvas'
import BattleHUD from './BattleHUD'
import BrainStream from './BrainStream'
import {
  playAttackSound,
  playHitSound,
  playKOSound,
  startAmbient,
  stopAmbient,
  setMuted,
  isMuted,
} from '~/lib/sound'

/* ── Constants ────────────────────────────────────────────────── */

const ENERGY_MAX = 1000

const DEFAULT_PLAYER_MOLD: Part[] = [
  PARTS.find(p => p.id === 'exo-plating')!,
  PARTS.find(p => p.id === 'crusher-claws')!,
  PARTS.find(p => p.id === 'berserker-directive')!,
  PARTS.find(p => p.id === 'adrenaline')!,
]

const DEFAULT_OPPONENT_MOLD: Part[] = [
  PARTS.find(p => p.id === 'phase-silk')!,
  PARTS.find(p => p.id === 'rending-talons')!,
  PARTS.find(p => p.id === 'tactician-directive')!,
  PARTS.find(p => p.id === 'regenerator')!,
]

const ACTION_ICONS: Record<string, string> = {
  MELEE_STRIKE: '\u2694\uFE0F',
  RANGED_SHOT: '\uD83C\uDFAF',
  GUARD: '\uD83D\uDEE1\uFE0F',
  DASH: '\uD83D\uDCA8',
  MOVE: '\uD83D\uDC63',
  UTILITY: '\u26A1',
  NO_OP: '\u23F8\uFE0F',
}

const SCRIPTED_REASONING: Record<string, string> = {
  MELEE_STRIKE: 'Enemy in range \u2014 press the advantage!',
  RANGED_SHOT: 'Clear line of sight \u2014 taking the shot.',
  GUARD: 'Low resources \u2014 bracing for impact.',
  MOVE: 'Closing distance to engage.',
  DASH: 'Rushing into position!',
  UTILITY: 'Deploying tactical ability.',
  NO_OP: 'Conserving energy.',
}

interface FeedEntry {
  text: string
  reasoning?: string
}

/* ── Streaming brain helper ──────────────────────────────────── */

async function streamBrainTokens(
  gameState: any,
  actorId: string,
  bot: BotConfig,
  opponentIds: string[],
  onToken: (delta: string) => void,
  onDecision: (action: any) => void,
  signal?: AbortSignal,
) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (bot.temperature !== undefined) {
      headers['X-Llm-Temperature'] = String(bot.temperature)
    }

    const res = await fetch('/api/agent/decide-stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gameState,
        actorId,
        systemPrompt: bot.systemPrompt,
        loadout: bot.loadout,
        opponentIds,
        brainPrompt: bot.brainPrompt,
      }),
      signal,
    })

    if (!res.ok || !res.body) {
      onDecision({ type: 'NO_OP' })
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'token') {
            onToken(parsed.delta)
          } else if (parsed.type === 'decision') {
            onDecision(parsed.action)
          }
        } catch { /* skip */ }
      }
    }
  } catch {
    onDecision({ type: 'NO_OP' })
  }
}

/* ── Component ───────────────────────────────────────────────── */

interface CinematicBattleProps {
  seed?: number
  playerMold?: Part[] | null
  opponentMold?: Part[] | null
  playerName?: string
}

export default function CinematicBattle({ seed: seedProp, playerMold, opponentMold, playerName }: CinematicBattleProps) {
  const playerBot = useMemo(() => composeMold(
    playerMold ?? DEFAULT_PLAYER_MOLD,
    'botA',
    playerName ?? 'YOUR CRAWLER',
    { x: 4, y: 10 },
  ), [playerMold, playerName])

  const opponentBot = useMemo(() => composeMold(
    opponentMold ?? DEFAULT_OPPONENT_MOLD,
    'botB',
    'OPPONENT',
    { x: 16, y: 10 },
  ), [opponentMold])
  const arenaRef = useRef<ArenaHandle>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevEventsLenRef = useRef(0)
  const streamAbortRef = useRef<AbortController | null>(null)

  // Match state
  const [botAHp, setBotAHp] = useState(HP_MAX)
  const [botBHp, setBotBHp] = useState(HP_MAX)
  const [botAEnergy, setBotAEnergy] = useState(0)
  const [botBEnergy, setBotBEnergy] = useState(0)
  const [tick, setTick] = useState(0)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [phase, setPhase] = useState<'loading' | 'countdown' | 'playing' | 'ended'>('loading')
  const [countdownNum, setCountdownNum] = useState<string | null>(null)
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [endReason, setEndReason] = useState('')

  // Brain stream state
  const [brainTokensA, setBrainTokensA] = useState('')
  const [brainTokensB, setBrainTokensB] = useState('')
  const [thinkingA, setThinkingA] = useState(false)
  const [thinkingB, setThinkingB] = useState(false)
  const [lastActionA, setLastActionA] = useState<string | null>(null)
  const [lastActionB, setLastActionB] = useState<string | null>(null)
  const [historyA, setHistoryA] = useState<string[]>([])
  const [historyB, setHistoryB] = useState<string[]>([])

  // Sound
  const [muted, setMutedState] = useState(false)
  const onToggleMute = useCallback(() => {
    setMutedState((m) => {
      setMuted(!m)
      return !m
    })
  }, [])

  // Stats for post-match
  const statsRef = useRef({ hitsA: 0, hitsB: 0, dmgA: 0, dmgB: 0 })

  // Seed
  const matchSeed = seedProp || ((Date.now() ^ 0x5f3759df) >>> 0) || 1
  const [currentSeed, setCurrentSeed] = useState(matchSeed)

  /* ── Snapshot handler ──────────────────────────────────────── */

  const handleSnapshot = useCallback((snap: MatchSnapshot) => {
    const s = snap.state
    const a = s.actors?.botA
    const b = s.actors?.botB
    if (!a || !b) return

    setBotAHp(a.hp)
    setBotBHp(b.hp)
    setTick(s.tick)
    if (typeof a.energy === 'number') setBotAEnergy(a.energy)
    if (typeof b.energy === 'number') setBotBEnergy(b.energy)

    // Update arena positions
    if (a.position && arenaRef.current) {
      arenaRef.current.updatePositions(
        a.position,
        b.position,
      )
    }

    // Process new events
    const events: any[] = s.events || []
    const prev = prevEventsLenRef.current
    const newEvents = events.slice(prev)
    prevEventsLenRef.current = events.length

    const entries: FeedEntry[] = []

    for (const evt of newEvents) {
      const who = evt.actorId === 'botA' ? playerBot.name : opponentBot.name
      const isA = evt.actorId === 'botA'

      if (evt.type === 'ACTION_ACCEPTED') {
        const d = evt.data
        if (d.type === 'NO_OP') continue
        const icon = ACTION_ICONS[d.type] || '\u26A1'
        const label =
          d.type === 'MOVE' || d.type === 'DASH'
            ? `${d.type} ${d.dir}`
            : d.type

        // Find reasoning
        const reasoningEvt = newEvents.find(
          (e: any) =>
            e.type === 'BOT_REASONING' && e.actorId === evt.actorId && e.tick === evt.tick,
        )
        const reasoning =
          reasoningEvt?.data?.reasoning || SCRIPTED_REASONING[d.type] || undefined

        entries.push({ text: `${icon} ${who}: ${label}`, reasoning })

        // Trigger arena animations
        if (arenaRef.current) {
          if (d.type === 'MELEE_STRIKE') {
            arenaRef.current.triggerAttack(isA ? 'botA' : 'botB', 'melee')
            playAttackSound('melee')
          } else if (d.type === 'RANGED_SHOT') {
            arenaRef.current.triggerAttack(isA ? 'botA' : 'botB', 'ranged')
            playAttackSound('ranged')
          } else if (d.type === 'GUARD') {
            arenaRef.current.triggerGuard(isA ? 'botA' : 'botB')
            playAttackSound('guard')
          } else if (d.type === 'DASH') {
            playAttackSound('dash')
          }
        }

        // Update brain stream last action
        if (isA) setLastActionA(d.type)
        else setLastActionB(d.type)
      }

      if (evt.type === 'DAMAGE_APPLIED') {
        const target = evt.targetId === 'botA' ? playerBot.name : opponentBot.name
        const isTargetA = evt.targetId === 'botA'
        const amount = evt.data?.amount ?? 0
        const guarded = evt.data?.defenderGuarded ? ' (guarded)' : ''
        entries.push({
          text: `\uD83D\uDCA5 ${who} hits ${target} for ${amount} dmg${guarded}`,
        })

        if (arenaRef.current) {
          arenaRef.current.triggerHit(isTargetA ? 'botA' : 'botB', amount)
          if (amount > 15) arenaRef.current.shakeCamera()
        }
        playHitSound(amount)

        // Track stats
        if (evt.actorId === 'botA') {
          statsRef.current.hitsA++
          statsRef.current.dmgA += amount
        } else {
          statsRef.current.hitsB++
          statsRef.current.dmgB += amount
        }
      }

      if (evt.type === 'MATCH_END') {
        entries.push({ text: `\uD83C\uDFC1 MATCH END \u2014 ${evt.data?.reason ?? ''}` })
      }
    }

    if (entries.length) {
      setFeed((prev) => [...entries, ...prev].slice(0, 50))
    }

    if (snap.ended) {
      setWinnerId(snap.winnerId)
      setEndReason(s.endReason || 'UNKNOWN')
      setPhase('ended')
      if (snap.winnerId) {
        const loser = snap.winnerId === 'botA' ? 'botB' : 'botA'
        arenaRef.current?.triggerDeath(loser)
      }
      playKOSound()
      stopAmbient()
    }
  }, [playerBot.name, opponentBot.name])

  /* ── Brain stream integration ─────────────────────────────── */

  const runBrainStream = useCallback(
    (snap: any, botId: string, bot: BotConfig, opponentIds: string[]) => {
      const isA = botId === 'botA'
      if (isA) {
        setThinkingA(true)
        setBrainTokensA('')
      } else {
        setThinkingB(true)
        setBrainTokensB('')
      }

      streamAbortRef.current = new AbortController()

      streamBrainTokens(
        snap,
        botId,
        bot,
        opponentIds,
        (delta) => {
          if (isA) setBrainTokensA((prev) => prev + delta)
          else setBrainTokensB((prev) => prev + delta)
        },
        (action) => {
          if (isA) {
            setThinkingA(false)
            if (action?.type && action.type !== 'NO_OP') {
              setLastActionA(action.type)
              setHistoryA((prev) =>
                [...prev, `${action.type}${action.dir ? ' ' + action.dir : ''}: ${action.reasoning || '...'}`].slice(-10),
              )
            }
          } else {
            setThinkingB(false)
            if (action?.type && action.type !== 'NO_OP') {
              setLastActionB(action.type)
              setHistoryB((prev) =>
                [...prev, `${action.type}${action.dir ? ' ' + action.dir : ''}: ${action.reasoning || '...'}`].slice(-10),
              )
            }
          }
        },
        streamAbortRef.current.signal,
      )
    },
    [],
  )

  /* ── Start / rematch ──────────────────────────────────────── */

  const startMatch = useCallback(
    (newSeed?: number) => {
      const seed = newSeed || ((Date.now() ^ 0x5f3759df) >>> 0) || 1
      setCurrentSeed(seed)
      setBotAHp(HP_MAX)
      setBotBHp(HP_MAX)
      setBotAEnergy(0)
      setBotBEnergy(0)
      setTick(0)
      setFeed([])
      setWinnerId(null)
      setEndReason('')
      setPhase('playing')
      setBrainTokensA('')
      setBrainTokensB('')
      setThinkingA(false)
      setThinkingB(false)
      setLastActionA(null)
      setLastActionB(null)
      setHistoryA([])
      setHistoryB([])
      prevEventsLenRef.current = 0
      statsRef.current = { hitsA: 0, hitsB: 0, dmgA: 0, dmgB: 0 }

      const controller = new AbortController()
      abortRef.current = controller

      // Start ambient sound
      startAmbient()

      // Use both streaming brain AND the normal match runner
      // The match runner uses /api/agent/decide (non-streaming)
      // Brain streams run in parallel for the visual effect
      const wrappedSnapshot = (snap: MatchSnapshot) => {
        handleSnapshot(snap)

        // Fire brain streams on each decision tick
        const s = snap.state
        if (!snap.ended && s.tick > 0) {
          const a = s.actors?.botA
          const b = s.actors?.botB
          if (a?.hp > 0) {
            runBrainStream(
              { tick: s.tick, actors: s.actors, events: (s.events || []).slice(-10) },
              'botA',
              playerBot,
              ['botB'],
            )
          }
          if (b?.hp > 0) {
            runBrainStream(
              { tick: s.tick, actors: s.actors, events: (s.events || []).slice(-10) },
              'botB',
              opponentBot,
              ['botA'],
            )
          }
        }
      }

      runMatchAsync(seed, [playerBot, opponentBot], wrappedSnapshot, '/api/agent/decide', controller.signal).catch(
        (err) => console.error('[CinematicBattle] match error:', err),
      )
    },
    [handleSnapshot, runBrainStream, playerBot, opponentBot],
  )

  /* ── Auto-start with countdown ───────────────────────────── */

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    // Loading phase, then countdown, then fight
    timers.push(setTimeout(() => {
      if (cancelled) return
      setPhase('countdown')
      setCountdownNum('3')
    }, 600))

    timers.push(setTimeout(() => {
      if (cancelled) return
      setCountdownNum('2')
    }, 1600))

    timers.push(setTimeout(() => {
      if (cancelled) return
      setCountdownNum('1')
    }, 2600))

    timers.push(setTimeout(() => {
      if (cancelled) return
      setCountdownNum('FIGHT!')
    }, 3600))

    timers.push(setTimeout(() => {
      if (cancelled) return
      setCountdownNum(null)
      startMatch(seedProp)
    }, 4400))

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      abortRef.current?.abort()
      streamAbortRef.current?.abort()
      stopAmbient()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rematch = () => {
    abortRef.current?.abort()
    streamAbortRef.current?.abort()
    startMatch()
  }

  const winnerName =
    winnerId === 'botA' ? playerBot.name : winnerId === 'botB' ? opponentBot.name : null
  const winnerColor =
    winnerId === 'botA' ? '#EB4D4B' : winnerId === 'botB' ? '#00E5FF' : '#FFD600'

  const shareUrl = `cogcage.com/demo?seed=${currentSeed}`
  const [copied, setCopied] = useState(false)
  const copyLink = () => {
    navigator.clipboard.writeText(`https://${shareUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#050510' }}>
      {/* Three.js Arena — behind everything */}
      <ArenaCanvas ref={arenaRef} />

      {/* HUD Overlay */}
      <BattleHUD
        botAHp={botAHp}
        botBHp={botBHp}
        botAEnergy={botAEnergy}
        botBEnergy={botBEnergy}
        tick={tick}
        tickRate={TICK_RATE}
        maxTicks={MAX_TICKS}
        feed={feed}
        phase={phase === 'ended' ? 'ended' : 'playing'}
        /* countdown and loading also show 'playing' state in HUD */
        muted={muted}
        onToggleMute={onToggleMute}
        botAName={playerBot.name}
        botBName={opponentBot.name}
      />

      {/* Brain Stream Panels — desktop only */}
      <div className="brain-panels-desktop">
        <BrainStream
          botName={playerBot.name}
          botColor="#EB4D4B"
          tokens={brainTokensA}
          isThinking={thinkingA}
          lastAction={lastActionA}
          history={historyA}
          side="left"
        />
        <BrainStream
          botName={opponentBot.name}
          botColor="#00E5FF"
          tokens={brainTokensB}
          isThinking={thinkingB}
          lastAction={lastActionB}
          history={historyB}
          side="right"
        />
      </div>

      {/* Mobile brain ticker */}
      <div className="brain-mobile-ticker">
        <div
          style={{
            position: 'fixed',
            bottom: 60,
            left: 0,
            right: 0,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
            display: 'flex',
            gap: 8,
            fontSize: '0.65rem',
            fontFamily: "'IBM Plex Mono', monospace",
            overflow: 'hidden',
          }}
        >
          <span style={{ color: '#EB4D4B', flexShrink: 0 }}>{playerBot.name.slice(0, 3)}:</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {thinkingA ? brainTokensA.slice(-60) + '...' : lastActionA || 'waiting'}
          </span>
          <span style={{ color: '#00E5FF', flexShrink: 0 }}>{opponentBot.name.slice(0, 3)}:</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {thinkingB ? brainTokensB.slice(-60) + '...' : lastActionB || 'waiting'}
          </span>
        </div>
      </div>

      {/* Loading overlay */}
      {phase === 'loading' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,5,16,0.95)',
          }}
        >
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: '3rem',
              color: '#FFD600',
              textShadow: '3px 3px 0 #000',
              marginBottom: 16,
              animation: 'pulse-text 1.5s infinite',
            }}
          >
            INITIALIZING ARENA
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Loading combatants...
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && countdownNum && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,5,16,0.7)',
            pointerEvents: 'none',
          }}
        >
          <div
            key={countdownNum}
            style={{
              fontFamily: "'Bangers', display",
              fontSize: countdownNum === 'FIGHT!' ? 'clamp(4rem, 12vw, 8rem)' : 'clamp(5rem, 15vw, 10rem)',
              color: countdownNum === 'FIGHT!' ? '#FFD600' : '#fff',
              textShadow: countdownNum === 'FIGHT!'
                ? '4px 4px 0 #000, 0 0 60px rgba(255,214,0,0.6)'
                : '4px 4px 0 #000, 0 0 40px rgba(255,255,255,0.3)',
              animation: 'countdown-slam 0.8s ease-out',
              lineHeight: 1,
            }}
          >
            {countdownNum}
          </div>
        </div>
      )}

      {/* Post-match cinematic overlay */}
      {phase === 'ended' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            animation: 'fade-in 0.5s ease-out',
          }}
        >
          {/* KO burst */}
          <div style={{ animation: 'ko-burst 0.6s ease-out' }}>
            <div
              style={{
                fontFamily: "'Bangers', display",
                fontSize: 'clamp(3rem, 10vw, 6rem)',
                color: '#FFD600',
                textShadow: '4px 4px 0 #000, 0 0 40px rgba(255,214,0,0.5)',
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              K.O.
            </div>
          </div>

          {/* Winner name */}
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: 'clamp(1.5rem, 5vw, 3rem)',
              color: winnerColor,
              textShadow: `3px 3px 0 #000, 0 0 20px ${winnerColor}66`,
              marginTop: 8,
              animation: 'slide-up 0.5s ease-out 0.3s both',
            }}
          >
            {winnerName ? `${winnerName} WINS` : 'DRAW'}
          </div>

          <div
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: 2,
              marginTop: 4,
              animation: 'slide-up 0.5s ease-out 0.5s both',
            }}
          >
            by {endReason.replace(/_/g, ' ')}
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 24,
              animation: 'slide-up 0.5s ease-out 0.7s both',
            }}
          >
            {/* Player stats */}
            <div
              style={{
                background: 'rgba(235,77,75,0.1)',
                border: '2px solid rgba(235,77,75,0.3)',
                borderRadius: 12,
                padding: '16px 24px',
                textAlign: 'center',
                minWidth: 140,
              }}
            >
              <div style={{ fontFamily: "'Bangers', display", fontSize: '1.2rem', color: '#EB4D4B', marginBottom: 8 }}>
                {playerBot.name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
                HP: {botAHp}<br />
                Hits: {statsRef.current.hitsA}<br />
                Dmg: {statsRef.current.dmgA}
              </div>
            </div>

            {/* Opponent stats */}
            <div
              style={{
                background: 'rgba(0,229,255,0.1)',
                border: '2px solid rgba(0,229,255,0.3)',
                borderRadius: 12,
                padding: '16px 24px',
                textAlign: 'center',
                minWidth: 140,
              }}
            >
              <div style={{ fontFamily: "'Bangers', display", fontSize: '1.2rem', color: '#00E5FF', marginBottom: 8 }}>
                {opponentBot.name}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
                HP: {botBHp}<br />
                Hits: {statsRef.current.hitsB}<br />
                Dmg: {statsRef.current.dmgB}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 24,
              flexWrap: 'wrap',
              justifyContent: 'center',
              animation: 'slide-up 0.5s ease-out 1s both',
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={rematch}
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.4rem',
                textTransform: 'uppercase',
                padding: '12px 32px',
                background: '#FFD600',
                color: '#111',
                border: '3px solid #000',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '4px 4px 0 #000',
                transition: 'transform 0.1s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'translate(2px, 2px)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            >
              REMATCH
            </button>
            <a
              href="/"
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.1rem',
                textTransform: 'uppercase',
                padding: '12px 24px',
                background: '#EB4D4B',
                color: '#fff',
                border: '3px solid #000',
                borderRadius: 12,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '4px 4px 0 #000',
              }}
            >
              BUILD YOUR CRAWLER
            </a>
          </div>

          {/* Share link */}
          <div
            style={{
              marginTop: 20,
              animation: 'slide-up 0.5s ease-out 1.2s both',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
              Share this battle:
            </div>
            <button
              onClick={copyLink}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                padding: '6px 16px',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
              }}
            >
              {copied ? 'Copied!' : `${shareUrl} \uD83D\uDCCB`}
            </button>
          </div>
        </div>
      )}

      {/* Back to home link */}
      <a
        href="/"
        style={{
          position: 'fixed',
          top: 12,
          left: 16,
          zIndex: 20,
          fontFamily: "'Bangers', display",
          fontSize: '1.1rem',
          color: '#FFD600',
          textDecoration: 'none',
          textShadow: '2px 2px 0 #000',
          opacity: 0.7,
        }}
      >
        COGCAGE
      </a>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ko-burst {
          0% { transform: scale(4); opacity: 0; }
          50% { transform: scale(0.9); opacity: 1; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes countdown-slam {
          0% { transform: scale(3); opacity: 0; }
          30% { transform: scale(0.85); opacity: 1; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .brain-panels-desktop { display: block; }
        .brain-mobile-ticker { display: none; }
        @media (max-width: 900px) {
          .brain-panels-desktop { display: none; }
          .brain-mobile-ticker { display: block; }
        }
      `}</style>
    </div>
  )
}
