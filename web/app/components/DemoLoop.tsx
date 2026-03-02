import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@tanstack/react-router'

const STRIPE_FOUNDER_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? ''
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Action Economy ──
type Action = 'MOVE' | 'ATTACK' | 'DEFEND' | 'CHARGE' | 'STUN'
type GameMode = 'watch' | 'play'
type MoveDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

interface Position {
  x: number
  y: number
}

interface BotConfig {
  name: string
  color: string
  initial: string
  hp: number
  speed: number
  bias: Record<Action, number>
  start: Position
}

interface BotState {
  hp: number
  pos: Position
  charged: boolean
  stunned: boolean
  defending: boolean
  ap: number
  mp: number
}

interface TurnResult {
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
  p1Mp: number
  p2Mp: number
  log: string
}

const GRID_SIZE = 7
const MAX_TURNS = 15
const MATCH_COUNT = 3

const ACTION_AP_COST: Record<Action, number> = {
  MOVE: 0.5,
  ATTACK: 1,
  DEFEND: 1,
  CHARGE: 1,
  STUN: 1,
}

const MOVE_MP_COST = 1
const AP_BAR_MAX = 2
const MP_BAR_MAX = 2

const BERSERKER: BotConfig = {
  name: 'BERSERKER',
  color: '#EB4D4B',
  initial: 'B',
  hp: 100,
  speed: 1.2,
  bias: { MOVE: 20, ATTACK: 40, DEFEND: 5, CHARGE: 25, STUN: 10 },
  start: { x: 0, y: 0 },
}

const TACTICIAN: BotConfig = {
  name: 'TACTICIAN',
  color: '#00E5FF',
  initial: 'T',
  hp: 100,
  speed: 0.9,
  bias: { MOVE: 15, ATTACK: 20, DEFEND: 25, CHARGE: 15, STUN: 25 },
  start: { x: 6, y: 6 },
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function postJsonBestEffort(url: string, payload: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // best-effort telemetry only
  }
}

async function beginFounderCheckout(source: string) {
  if (!STRIPE_FOUNDER_URL || typeof window === 'undefined') return

  const email = window.localStorage.getItem('moltpit_email')?.trim().toLowerCase() || ''
  const hasValidEmail = EMAIL_RE.test(email)
  const checkoutSource = `demo-loop-${source}`
  const intentSource = `${checkoutSource}-intent`
  window.localStorage.setItem('moltpit_last_founder_checkout_source', checkoutSource)
  window.localStorage.setItem('moltpit_last_founder_intent_source', intentSource)

  void postJsonBestEffort('/api/events', {
    event: 'founder_checkout_clicked',
    source: checkoutSource,
    email: hasValidEmail ? email : undefined,
    tier: 'founder',
    page: '/play',
    meta: { source: checkoutSource, hasValidEmail },
  })

  if (hasValidEmail) {
    void fetch('/api/founder-intent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': createIdempotencyKey(),
      },
      body: JSON.stringify({
        email,
        source: intentSource,
        intentId: `intent:${new Date().toISOString().slice(0, 10)}:${email}:${source}`,
      }),
      keepalive: true,
    }).catch(() => undefined)
  }

  const target = new URL(STRIPE_FOUNDER_URL, window.location.origin)
  if (hasValidEmail) {
    target.searchParams.set('prefilled_email', email)
  }
  window.location.href = target.toString()
}

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function moveToward(from: Position, to: Position): Position {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: from.x + Math.sign(dx), y: from.y }
  }
  return { x: from.x, y: from.y + Math.sign(dy) }
}

function clampGrid(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(GRID_SIZE - 1, pos.x)),
    y: Math.max(0, Math.min(GRID_SIZE - 1, pos.y)),
  }
}

function moveByDirection(from: Position, dir: MoveDirection): Position {
  if (dir === 'UP') return clampGrid({ x: from.x, y: from.y - 1 })
  if (dir === 'DOWN') return clampGrid({ x: from.x, y: from.y + 1 })
  if (dir === 'LEFT') return clampGrid({ x: from.x - 1, y: from.y })
  return clampGrid({ x: from.x + 1, y: from.y })
}

