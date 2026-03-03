import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { runMatchAsync } from '~/lib/ws2/run-match'
import { HP_MAX, TICK_RATE, MAX_TICKS, UNIT_SCALE, MELEE_RANGE, RANGED_MAX } from '~/lib/ws2/index'
import type { BotConfig, MatchSnapshot } from '~/lib/ws2/match-types'
import { PARTS, composeMold, type Part } from '~/lib/ws2/parts'
import { BabylonArena } from '../BabylonArena'
import type { MatchSnapshot as PitSnapshot } from '~/game/PitScene'
import BattleHUD from './BattleHUD'
import type { BotHudEntry } from './BattleHUD'
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

/** HUD color palette for N actors (matches PitScene ACTOR_COLORS) */
const ACTOR_HUD_COLORS = ['#EB4D4B', '#00E5FF', '#FFD600', '#00c853', '#9c27b0']

interface FeedEntry {
  text: string
  reasoning?: string
}

/* ── Brain state per bot ──────────────────────────────────────── */

interface BotBrainState {
  tokens: string
  thinking: boolean
  lastAction: string | null
  history: string[]
}

const EMPTY_BRAIN: BotBrainState = { tokens: '', thinking: false, lastAction: null, history: [] }

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
  webhookUrl?: string
}

export default function CinematicBattle({ seed: seedProp, playerMold, opponentMold, playerName, webhookUrl }: CinematicBattleProps) {
  const playerBot = useMemo(() => composeMold(
    playerMold ?? DEFAULT_PLAYER_MOLD,
    'botA',
    playerName ?? 'YOUR CRAWLER',
    { x: 4, y: 10 },
    undefined,
    webhookUrl,
  ), [playerMold, playerName, webhookUrl])

  const opponentBot = useMemo(() => composeMold(
    opponentMold ?? DEFAULT_OPPONENT_MOLD,
    'botB',
    'OPPONENT',
    { x: 16, y: 10 },
  ), [opponentMold])

  /** Generic bot list — currently 2 but supports N */
  const matchBots = useMemo(() => [playerBot, opponentBot], [playerBot, opponentBot])

  const [arenaSnapshot, setArenaSnapshot] = useState<PitSnapshot | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevEventsLenRef = useRef(0)
  const streamAbortRef = useRef<AbortController | null>(null)

  // Match state — generic N-player
  const [actorHp, setActorHp] = useState<Record<string, number>>({})
  const [actorEnergy, setActorEnergy] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [phase, setPhase] = useState<'loading' | 'countdown' | 'playing' | 'ended'>('loading')
  const [countdownNum, setCountdownNum] = useState<string | null>(null)
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [endReason, setEndReason] = useState('')

  // Brain stream state — per-bot Record
  const [brainStates, setBrainStates] = useState<Record<string, BotBrainState>>({})

  // Sound
  const [muted, setMutedState] = useState(false)
  const onToggleMute = useCallback(() => {
    setMutedState((m) => {
      setMuted(!m)
      return !m
    })
  }, [])

  // Stats for post-match — generic per-actor
  const statsRef = useRef<Record<string, { hits: number; dmg: number }>>({})

  // Seed
  const matchSeed = seedProp || ((Date.now() ^ 0x5f3759df) >>> 0) || 1
  const [currentSeed, setCurrentSeed] = useState(matchSeed)

  /** Helper: get brain state for an actor */
  const getBrain = (id: string): BotBrainState => brainStates[id] ?? EMPTY_BRAIN

  /** Helper: find bot config by id */
  const botById = useCallback(
    (id: string) => matchBots.find(b => b.id === id),
    [matchBots],
  )

  /** Helper: get display name */
  const nameOf = useCallback(
    (id: string) => botById(id)?.name ?? id,
    [botById],
  )

  /* ── Snapshot handler ──────────────────────────────────────── */

  const handleSnapshot = useCallback((snap: MatchSnapshot) => {
    const s = snap.state
    if (!s.actors || Object.keys(s.actors).length === 0) return

    // Update HP and energy for all actors
    for (const [id, actor] of Object.entries(s.actors)) {
      setActorHp(prev => ({ ...prev, [id]: actor.hp }))
      if (typeof actor.energy === 'number') {
        setActorEnergy(prev => ({ ...prev, [id]: actor.energy }))
      }
    }
    setTick(s.tick)

    // Process new events (diff from cumulative list)
    const events: any[] = s.events || []
    const prev = prevEventsLenRef.current
    const newEvents = events.slice(prev)
    prevEventsLenRef.current = events.length

    // Forward snapshot to BabylonArena / PitScene
    setArenaSnapshot({ state: s, decisions: [], newEvents })

    const entries: FeedEntry[] = []

    for (const evt of newEvents) {
      const who = nameOf(evt.actorId)

      if (evt.type === 'ACTION_ACCEPTED') {
        const d = evt.data
        if (d.type === 'NO_OP') continue
        const icon = ACTION_ICONS[d.type] || '\u26A1'
        const label =
          d.type === 'MOVE' || d.type === 'DASH'
            ? `${d.type} ${d.dir}`
            : d.type

        const reasoningEvt = newEvents.find(
          (e: any) =>
            e.type === 'BOT_REASONING' && e.actorId === evt.actorId && e.tick === evt.tick,
        )
        const reasoning =
          reasoningEvt?.data?.reasoning || SCRIPTED_REASONING[d.type] || undefined

        entries.push({ text: `${icon} ${who}: ${label}`, reasoning })

        if (d.type === 'MELEE_STRIKE') {
          playAttackSound('melee')
        } else if (d.type === 'RANGED_SHOT') {
          playAttackSound('ranged')
        } else if (d.type === 'GUARD') {
          playAttackSound('guard')
        } else if (d.type === 'DASH') {
          playAttackSound('dash')
        }

        // Update brain stream last action
        setBrainStates(prev => ({
          ...prev,
          [evt.actorId]: { ...(prev[evt.actorId] ?? EMPTY_BRAIN), lastAction: d.type },
        }))
      }

      if (evt.type === 'MOVE_COMPLETED') {
        const d = evt.data
        const posX = Math.round((d?.position?.x ?? 0) / UNIT_SCALE)
        const posY = Math.round((d?.position?.y ?? 0) / UNIT_SCALE)
        const dist = Math.round((d?.dist ?? 0) / UNIT_SCALE)
        entries.push({
          text: `\uD83D\uDCCD ${who} moves \u2192 (${posX}, ${posY}) [dist: ${dist}]`,
        })
      }

      if (evt.type === 'ILLEGAL_ACTION' && evt.data?.reason === 'OUT_OF_RANGE') {
        const d = evt.data
        const actionType = d?.action?.type ?? 'ATTACK'
        const dist = Math.round((d?.dist ?? 0) / UNIT_SCALE)
        const maxRange = Math.round((d?.maxRange ?? 0) / UNIT_SCALE)
        entries.push({
          text: `\u26A0\uFE0F ${who} ${actionType} \u2014 OUT OF RANGE (dist: ${dist}, need \u2264${maxRange})`,
        })
      }

      if (evt.type === 'DAMAGE_APPLIED') {
        const target = nameOf(evt.targetId)
        const amount = evt.data?.amount ?? 0
        const guarded = evt.data?.defenderGuarded ? ' (guarded)' : ''
        entries.push({
          text: `\uD83D\uDCA5 ${who} hits ${target} for ${amount} dmg${guarded}`,
        })
        playHitSound(amount)

        // Track stats
        const actorId = evt.actorId as string
        if (!statsRef.current[actorId]) statsRef.current[actorId] = { hits: 0, dmg: 0 }
        statsRef.current[actorId].hits++
        statsRef.current[actorId].dmg += amount
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
      playKOSound()
      stopAmbient()
    }
  }, [nameOf])

  /* ── Brain stream integration ─────────────────────────────── */

  const runBrainStream = useCallback(
    (snap: any, botId: string, bot: BotConfig, opponentIds: string[]) => {
      if (bot.webhookUrl) return

      setBrainStates(prev => ({
        ...prev,
        [botId]: { ...(prev[botId] ?? EMPTY_BRAIN), thinking: true, tokens: '' },
      }))

      streamAbortRef.current = new AbortController()

      streamBrainTokens(
        snap,
        botId,
        bot,
        opponentIds,
        (delta) => {
          setBrainStates(prev => ({
            ...prev,
            [botId]: { ...(prev[botId] ?? EMPTY_BRAIN), tokens: (prev[botId]?.tokens ?? '') + delta },
          }))
        },
        (action) => {
          setBrainStates(prev => {
            const cur = prev[botId] ?? EMPTY_BRAIN
            const updated: BotBrainState = { ...cur, thinking: false }
            if (action?.type && action.type !== 'NO_OP') {
              updated.lastAction = action.type
              updated.history = [
                ...cur.history,
                `${action.type}${action.dir ? ' ' + action.dir : ''}: ${action.reasoning || '...'}`,
              ].slice(-10)
            }
            return { ...prev, [botId]: updated }
          })
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
      setActorHp({})
      setActorEnergy({})
      setTick(0)
      setFeed([])
      setWinnerId(null)
      setEndReason('')
      setPhase('playing')
      setBrainStates({})
      prevEventsLenRef.current = 0
      statsRef.current = {}

      const controller = new AbortController()
      abortRef.current = controller

      startAmbient()

      const wrappedSnapshot = (snap: MatchSnapshot) => {
        handleSnapshot(snap)

        const s = snap.state
        if (!snap.ended && s.tick > 0) {
          const actorIds = Object.keys(s.actors)
          for (const bot of matchBots) {
            const actor = s.actors[bot.id]
            if (actor && actor.hp > 0) {
              const opponents = actorIds.filter(id => id !== bot.id)
              runBrainStream(
                { tick: s.tick, actors: s.actors, events: (s.events || []).slice(-10) },
                bot.id,
                bot,
                opponents,
              )
            }
          }
        }
      }

      runMatchAsync(seed, matchBots, wrappedSnapshot, '/api/agent/decide', controller.signal).catch(
        (err) => console.error('[CinematicBattle] match error:', err),
      )
    },
    [handleSnapshot, runBrainStream, matchBots],
  )

  /* ── Auto-start with countdown ───────────────────────────── */

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

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
    winnerId ? (botById(winnerId)?.name ?? winnerId) : null
  const winnerColor = winnerId
    ? ACTOR_HUD_COLORS[matchBots.findIndex(b => b.id === winnerId) % ACTOR_HUD_COLORS.length] ?? '#FFD600'
    : '#FFD600'

  const shareUrl = `themoltpit.com/demo?seed=${currentSeed}`
  const [copied, setCopied] = useState(false)
  const copyLink = () => {
    navigator.clipboard.writeText(`https://${shareUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Build HUD actors array ─────────────────────────────── */

  const hudActors: BotHudEntry[] = matchBots.map((bot, i) => ({
    id: bot.id,
    name: bot.name,
    hp: actorHp[bot.id] ?? HP_MAX,
    energy: actorEnergy[bot.id] ?? 0,
    color: ACTOR_HUD_COLORS[i % ACTOR_HUD_COLORS.length],
    isPlayer: bot.id === playerBot.id,
  }))

  /* ── Brain stream data ──────────────────────────────────── */

  const playerBrain = getBrain(playerBot.id)
  const opponentBrain = getBrain(opponentBot.id)
  const isMatchLive = phase !== 'ended'

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#050510' }}>
      {/* Babylon.js Arena — behind everything */}
      <BabylonArena
        snapshot={arenaSnapshot}
        botNames={Object.fromEntries(matchBots.map(b => [b.id, b.name]))}
        playerBotId={playerBot.id}
        canvasStyle={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
        }}
      />

      {/* HUD Overlay */}
      <BattleHUD
        actors={hudActors}
        tick={tick}
        tickRate={TICK_RATE}
        maxTicks={MAX_TICKS}
        feed={feed}
        phase={phase === 'ended' ? 'ended' : 'playing'}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      {/* Brain Stream Panels — desktop only */}
      <div className="brain-panels-desktop">
        {/* Player brain — always visible */}
        <BrainStream
          botName={playerBot.name}
          botColor={ACTOR_HUD_COLORS[0]}
          tokens={playerBrain.tokens}
          isThinking={playerBrain.thinking}
          lastAction={playerBrain.lastAction}
          history={playerBrain.history}
          side="left"
          isByo={!!webhookUrl}
        />
        {/* Opponent brain — hidden during match, visible post-match */}
        {isMatchLive ? (
          <div
            style={{
              position: 'fixed',
              top: 60,
              right: 0,
              bottom: 80,
              width: 280,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              borderLeft: `2px solid ${ACTOR_HUD_COLORS[1]}`,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '10px 14px',
                borderBottom: `1px solid ${ACTOR_HUD_COLORS[1]}33`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#333',
                }}
              />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: ACTOR_HUD_COLORS[1],
                  letterSpacing: '2px',
                }}
              >
                OPPONENT
              </span>
            </div>
            {/* Redacted content */}
            <div
              style={{
                flex: 1,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.15)',
                textAlign: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: '2rem', opacity: 0.3 }}>???</div>
              <div>BRAIN HIDDEN</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.08)' }}>
                Revealed after match
              </div>
            </div>
          </div>
        ) : (
          <BrainStream
            botName={opponentBot.name}
            botColor={ACTOR_HUD_COLORS[1]}
            tokens={opponentBrain.tokens}
            isThinking={opponentBrain.thinking}
            lastAction={opponentBrain.lastAction}
            history={opponentBrain.history}
            side="right"
          />
        )}
      </div>

      {/* Mobile brain ticker — only player during match */}
      <div className="brain-mobile-ticker">
        <div
          style={{
            position: 'fixed',
            bottom: 'env(safe-area-inset-bottom, 0px)',
            left: 0,
            right: 0,
            padding: '6px 12px calc(6px + env(safe-area-inset-bottom, 0px))',
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
          <span style={{ color: ACTOR_HUD_COLORS[0], flexShrink: 0 }}>{playerBot.name.slice(0, 3)}:</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {playerBrain.thinking ? playerBrain.tokens.slice(-60) + '...' : playerBrain.lastAction || 'waiting'}
          </span>
          {isMatchLive ? (
            <>
              <span style={{ color: ACTOR_HUD_COLORS[1], flexShrink: 0 }}>OPP:</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                ???
              </span>
            </>
          ) : (
            <>
              <span style={{ color: ACTOR_HUD_COLORS[1], flexShrink: 0 }}>{opponentBot.name.slice(0, 3)}:</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {opponentBrain.thinking ? opponentBrain.tokens.slice(-60) + '...' : opponentBrain.lastAction || 'waiting'}
              </span>
            </>
          )}
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

          {/* Stats — generic N-player */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 24,
              animation: 'slide-up 0.5s ease-out 0.7s both',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {matchBots.map((bot, i) => {
              const color = ACTOR_HUD_COLORS[i % ACTOR_HUD_COLORS.length]
              const stats = statsRef.current[bot.id] ?? { hits: 0, dmg: 0 }
              const hp = actorHp[bot.id] ?? 0
              return (
                <div
                  key={bot.id}
                  style={{
                    background: `${color}15`,
                    border: `2px solid ${color}4D`,
                    borderRadius: 12,
                    padding: '16px 24px',
                    textAlign: 'center',
                    minWidth: 140,
                  }}
                >
                  <div style={{ fontFamily: "'Bangers', display", fontSize: '1.2rem', color, marginBottom: 8 }}>
                    {bot.name}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
                    HP: {hp}<br />
                    Hits: {stats.hits}<br />
                    Dmg: {stats.dmg}
                  </div>
                </div>
              )
            })}
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
        className="back-home-link"
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
        THE MOLT PIT
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
        @media (max-width: 640px) {
          .back-home-link { display: none; }
        }
      `}</style>
    </div>
  )
}
