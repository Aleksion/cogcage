import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BERSERKER,
  GRID_SIZE,
  makeInitialLiveState,
  manhattan,
  MATCH_COUNT,
  MAX_TURNS,
  pickAction,
  resolveTurn,
  simulateMatch,
  TACTICIAN,
  type Action,
  type GameMode,
} from '~/lib/demo-loop-core'

const STRIPE_FOUNDER_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? ''
const EMAIL_STORAGE_KEY = 'moltpit_email'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function hashString(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function postJson(url: string, payload: Record<string, unknown>, timeoutMs = 5000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': createIdempotencyKey(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    let body: Record<string, unknown> = {}
    const text = await response.text()
    if (text) {
      try {
        body = JSON.parse(text) as Record<string, unknown>
      } catch {
        body = { raw: text.slice(0, 400) }
      }
    }
    return { ok: response.ok, status: response.status, body }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { error: error instanceof Error ? error.message : 'network_error' },
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function postEvent(event: string, payload: Record<string, unknown>) {
  await postJson('/api/events', {
    event,
    page: '/demo',
    ...payload,
  }, 3000)
}

// ── Styles ──
const DEMO_STYLES = `
  .demo-root {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, #0a0a2e 0%, #050510 60%, #000 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Kanit', sans-serif;
    color: #f0f0f5;
    overflow: hidden;
  }

  .demo-arena {
    width: 100%;
    max-width: 800px;
    padding: 1rem 1.5rem;
  }

  .demo-title {
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    text-align: center;
    color: #FFD600;
    text-shadow: 2px 2px 0 #000;
    letter-spacing: 2px;
    margin: 0 0 0.5rem;
  }

  .demo-mode-bar {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .demo-mode-btn {
    padding: 0.3rem 1rem;
    font-family: 'Bangers', cursive;
    font-size: 0.9rem;
    letter-spacing: 1px;
    border-radius: 6px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  .demo-mode-btn--active {
    background: #FFD600;
    color: #000;
    border-color: #FFD600;
  }
  .demo-mode-btn--inactive {
    background: transparent;
    color: rgba(255,214,0,0.6);
    border-color: rgba(255,214,0,0.3);
  }
  .demo-mode-btn--inactive:hover {
    border-color: rgba(255,214,0,0.7);
    color: rgba(255,214,0,0.9);
  }

  .demo-vs {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    gap: 1rem;
  }

  .demo-bot {
    flex: 1;
    text-align: center;
  }

  .demo-bot-name {
    font-family: 'Bangers', cursive;
    font-size: 1.2rem;
    letter-spacing: 1px;
    margin-bottom: 0.35rem;
  }

  .demo-bot-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 1px;
    color: rgba(255,214,0,0.7);
    text-transform: uppercase;
    margin-bottom: 0.2rem;
  }

  .demo-hp-bar {
    width: 100%;
    height: 16px;
    background: rgba(255,255,255,0.08);
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.15);
  }

  .demo-hp-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease, background-color 0.3s;
  }

  .demo-hp-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.6);
    margin-top: 0.15rem;
  }

  .demo-vs-text {
    font-family: 'Bangers', cursive;
    font-size: 1.3rem;
    color: #FFD600;
    text-shadow: 1px 1px 0 #000;
    flex-shrink: 0;
  }

  .demo-body {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 600px) {
    .demo-body { flex-direction: column; }
  }

  /* ── Grid ── */
  .demo-grid-wrap { flex-shrink: 0; }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(${GRID_SIZE}, 1fr);
    grid-template-rows: repeat(${GRID_SIZE}, 1fr);
    gap: 2px;
    width: 238px;
    height: 238px;
    background: rgba(0,229,255,0.06);
    border: 1px solid rgba(0,229,255,0.15);
    border-radius: 6px;
    padding: 2px;
  }

  .demo-cell {
    width: 100%;
    height: 100%;
    background: rgba(255,255,255,0.03);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    font-weight: 700;
    transition: background 0.3s, box-shadow 0.3s;
    position: relative;
  }

  .demo-cell--p1 {
    background: rgba(235,77,75,0.25);
    box-shadow: 0 0 6px rgba(235,77,75,0.5);
  }

  .demo-cell--p2 {
    background: rgba(0,229,255,0.2);
    box-shadow: 0 0 6px rgba(0,229,255,0.5);
  }

  .demo-cell--both {
    background: linear-gradient(135deg, rgba(235,77,75,0.3), rgba(0,229,255,0.3));
    box-shadow: 0 0 8px rgba(255,214,0,0.5);
  }

  .demo-grid-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    color: rgba(0,229,255,0.4);
    text-align: center;
    margin-top: 0.35rem;
    letter-spacing: 0.5px;
  }

  /* ── Log ── */
  .demo-log {
    flex: 1;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(0,229,255,0.2);
    border-radius: 8px;
    padding: 0.6rem;
    max-height: 238px;
    overflow-y: auto;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    line-height: 1.55;
  }

  .demo-log-entry {
    padding: 0.1rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    animation: demo-fade-in 0.3s ease;
  }

  @keyframes demo-fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .demo-action-tag {
    display: inline-block;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: 0 0.15rem;
  }

  .demo-turn-counter {
    text-align: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    color: rgba(0,229,255,0.6);
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
  }

  .demo-match-counter {
    text-align: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    color: rgba(255,255,255,0.3);
    margin-bottom: 0.25rem;
  }

  /* ── Interactive Action Buttons ── */
  .demo-action-row {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .demo-action-btn {
    padding: 0.4rem 0.8rem;
    font-family: 'Bangers', cursive;
    font-size: 0.95rem;
    letter-spacing: 1px;
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.12s;
    color: #000;
    font-weight: 700;
  }

  .demo-action-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }

  .demo-action-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }

  .demo-your-turn {
    text-align: center;
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    letter-spacing: 2px;
    color: #FFD600;
    margin-bottom: 0.3rem;
    animation: demo-pulse 1s infinite alternate;
  }

  .demo-ai-turn {
    text-align: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 1px;
    color: rgba(0,229,255,0.5);
    margin-bottom: 0.3rem;
  }

  @keyframes demo-pulse {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }

  .demo-stunned-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    background: #9b59b6;
    color: #fff;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    margin-left: 0.25rem;
    vertical-align: middle;
  }

  /* ── Winner ── */
  .demo-winner {
    text-align: center;
    animation: demo-fade-in 0.5s ease;
  }

  .demo-winner-title {
    font-family: 'Bangers', cursive;
    font-size: 2.5rem;
    color: #FFD600;
    text-shadow: 3px 3px 0 #000;
    letter-spacing: 3px;
    margin: 0 0 0.3rem;
  }

  .demo-winner-sub {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 1rem;
  }

  .demo-cta {
    display: inline-block;
    padding: 0.75rem 1.8rem;
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    letter-spacing: 2px;
    color: #000;
    background: #FFD600;
    border-radius: 10px;
    text-decoration: none;
    transition: transform 0.1s, background 0.15s;
    box-shadow: 4px 4px 0 #000;
  }
  .demo-cta:hover { background: #f0c800; transform: translateY(-2px); }

  .demo-restart {
    display: block;
    margin: 0.75rem auto 0;
    background: none;
    border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.4);
    padding: 0.4rem 1rem;
    border-radius: 6px;
    font-family: 'Kanit', sans-serif;
    font-size: 0.75rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .demo-restart:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.3); }

  /* ── Legend ── */
  .demo-legend {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .demo-legend-item {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    color: rgba(255,255,255,0.45);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .demo-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    display: inline-block;
  }

  .demo-ap-bar {
    width: 100%;
    height: 8px;
    background: rgba(255,255,255,0.06);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.2rem;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .demo-ap-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
    background: #FFD600;
  }

  .demo-ap-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    color: rgba(255,214,0,0.5);
    margin-top: 0.1rem;
  }

  .demo-speed-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    color: rgba(255,214,0,0.6);
    margin-top: 0.1rem;
  }
`

const ACTION_COLORS: Record<Action | 'WAIT', string> = {
  MOVE: '#3498db',
  ATTACK: '#EB4D4B',
  DEFEND: '#2ecc71',
  CHARGE: '#FFD600',
  STUN: '#9b59b6',
  WAIT: '#555',
}

function hpColor(pct: number) {
  if (pct > 60) return '#2ecc71'
  if (pct > 30) return '#f39c12'
  return '#EB4D4B'
}

type FounderCheckoutUi = {
  checkoutEmail: string
  checkoutBusy: boolean
  checkoutMessage: string | null
  onCheckoutEmailChange: (value: string) => void
  onFounderCheckout: (source: string) => void
}

function FounderCheckoutPanel({
  checkoutEmail,
  checkoutBusy,
  checkoutMessage,
  onCheckoutEmailChange,
  onFounderCheckout,
  source,
}: FounderCheckoutUi & { source: string }) {
  if (!STRIPE_FOUNDER_URL) {
    return <Link to="/sign-in" className="demo-cta">ENTER THE PIT &rarr;</Link>
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'center' }}>
      <input
        type="email"
        value={checkoutEmail}
        onChange={(event) => onCheckoutEmailChange(event.target.value)}
        placeholder="you@domain.com"
        autoComplete="email"
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.35)',
          color: '#f0f0f5',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
        }}
      />
      <button
        className="demo-cta"
        onClick={() => onFounderCheckout(source)}
        disabled={checkoutBusy}
        style={{ border: 0, cursor: checkoutBusy ? 'not-allowed' : 'pointer', opacity: checkoutBusy ? 0.6 : 1 }}
      >
        {checkoutBusy ? 'RESERVING...' : 'GET FOUNDER PACK →'}
      </button>
      {checkoutMessage && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)' }}>
          {checkoutMessage}
        </div>
      )}
    </div>
  )
}