function canPayAction(actor: BotState, action: Action) {
  if (action === 'MOVE') {
    // Stunned actors cannot move; keep MOVE from burning AP/MP on invalid turns.
    return !actor.stunned && actor.ap >= ACTION_AP_COST.MOVE && actor.mp >= MOVE_MP_COST
  }
  return actor.ap >= ACTION_AP_COST[action]
}

function spendAction(actor: BotState, action: Action | 'WAIT') {
  if (action === 'WAIT') return
  actor.ap = Math.max(0, actor.ap - ACTION_AP_COST[action])
  if (action === 'MOVE') {
    actor.mp = Math.max(0, actor.mp - MOVE_MP_COST)
  }
}

function regenForNextTurn(actor: BotState, config: BotConfig) {
  actor.ap = Math.min(AP_BAR_MAX, actor.ap + config.speed)
  actor.mp = Math.min(MP_BAR_MAX, actor.mp + 1)
}

function pickAction(bias: Record<Action, number>, dist: number, stunned: boolean, ap: number, mp: number): Action {
  const actions: Action[] = ['MOVE', 'ATTACK', 'DEFEND', 'CHARGE', 'STUN']
  const weights = actions.map((a) => {
    if (a === 'MOVE' && (stunned || mp < MOVE_MP_COST || ap < ACTION_AP_COST.MOVE)) return 0
    if (a !== 'MOVE' && ap < ACTION_AP_COST[a]) return 0
    if (a === 'MOVE' && stunned) return 0
    if (a === 'MOVE' && dist <= 2) return Math.floor(bias[a] * 0.3)
    if (dist > 2 && (a === 'ATTACK' || a === 'STUN')) return Math.floor(bias[a] * 0.2)
    if (dist > 2 && a === 'MOVE') return bias[a] * 3
    return bias[a]
  })
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < actions.length; i++) {
    r -= weights[i]
    if (r <= 0) return actions[i]
  }
  return 'MOVE'
}

function rollDamage() {
  return 15 + Math.floor(Math.random() * 11)
}

// ── Core turn resolution (used by both watch sim and interactive mode) ──
function resolveTurn(
  p1Act: Action | 'WAIT',
  p2Act: Action | 'WAIT',
  p1: BotState,
  p2: BotState,
  turnNum: number,
  p1MoveDir?: MoveDirection,
  p2MoveDir?: MoveDirection,
): TurnResult {
  let p1Dmg = 0
  let p2Dmg = 0
  p1.defending = false
  p2.defending = false

  if (p1Act !== 'WAIT') {
    const dist = manhattan(p1.pos, p2.pos)
    switch (p1Act) {
      case 'MOVE':
        if (!p1.stunned) p1.pos = p1MoveDir ? moveByDirection(p1.pos, p1MoveDir) : clampGrid(moveToward(p1.pos, p2.pos))
        break
      case 'ATTACK':
        if (dist <= 2) {
          let dmg = rollDamage()
          if (p1.charged) { dmg = Math.floor(dmg * 1.4); p1.charged = false }
          if (p1.stunned && Math.random() < 0.5) dmg = 0
          if (p2Act === 'DEFEND') dmg = Math.floor(dmg * 0.5)
          p1Dmg = dmg
        }
        break
      case 'CHARGE': p1.charged = true; break
      case 'STUN': if (dist <= 2) p2.stunned = true; break
      case 'DEFEND': p1.defending = true; break
    }
  }

  if (p2Act !== 'WAIT') {
    const dist2 = manhattan(p1.pos, p2.pos)
    switch (p2Act) {
      case 'MOVE':
        if (!p2.stunned) p2.pos = p2MoveDir ? moveByDirection(p2.pos, p2MoveDir) : clampGrid(moveToward(p2.pos, p1.pos))
        break
      case 'ATTACK':
        if (dist2 <= 2) {
          let dmg = rollDamage()
          if (p2.charged) { dmg = Math.floor(dmg * 1.4); p2.charged = false }
          if (p2.stunned && Math.random() < 0.5) dmg = 0
          if (p1Act === 'DEFEND') dmg = Math.floor(dmg * 0.5)
          p2Dmg = dmg
        }
        break
      case 'CHARGE': p2.charged = true; break
      case 'STUN': { const dist2s = manhattan(p1.pos, p2.pos); if (dist2s <= 2) p1.stunned = true; break }
      case 'DEFEND': p2.defending = true; break
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
    p1Mp: p1.mp,
    p2Mp: p2.mp,
    log: logParts.join(' '),
  }
}

function simulateMatch(): { turns: TurnResult[]; winner: string } {
  const p1: BotState = { hp: BERSERKER.hp, pos: { ...BERSERKER.start }, charged: false, stunned: false, defending: false, ap: BERSERKER.speed, mp: 1 }
  const p2: BotState = { hp: TACTICIAN.hp, pos: { ...TACTICIAN.start }, charged: false, stunned: false, defending: false, ap: TACTICIAN.speed, mp: 1 }
  const turns: TurnResult[] = []

  for (let t = 1; t <= MAX_TURNS; t++) {
    const dist = manhattan(p1.pos, p2.pos)
    const p1Choice = pickAction(BERSERKER.bias, dist, p1.stunned, p1.ap, p1.mp)
    const p2Choice = pickAction(TACTICIAN.bias, dist, p2.stunned, p2.ap, p2.mp)
    const p1Act: Action | 'WAIT' = canPayAction(p1, p1Choice) ? p1Choice : 'WAIT'
    const p2Act: Action | 'WAIT' = canPayAction(p2, p2Choice) ? p2Choice : 'WAIT'
    spendAction(p1, p1Act)
    spendAction(p2, p2Act)

    const result = resolveTurn(p1Act, p2Act, p1, p2, t)
    turns.push(result)
    if (p1.hp <= 0 || p2.hp <= 0) break
    regenForNextTurn(p1, BERSERKER)
    regenForNextTurn(p2, TACTICIAN)
  }

  const winner = p1.hp > p2.hp ? BERSERKER.name : p2.hp > p1.hp ? TACTICIAN.name : 'DRAW'
  return { turns, winner }
}

function makeInitialLiveState() {
  return {
    p1: { hp: BERSERKER.hp, pos: { ...BERSERKER.start }, charged: false, stunned: false, defending: false, ap: BERSERKER.speed, mp: 1 } as BotState,
    p2: { hp: TACTICIAN.hp, pos: { ...TACTICIAN.start }, charged: false, stunned: false, defending: false, ap: TACTICIAN.speed, mp: 1 } as BotState,
    turn: 1,
    log: [] as TurnResult[],
    winner: null as string | null,
    waitingForPlayer: true,
    lastResult: null as TurnResult | null,
  }
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
    border: none;
    cursor: pointer;
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

// ── Watch Mode (spectator) ──
function WatchMode({ onSwitchToPlay }: { onSwitchToPlay: () => void }) {
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
  const p1Ap = cur ? cur.p1Ap : BERSERKER.speed
  const p2Ap = cur ? cur.p2Ap : TACTICIAN.speed
  const p1Mp = cur ? cur.p1Mp : 1
  const p2Mp = cur ? cur.p2Mp : 1
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
            <div className="demo-ap-fill" style={{ width: `${Math.min(p1Ap / AP_BAR_MAX, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p1Ap.toFixed(1)}</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p1Mp / MP_BAR_MAX, 1) * 100}%`, background: '#00E5FF' }} />
          </div>
          <div className="demo-ap-text">MP {p1Mp.toFixed(0)}</div>
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
            <div className="demo-ap-fill" style={{ width: `${Math.min(p2Ap / AP_BAR_MAX, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p2Ap.toFixed(1)}</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p2Mp / MP_BAR_MAX, 1) * 100}%`, background: '#00E5FF' }} />
          </div>
          <div className="demo-ap-text">MP {p2Mp.toFixed(0)}</div>
          <div className="demo-speed-badge">SPD {TACTICIAN.speed}x</div>
        </div>
      </div>

      <div className="demo-match-counter">MATCH {matchNum > MATCH_COUNT ? 1 : matchNum} / {MATCH_COUNT}</div>
      <div className="demo-turn-counter">
        {phase === 'playing'
          ? visibleTurn === 0 ? 'MATCH STARTING...' : `TURN ${visibleTurn} / ${match.turns.length}  ·  DIST ${dist}  ·  AP+MP ECONOMY`
          : 'MATCH COMPLETE'}
      </div>

      <div className="demo-legend">
        {(['MOVE', 'ATTACK', 'DEFEND', 'CHARGE', 'STUN', 'WAIT'] as (Action | 'WAIT')[]).map((a) => (
          <div key={a} className="demo-legend-item">
            <span className="demo-legend-dot" style={{ background: ACTION_COLORS[a] }} />
            {a}
          </div>
        ))}
        <div className="demo-legend-item" style={{ color: 'rgba(255,255,255,0.3)' }}>MOVE = 1 MP + 0.5 AP</div>
        <div className="demo-legend-item" style={{ color: 'rgba(255,255,255,0.3)' }}>ATK/STUN range ≤ 2</div>
      </div>

      <div className="demo-body">
        <div className="demo-grid-wrap">
          <div className="demo-grid">{gridCells}</div>
          <div className="demo-grid-label">7×7 ARENA GRID · MP/AP TRACKED PER TURN</div>
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
          {STRIPE_FOUNDER_URL
            ? <button className="demo-cta" type="button" onClick={() => { void beginFounderCheckout('watch-winner') }}>GET FOUNDER PACK &rarr;</button>
            : <Link to="/sign-in" className="demo-cta">ENTER THE PIT &rarr;</Link>}
          <button className="demo-restart" onClick={startNewMatch}>Watch another match</button>
        </div>
      )}
    </div>
  )
}