// ── Watch Mode (spectator) ──
function WatchMode({
  onSwitchToPlay,
  checkoutEmail,
  checkoutBusy,
  checkoutMessage,
  onCheckoutEmailChange,
  onFounderCheckout,
}: { onSwitchToPlay: () => void } & FounderCheckoutUi) {
  const [match, setMatch] = useState(() => simulateMatch())
  const [visibleTurn, setVisibleTurn] = useState(0)
  const [phase, setPhase] = useState<'playing' | 'ended'>('playing')
  const [matchNum, setMatchNum] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const startNewMatch = useCallback(() => {
    setMatch(simulateMatch())
    setVisibleTurn(0)
    setPhase('playing')
    setMatchNum((n) => n + 1)
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    if (visibleTurn >= match.turns.length) {
      setPhase('ended')
      timerRef.current = setTimeout(() => {
        if (matchNum >= MATCH_COUNT) setMatchNum(0)
        startNewMatch()
      }, 6000)
      return
    }
    timerRef.current = setTimeout(() => {
      setVisibleTurn((v) => v + 1)
    }, visibleTurn === 0 ? 1000 : 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [visibleTurn, phase, match.turns.length, matchNum, startNewMatch])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [visibleTurn])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const cur = visibleTurn > 0 ? match.turns[visibleTurn - 1] : null
  const p1Hp = cur ? cur.p1Hp : BERSERKER.hp
  const p2Hp = cur ? cur.p2Hp : TACTICIAN.hp
  const p1Pos = cur ? cur.p1Pos : BERSERKER.start
  const p2Pos = cur ? cur.p2Pos : TACTICIAN.start
  const p1Ap = cur ? cur.p1Ap : 0
  const p2Ap = cur ? cur.p2Ap : 0
  const p1Pct = (p1Hp / BERSERKER.hp) * 100
  const p2Pct = (p2Hp / TACTICIAN.hp) * 100
  const dist = manhattan(p1Pos, p2Pos)
  const visibleLogs = match.turns.slice(0, visibleTurn)

  const gridCells: React.ReactElement[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isP1 = p1Pos.x === x && p1Pos.y === y
      const isP2 = p2Pos.x === x && p2Pos.y === y
      const isBoth = isP1 && isP2
      let cellClass = 'demo-cell'
      if (isBoth) cellClass += ' demo-cell--both'
      else if (isP1) cellClass += ' demo-cell--p1'
      else if (isP2) cellClass += ' demo-cell--p2'
      gridCells.push(
        <div key={`${x}-${y}`} className={cellClass}>
          {isBoth ? (
            <span style={{ fontSize: '0.7rem' }}>
              <span style={{ color: BERSERKER.color }}>B</span>
              <span style={{ color: TACTICIAN.color }}>T</span>
            </span>
          ) : isP1 ? (
            <span style={{ color: BERSERKER.color }}>B</span>
          ) : isP2 ? (
            <span style={{ color: TACTICIAN.color }}>T</span>
          ) : null}
        </div>
      )
    }
  }

  return (
    <div className="demo-arena">
      <h2 className="demo-title">QUICK DEMO</h2>

      <div className="demo-mode-bar">
        <button className="demo-mode-btn demo-mode-btn--active">WATCH</button>
        <button className="demo-mode-btn demo-mode-btn--inactive" onClick={onSwitchToPlay}>PLAY</button>
      </div>

      <div className="demo-vs">
        <div className="demo-bot">
          <div className="demo-bot-name" style={{ color: BERSERKER.color }}>{BERSERKER.name}</div>
          <div className="demo-hp-bar">
            <div className="demo-hp-fill" style={{ width: `${p1Pct}%`, background: hpColor(p1Pct) }} />
          </div>
          <div className="demo-hp-text">{p1Hp} / {BERSERKER.hp} HP</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p1Ap, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p1Ap.toFixed(1)}</div>
          <div className="demo-speed-badge">SPD {BERSERKER.speed}x</div>
        </div>
        <div className="demo-vs-text">VS</div>
        <div className="demo-bot">
          <div className="demo-bot-name" style={{ color: TACTICIAN.color }}>{TACTICIAN.name}</div>
          <div className="demo-hp-bar">
            <div className="demo-hp-fill" style={{ width: `${p2Pct}%`, background: hpColor(p2Pct) }} />
          </div>
          <div className="demo-hp-text">{p2Hp} / {TACTICIAN.hp} HP</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p2Ap, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p2Ap.toFixed(1)}</div>
          <div className="demo-speed-badge">SPD {TACTICIAN.speed}x</div>
        </div>
      </div>

      <div className="demo-match-counter">MATCH {matchNum > MATCH_COUNT ? 1 : matchNum} / {MATCH_COUNT}</div>
      <div className="demo-turn-counter">
        {phase === 'playing'
          ? visibleTurn === 0 ? 'MATCH STARTING...' : `TURN ${visibleTurn} / ${match.turns.length}  ·  DIST ${dist}`
          : 'MATCH COMPLETE'}
      </div>

      <div className="demo-legend">
        {(['MOVE', 'ATTACK', 'DEFEND', 'CHARGE', 'STUN', 'WAIT'] as (Action | 'WAIT')[]).map((a) => (
          <div key={a} className="demo-legend-item">
            <span className="demo-legend-dot" style={{ background: ACTION_COLORS[a] }} />
            {a}
          </div>
        ))}
        <div className="demo-legend-item" style={{ color: 'rgba(255,255,255,0.3)' }}>ATK/STUN range ≤ 2</div>
      </div>

      <div className="demo-body">
        <div className="demo-grid-wrap">
          <div className="demo-grid">{gridCells}</div>
          <div className="demo-grid-label">7×7 ARENA GRID</div>
        </div>
        <div className="demo-log" ref={logRef}>
          {visibleLogs.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '1rem 0' }}>
              Waiting for first turn...
            </div>
          ) : (
            visibleLogs.map((t) => (
              <div key={t.turn} className="demo-log-entry">
                <span style={{ color: '#666' }}>T{t.turn}</span>{' '}
                <span style={{ color: BERSERKER.color }}>{BERSERKER.initial}</span>{' '}
                <span className="demo-action-tag" style={{ background: ACTION_COLORS[t.p1Action], color: '#000' }}>
                  {t.p1Action}
                </span>
                {t.p1Dmg > 0 && <span style={{ color: '#EB4D4B' }}> -{t.p1Dmg}</span>}
                {' '}
                <span style={{ color: TACTICIAN.color }}>{TACTICIAN.initial}</span>{' '}
                <span className="demo-action-tag" style={{ background: ACTION_COLORS[t.p2Action], color: '#000' }}>
                  {t.p2Action}
                </span>
                {t.p2Dmg > 0 && <span style={{ color: '#EB4D4B' }}> -{t.p2Dmg}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {phase === 'ended' && (
        <div className="demo-winner">
          <div className="demo-winner-title">
            {match.winner === 'DRAW' ? 'DRAW!' : `${match.winner} WINS!`}
          </div>
          <div className="demo-winner-sub">
            {match.winner === 'DRAW'
              ? 'Both crawlers still standing after 15 rounds.'
              : `${match.winner} crushed the opposition.`}
          </div>
          <FounderCheckoutPanel
            checkoutEmail={checkoutEmail}
            checkoutBusy={checkoutBusy}
            checkoutMessage={checkoutMessage}
            onCheckoutEmailChange={onCheckoutEmailChange}
            onFounderCheckout={onFounderCheckout}
            source={`demo-watch-founder-cta-${match.winner === 'DRAW' ? 'draw' : match.winner.toLowerCase()}`}
          />
          <button className="demo-restart" onClick={startNewMatch}>Watch another match</button>
        </div>
      )}
    </div>
  )
}

// ── Play Mode (interactive — player controls BERSERKER) ──
function PlayMode({
  onSwitchToWatch,
  checkoutEmail,
  checkoutBusy,
  checkoutMessage,
  onCheckoutEmailChange,
  onFounderCheckout,
}: { onSwitchToWatch: () => void } & FounderCheckoutUi) {
  const [live, setLive] = useState(() => makeInitialLiveState())
  const [aiThinking, setAiThinking] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [live.log.length])

  const handlePlayerAction = useCallback((action: Action) => {
    if (!live.waitingForPlayer || live.winner || aiThinking) return

    setAiThinking(true)
    // Short delay for AI "thinking" feel
    setTimeout(() => {
      setLive((prev) => {
        if (prev.winner) return prev

        const p1 = { ...prev.p1 }
        const p2 = { ...prev.p2 }

        // Accumulate AP
        p1.ap += BERSERKER.speed
        p2.ap += TACTICIAN.speed
        const p1CanAct = p1.ap >= 1.0
        const p2CanAct = p2.ap >= 1.0

        const p1Act: Action | 'WAIT' = p1CanAct ? action : 'WAIT'
        const dist = manhattan(p1.pos, p2.pos)
        const p2Act: Action | 'WAIT' = p2CanAct ? pickAction(TACTICIAN.bias, dist, p2.stunned) : 'WAIT'

        if (p1CanAct) p1.ap -= 1.0
        if (p2CanAct) p2.ap -= 1.0

        const result = resolveTurn(p1Act, p2Act, p1, p2, prev.turn)

        const newLog = [...prev.log, result]
        const isDone = p1.hp <= 0 || p2.hp <= 0 || prev.turn >= MAX_TURNS
        const winner = isDone
          ? (p1.hp > p2.hp ? 'YOU WIN!' : p2.hp > p1.hp ? 'TACTICIAN WINS' : 'DRAW')
          : null

        return {
          p1,
          p2,
          turn: prev.turn + 1,
          log: newLog,
          winner,
          waitingForPlayer: true,
          lastResult: result,
        }
      })
      setAiThinking(false)
    }, 350)
  }, [live.waitingForPlayer, live.winner, aiThinking])

  const resetGame = useCallback(() => {
    setLive(makeInitialLiveState())
    setAiThinking(false)
  }, [])

  const { p1, p2, turn, log, winner, lastResult } = live
  const p1Pct = (p1.hp / BERSERKER.hp) * 100
  const p2Pct = (p2.hp / TACTICIAN.hp) * 100
  const dist = manhattan(p1.pos, p2.pos)
  const canAttack = dist <= 2
  const canStun = dist <= 2

  const gridCells: React.ReactElement[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isP1 = p1.pos.x === x && p1.pos.y === y
      const isP2 = p2.pos.x === x && p2.pos.y === y
      const isBoth = isP1 && isP2
      let cellClass = 'demo-cell'
      if (isBoth) cellClass += ' demo-cell--both'
      else if (isP1) cellClass += ' demo-cell--p1'
      else if (isP2) cellClass += ' demo-cell--p2'
      gridCells.push(
        <div key={`${x}-${y}`} className={cellClass}>
          {isBoth ? (
            <span style={{ fontSize: '0.7rem' }}>
              <span style={{ color: BERSERKER.color }}>YOU</span>
              <span style={{ color: TACTICIAN.color }}>AI</span>
            </span>
          ) : isP1 ? (
            <span style={{ color: BERSERKER.color, fontSize: '0.7rem' }}>YOU</span>
          ) : isP2 ? (
            <span style={{ color: TACTICIAN.color }}>T</span>
          ) : null}
        </div>
      )
    }
  }

  const ACTIONS: { action: Action; label: string; disabled?: boolean }[] = [
    { action: 'MOVE', label: 'MOVE →' },
    { action: 'ATTACK', label: `ATTACK${!canAttack ? ' (far)' : ''}`, disabled: !canAttack },
    { action: 'DEFEND', label: 'DEFEND' },
    { action: 'CHARGE', label: 'CHARGE' },
    { action: 'STUN', label: `STUN${!canStun ? ' (far)' : ''}`, disabled: !canStun },
  ]

  return (
    <div className="demo-arena">
      <h2 className="demo-title">QUICK DEMO</h2>

      <div className="demo-mode-bar">
        <button className="demo-mode-btn demo-mode-btn--inactive" onClick={onSwitchToWatch}>WATCH</button>
        <button className="demo-mode-btn demo-mode-btn--active">PLAY</button>
      </div>

      <div className="demo-vs">
        <div className="demo-bot">
          <div className="demo-bot-label">YOU</div>
          <div className="demo-bot-name" style={{ color: BERSERKER.color }}>
            {BERSERKER.name}
            {p1.stunned && <span className="demo-stunned-badge">STUNNED</span>}
            {p1.charged && <span className="demo-stunned-badge" style={{ background: '#FFD600', color: '#000' }}>CHARGED</span>}
          </div>
          <div className="demo-hp-bar">
            <div className="demo-hp-fill" style={{ width: `${p1Pct}%`, background: hpColor(p1Pct) }} />
          </div>
          <div className="demo-hp-text">{p1.hp} / {BERSERKER.hp} HP</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p1.ap, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p1.ap.toFixed(1)}</div>
        </div>
        <div className="demo-vs-text">VS</div>
        <div className="demo-bot">
          <div className="demo-bot-label">AI</div>
          <div className="demo-bot-name" style={{ color: TACTICIAN.color }}>
            {TACTICIAN.name}
            {p2.stunned && <span className="demo-stunned-badge">STUNNED</span>}
            {p2.charged && <span className="demo-stunned-badge" style={{ background: '#FFD600', color: '#000' }}>CHARGED</span>}
          </div>
          <div className="demo-hp-bar">
            <div className="demo-hp-fill" style={{ width: `${p2Pct}%`, background: hpColor(p2Pct) }} />
          </div>
          <div className="demo-hp-text">{p2.hp} / {TACTICIAN.hp} HP</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p2.ap, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p2.ap.toFixed(1)}</div>
        </div>
      </div>

      <div className="demo-turn-counter">
        {winner
          ? winner
          : `TURN ${turn} / ${MAX_TURNS}  ·  DIST ${dist}  ·  ${!canAttack ? 'CLOSE IN TO ATTACK' : 'IN RANGE'}`}
      </div>

      {!winner && (
        <>
          {aiThinking ? (
            <div className="demo-ai-turn">AI IS THINKING...</div>
          ) : (
            <div className="demo-your-turn">YOUR TURN — PICK AN ACTION</div>
          )}
          <div className="demo-action-row">
            {ACTIONS.map(({ action, label, disabled }) => (
              <button
                key={action}
                className="demo-action-btn"
                style={{ background: ACTION_COLORS[action] }}
                onClick={() => handlePlayerAction(action)}
                disabled={disabled || aiThinking || !live.waitingForPlayer}
                title={
                  action === 'ATTACK' ? 'Deals 15-25 dmg (range ≤ 2). +40% if CHARGED.' :
                  action === 'MOVE' ? 'Move one step toward enemy.' :
                  action === 'DEFEND' ? 'Reduces incoming damage by 50% this turn.' :
                  action === 'CHARGE' ? 'Next ATTACK deals +40% damage.' :
                  'Stuns enemy for 1 turn (range ≤ 2, 50% miss chance when stunned).'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {lastResult && !winner && (
        <div style={{ textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
          Last: YOU {lastResult.p1Action}
          {lastResult.p1Dmg > 0 && <span style={{ color: '#EB4D4B' }}> (-{lastResult.p1Dmg})</span>}
          {' · '}AI {lastResult.p2Action}
          {lastResult.p2Dmg > 0 && <span style={{ color: '#EB4D4B' }}> (-{lastResult.p2Dmg})</span>}
        </div>
      )}

      <div className="demo-body">
        <div className="demo-grid-wrap">
          <div className="demo-grid">{gridCells}</div>
          <div className="demo-grid-label">7×7 ARENA GRID · YOU = RED</div>
        </div>
        <div className="demo-log" ref={logRef}>
          {log.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '1rem 0' }}>
              Pick an action to start...
            </div>
          ) : (
            log.map((t) => (
              <div key={t.turn} className="demo-log-entry">
                <span style={{ color: '#666' }}>T{t.turn}</span>{' '}
                <span style={{ color: BERSERKER.color }}>YOU</span>{' '}
                <span className="demo-action-tag" style={{ background: ACTION_COLORS[t.p1Action], color: '#000' }}>
                  {t.p1Action}
                </span>
                {t.p1Dmg > 0 && <span style={{ color: '#EB4D4B' }}> -{t.p1Dmg}</span>}
                {' '}
                <span style={{ color: TACTICIAN.color }}>AI</span>{' '}
                <span className="demo-action-tag" style={{ background: ACTION_COLORS[t.p2Action], color: '#000' }}>
                  {t.p2Action}
                </span>
                {t.p2Dmg > 0 && <span style={{ color: '#EB4D4B' }}> -{t.p2Dmg}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {winner && (
        <div className="demo-winner">
          <div className="demo-winner-title">{winner}</div>
          <div className="demo-winner-sub">
            {winner === 'YOU WIN!' ? 'Your Crustie dominated The Pit.' : winner === 'DRAW' ? 'Both still standing after 15 rounds.' : 'The AI held its line.'}
          </div>
          <FounderCheckoutPanel
            checkoutEmail={checkoutEmail}
            checkoutBusy={checkoutBusy}
            checkoutMessage={checkoutMessage}
            onCheckoutEmailChange={onCheckoutEmailChange}
            onFounderCheckout={onFounderCheckout}
            source={`demo-play-founder-cta-${winner === 'YOU WIN!' ? 'winner' : winner === 'DRAW' ? 'draw' : 'loser'}`}
          />
          <button className="demo-restart" onClick={resetGame}>Play again</button>
        </div>
      )}
    </div>
  )
}

// ── Root component ──
export default function DemoLoop() {
  const [mode, setMode] = useState<GameMode>('watch')
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY) || ''
    if (storedEmail) setCheckoutEmail(storedEmail)
  }, [])

  const onCheckoutEmailChange = useCallback((value: string) => {
    setCheckoutEmail(value)
    if (checkoutMessage) setCheckoutMessage(null)
  }, [checkoutMessage])

  const onFounderCheckout = useCallback(async (source: string) => {
    const normalizedEmail = checkoutEmail.trim().toLowerCase()
    if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      setCheckoutMessage('Enter a valid email to reserve founder pricing.')
      await postEvent('founder_checkout_validation_failed', {
        source,
        email: normalizedEmail || undefined,
        tier: 'founder',
        meta: { reason: 'invalid_email' },
      })
      return
    }

    setCheckoutBusy(true)
    setCheckoutMessage(null)

    const intentSource = source.replace('-cta-', '-checkout-')
    const intentId = `intent:${new Date().toISOString().slice(0, 10)}:${hashString(`${normalizedEmail}|${intentSource}`)}`

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail)
      }

      await postEvent('founder_checkout_clicked', {
        source,
        email: normalizedEmail,
        tier: 'founder',
      })

      const intentResponse = await postJson('/api/founder-intent', {
        email: normalizedEmail,
        source: intentSource,
        intentId,
      }, 6000)

      if (!intentResponse.ok || intentResponse.body?.ok !== true) {
        const reason = String(intentResponse.body?.error || `status_${intentResponse.status}`)
        await postEvent('founder_intent_submit_failed', {
          source: intentSource,
          email: normalizedEmail,
          tier: 'founder',
          meta: { reason, intentId },
        })
      } else {
        await postEvent('founder_intent_submitted', {
          source: intentSource,
          email: normalizedEmail,
          tier: 'founder',
          meta: { intentId },
        })
      }

      if (!STRIPE_FOUNDER_URL) {
        setCheckoutMessage('Founder checkout is not live yet. We saved your intent.')
        await postEvent('founder_checkout_unavailable', {
          source,
          email: normalizedEmail,
          tier: 'founder',
        })
        return
      }

      const target = new URL(STRIPE_FOUNDER_URL, window.location.origin)
      target.searchParams.set('prefilled_email', normalizedEmail)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('moltpit_last_founder_checkout_source', source)
        window.localStorage.setItem('moltpit_last_founder_intent_source', intentSource)
      }

      await postEvent('founder_checkout_redirected', {
        source,
        email: normalizedEmail,
        tier: 'founder',
      })
      window.location.href = target.toString()
    } catch {
      setCheckoutMessage('Could not start checkout. Try again.')
      await postEvent('founder_checkout_redirect_failed', {
        source,
        email: normalizedEmail,
        tier: 'founder',
      })
    } finally {
      setCheckoutBusy(false)
    }
  }, [checkoutEmail])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DEMO_STYLES }} />
      <div className="demo-root">
        {mode === 'watch'
          ? (
            <WatchMode
              onSwitchToPlay={() => setMode('play')}
              checkoutEmail={checkoutEmail}
              checkoutBusy={checkoutBusy}
              checkoutMessage={checkoutMessage}
              onCheckoutEmailChange={onCheckoutEmailChange}
              onFounderCheckout={onFounderCheckout}
            />
          )
          : (
            <PlayMode
              onSwitchToWatch={() => setMode('watch')}
              checkoutEmail={checkoutEmail}
              checkoutBusy={checkoutBusy}
              checkoutMessage={checkoutMessage}
              onCheckoutEmailChange={onCheckoutEmailChange}
              onFounderCheckout={onFounderCheckout}
            />
          )
        }
      </div>
    </>
  )
}