// ── Play Mode (interactive — player controls BERSERKER) ──
function PlayMode({ onSwitchToWatch }: { onSwitchToWatch: () => void }) {
  const [live, setLive] = useState(() => makeInitialLiveState())
  const [aiThinking, setAiThinking] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [live.log.length])

  const handlePlayerAction = useCallback((action: Action, playerMoveDir?: MoveDirection) => {
    if (!live.waitingForPlayer || live.winner || aiThinking) return

    setAiThinking(true)
    setTimeout(() => {
      setLive((prev) => {
        if (prev.winner) return prev

        const p1 = { ...prev.p1 }
        const p2 = { ...prev.p2 }
        const distBefore = manhattan(p1.pos, p2.pos)
        const needsRange = action === 'ATTACK' || action === 'STUN'
        const playerAllowed = (!needsRange || distBefore <= 2) && canPayAction(p1, action)
        const p1Act: Action | 'WAIT' = playerAllowed ? action : 'WAIT'
        const p1Dir = p1Act === 'MOVE' ? (playerMoveDir ?? 'RIGHT') : undefined

        const p2Choice = pickAction(TACTICIAN.bias, distBefore, p2.stunned, p2.ap, p2.mp)
        const p2Act: Action | 'WAIT' = canPayAction(p2, p2Choice) ? p2Choice : 'WAIT'
        spendAction(p1, p1Act)
        spendAction(p2, p2Act)
        const result = resolveTurn(p1Act, p2Act, p1, p2, prev.turn, p1Dir)

        const newLog = [...prev.log, result]
        const isDone = p1.hp <= 0 || p2.hp <= 0 || prev.turn >= MAX_TURNS
        const winner = isDone
          ? (p1.hp > p2.hp ? 'YOU WIN!' : p2.hp > p1.hp ? 'TACTICIAN WINS' : 'DRAW')
          : null
        if (!isDone) {
          regenForNextTurn(p1, BERSERKER)
          regenForNextTurn(p2, TACTICIAN)
        }

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
  const canMove = canPayAction(p1, 'MOVE')
  const canAttack = dist <= 2
  const canStun = dist <= 2
  const canUseAttack = canAttack && canPayAction(p1, 'ATTACK')
  const canUseDefend = canPayAction(p1, 'DEFEND')
  const canUseCharge = canPayAction(p1, 'CHARGE')
  const canUseStun = canStun && canPayAction(p1, 'STUN')
  const turnStage = winner ? 'MATCH_COMPLETE' : aiThinking ? 'AI_DECISION' : 'PLAYER_ACTION'

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

  const MOVE_ACTIONS: { dir: MoveDirection; label: string }[] = [
    { dir: 'UP', label: 'MOVE ↑' },
    { dir: 'LEFT', label: 'MOVE ←' },
    { dir: 'RIGHT', label: 'MOVE →' },
    { dir: 'DOWN', label: 'MOVE ↓' },
  ]

  const ACTIONS: { action: Action; label: string; disabled: boolean; title: string }[] = [
    { action: 'ATTACK', label: `ATTACK${!canAttack ? ' (far)' : ''}`, disabled: !canUseAttack, title: 'Deals 15-25 dmg (range ≤ 2). +40% if CHARGED.' },
    { action: 'DEFEND', label: 'DEFEND', disabled: !canUseDefend, title: 'Reduces incoming damage by 50% this turn.' },
    { action: 'CHARGE', label: 'CHARGE', disabled: !canUseCharge, title: 'Next ATTACK deals +40% damage.' },
    { action: 'STUN', label: `STUN${!canStun ? ' (far)' : ''}`, disabled: !canUseStun, title: 'Stuns enemy for 1 turn (range ≤ 2, 50% miss chance when stunned).' },
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
            <div className="demo-ap-fill" style={{ width: `${Math.min(p1.ap / AP_BAR_MAX, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p1.ap.toFixed(1)}</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p1.mp / MP_BAR_MAX, 1) * 100}%`, background: '#00E5FF' }} />
          </div>
          <div className="demo-ap-text">MP {p1.mp.toFixed(0)}</div>
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
            <div className="demo-ap-fill" style={{ width: `${Math.min(p2.ap / AP_BAR_MAX, 1) * 100}%` }} />
          </div>
          <div className="demo-ap-text">AP {p2.ap.toFixed(1)}</div>
          <div className="demo-ap-bar">
            <div className="demo-ap-fill" style={{ width: `${Math.min(p2.mp / MP_BAR_MAX, 1) * 100}%`, background: '#00E5FF' }} />
          </div>
          <div className="demo-ap-text">MP {p2.mp.toFixed(0)}</div>
        </div>
      </div>

      <div className="demo-turn-counter">
        {winner
          ? winner
          : `TURN ${turn} / ${MAX_TURNS}  ·  STAGE ${turnStage}  ·  DIST ${dist}`}
      </div>

      {!winner && (
        <>
          {aiThinking ? (
            <div className="demo-ai-turn">AI IS THINKING...</div>
          ) : (
            <div className="demo-your-turn">YOUR TURN — MOVE (MP) OR ACT (AP)</div>
          )}
          <div className="demo-action-row">
            {MOVE_ACTIONS.map(({ dir, label }) => (
              <button
                key={`move-${dir}`}
                className="demo-action-btn"
                style={{ background: ACTION_COLORS.MOVE }}
                onClick={() => handlePlayerAction('MOVE', dir)}
                disabled={!canMove || aiThinking || !live.waitingForPlayer}
                title="Spend 1 MP + 0.5 AP to move one tile."
              >
                {label}
              </button>
            ))}
          </div>
          <div className="demo-action-row">
            {ACTIONS.map(({ action, label, disabled, title }) => (
              <button
                key={action}
                className="demo-action-btn"
                style={{ background: ACTION_COLORS[action] }}
                onClick={() => handlePlayerAction(action)}
                disabled={disabled || aiThinking || !live.waitingForPlayer}
                title={title}
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
          {' · '}YOU AP {lastResult.p1Ap.toFixed(1)} MP {lastResult.p1Mp.toFixed(0)}
        </div>
      )}

      <div className="demo-body">
        <div className="demo-grid-wrap">
          <div className="demo-grid">{gridCells}</div>
          <div className="demo-grid-label">7×7 ARENA GRID · YOU = RED · DIRECTIONAL MOVEMENT ENABLED</div>
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
          {STRIPE_FOUNDER_URL
            ? <button className="demo-cta" type="button" onClick={() => { void beginFounderCheckout('play-winner') }}>GET FOUNDER PACK &rarr;</button>
            : <Link to="/sign-in" className="demo-cta">ENTER THE PIT &rarr;</Link>}
          <button className="demo-restart" onClick={resetGame}>Play again</button>
        </div>
      )}
    </div>
  )
}

// ── Root component ──
export default function DemoLoop() {
  const [mode, setMode] = useState<GameMode>('watch')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DEMO_STYLES }} />
      <div className="demo-root">
        {mode === 'watch'
          ? <WatchMode onSwitchToPlay={() => setMode('play')} />
          : <PlayMode onSwitchToWatch={() => setMode('watch')} />
        }
      </div>
    </>
  )
}
