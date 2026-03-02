import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'

type Action = 'ATTACK' | 'DEFEND' | 'CHARGE' | 'STUN' | 'WAIT'

type FighterState = {
  name: string
  color: string
  hp: number
  energy: number
  pos: { x: number; y: number }
  charged: boolean
  stunnedTurns: number
}

type TurnSnapshot = {
  turn: number
  aAction: Action
  bAction: Action
  aHp: number
  bHp: number
  aEnergy: number
  bEnergy: number
  aPos: { x: number; y: number }
  bPos: { x: number; y: number }
  aDamage: number
  bDamage: number
  log: string
}

type MatchResult = {
  turns: TurnSnapshot[]
  winner: 'BERSERKER' | 'TACTICIAN' | 'DRAW'
  reason: string
}

const GRID = { w: 9, h: 5 }
const TURN_MS = 2500
const MAX_TURNS = 12 // ~30 seconds autoplay
const HP_MAX = 140
const ENERGY_MAX = 100
const ENERGY_REGEN = 12
const ATTACK_RANGE = 1.5
const STUN_RANGE = 2

const COST: Record<Action, number> = {
  ATTACK: 30,
  DEFEND: 20,
  CHARGE: 25,
  STUN: 35,
  WAIT: 0,
}

const ACTION_COLORS: Record<Action, string> = {
  ATTACK: '#EB4D4B',
  DEFEND: '#2ecc71',
  CHARGE: '#FFD600',
  STUN: '#ff9f43',
  WAIT: '#7f8c8d',
}

const founderCheckoutUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? '').trim()

const DEMO_STYLES = `
  .demo-root {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(circle, rgba(0,229,255,0.08) 1px, transparent 1px),
      radial-gradient(ellipse at 50% 30%, #0a0a2e 0%, #050510 60%, #000 100%);
    background-size: 24px 24px, 100% 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    color: #f0f0f5;
    overflow: hidden;
  }

  .demo-card {
    width: min(940px, 100%);
    background: rgba(0, 0, 0, 0.62);
    border: 1px solid rgba(0,229,255,0.26);
    border-radius: 16px;
    padding: 1.2rem;
    box-shadow: 0 24px 64px rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
  }

  .demo-title {
    margin: 0 0 0.8rem;
    text-align: center;
    color: #FFD600;
    letter-spacing: 2px;
    font-family: 'Bangers', cursive;
    font-size: clamp(1.9rem, 3.8vw, 2.8rem);
    text-shadow: 2px 2px 0 #000;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: 1.25fr 0.9fr;
    gap: 1rem;
  }

  .demo-arena {
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    background: rgba(0,0,0,0.35);
    padding: 0.9rem;
  }

  .demo-vs {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.9rem;
    align-items: center;
    margin-bottom: 0.8rem;
  }

  .demo-bot-name {
    font-family: 'Bangers', cursive;
    letter-spacing: 1px;
    font-size: 1.25rem;
    margin-bottom: 0.3rem;
  }

  .demo-vs-text {
    font-family: 'Bangers', cursive;
    color: #FFD600;
    font-size: 1.35rem;
    text-shadow: 1px 1px 0 #000;
  }

  .demo-bar-shell {
    height: 14px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
  }

  .demo-bar-fill {
    height: 100%;
    transition: width 420ms ease;
  }

  .demo-stat-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.25rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.65);
  }

  .demo-map {
    margin-top: 0.9rem;
    display: grid;
    grid-template-columns: repeat(${GRID.w}, minmax(26px, 1fr));
    gap: 6px;
    border-radius: 12px;
    padding: 0.75rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .demo-cell {
    aspect-ratio: 1 / 1;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    display: grid;
    place-items: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.64rem;
    color: rgba(255,255,255,0.4);
  }

  .demo-cell.goal {
    border-color: rgba(255,214,0,0.35);
    background: rgba(255,214,0,0.08);
  }

  .demo-token {
    width: 78%;
    height: 78%;
    border-radius: 50%;
    border: 2px solid #000;
    box-shadow: 0 0 12px rgba(0,0,0,0.35);
  }

  .demo-feed {
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    background: rgba(0,0,0,0.42);
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .demo-feed-title {
    color: rgba(0,229,255,0.74);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 0.65rem;
  }

  .demo-turn {
    color: rgba(255,255,255,0.45);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    margin-bottom: 0.55rem;
  }

  .demo-ticker {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-height: 210px;
  }

  .demo-log-line {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    padding: 0.42rem 0.5rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    color: rgba(255,255,255,0.8);
    animation: demo-log-slide 220ms ease-out;
  }

  .demo-log-line.latest {
    border-color: rgba(0,229,255,0.45);
    box-shadow: 0 0 0 1px rgba(0,229,255,0.2) inset;
  }

  .demo-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.36rem;
    border-radius: 4px;
    color: #111;
    font-weight: 700;
    margin: 0 0.18rem;
  }

  .demo-winner {
    margin-top: auto;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 0.75rem;
  }

  .demo-winner-title {
    font-family: 'Bangers', cursive;
    font-size: 1.9rem;
    color: #FFD600;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0 #000;
    margin-bottom: 0.25rem;
  }

  .demo-winner-sub {
    font-size: 0.82rem;
    color: rgba(255,255,255,0.6);
    margin-bottom: 0.65rem;
  }

  .demo-cta-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .demo-cta {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    text-decoration: none;
    border-radius: 10px;
    font-family: 'Bangers', cursive;
    letter-spacing: 1px;
    padding: 0.65rem 1rem;
    border: 2px solid #000;
    box-shadow: 3px 3px 0 #000;
  }

  .demo-cta.primary {
    background: #FFD600;
    color: #111;
  }

  .demo-cta.secondary {
    background: #00E5FF;
    color: #111;
  }

  .demo-founder-note {
    margin-top: 0.45rem;
    color: rgba(255,255,255,0.55);
    font-size: 0.72rem;
    line-height: 1.4;
  }

  @keyframes demo-log-slide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 880px) {
    .demo-grid {
      grid-template-columns: 1fr;
    }
    .demo-ticker {
      min-height: 0;
    }
  }
`

const BERSERKER_BIAS: Record<Action, number> = {
  ATTACK: 46,
  DEFEND: 10,
  CHARGE: 26,
  STUN: 18,
  WAIT: 0,
}

const TACTICIAN_BIAS: Record<Action, number> = {
  ATTACK: 30,
  DEFEND: 28,
  CHARGE: 18,
  STUN: 24,
  WAIT: 0,
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const hpColor = (pct: number) => {
  if (pct > 60) return '#2ecc71'
  if (pct > 30) return '#f39c12'
  return '#EB4D4B'
}

function pickAction(bias: Record<Action, number>) {
  const options = (['ATTACK', 'DEFEND', 'CHARGE', 'STUN'] as Action[])
  const total = options.reduce((sum, action) => sum + bias[action], 0)
  let roll = Math.random() * total
  for (const action of options) {
    roll -= bias[action]
    if (roll <= 0) return action
  }
  return 'ATTACK'
}

function energyAdjustedAction(candidate: Action, energy: number): Action {
  if (energy >= COST[candidate]) return candidate
  if (energy >= COST.DEFEND) return 'DEFEND'
  return 'WAIT'
}

function distance(a: FighterState, b: FighterState) {
  const dx = a.pos.x - b.pos.x
  const dy = a.pos.y - b.pos.y
  return Math.sqrt(dx * dx + dy * dy)
}

function moveToward(actor: FighterState, target: FighterState) {
  const xStep = target.pos.x > actor.pos.x ? 1 : target.pos.x < actor.pos.x ? -1 : 0
  const yStep = target.pos.y > actor.pos.y ? 1 : target.pos.y < actor.pos.y ? -1 : 0
  actor.pos = {
    x: clamp(actor.pos.x + xStep, 0, GRID.w - 1),
    y: clamp(actor.pos.y + yStep, 0, GRID.h - 1),
  }
}

function moveAway(actor: FighterState, target: FighterState) {
  const xStep = target.pos.x >= actor.pos.x ? -1 : 1
  const yStep = target.pos.y >= actor.pos.y ? -1 : 1
  actor.pos = {
    x: clamp(actor.pos.x + xStep, 0, GRID.w - 1),
    y: clamp(actor.pos.y + yStep, 0, GRID.h - 1),
  }
}

function baseDamage() {
  return 10 + Math.floor(Math.random() * 9)
}

function simulateMatch(): MatchResult {
  const a: FighterState = {
    name: 'BERSERKER',
    color: '#EB4D4B',
    hp: HP_MAX,
    energy: ENERGY_MAX,
    pos: { x: 1, y: 2 },
    charged: false,
    stunnedTurns: 0,
  }
  const b: FighterState = {
    name: 'TACTICIAN',
    color: '#00E5FF',
    hp: HP_MAX,
    energy: ENERGY_MAX,
    pos: { x: GRID.w - 2, y: 2 },
    charged: false,
    stunnedTurns: 0,
  }

  const turns: TurnSnapshot[] = []
  let winner: MatchResult['winner'] = 'DRAW'
  let reason = 'Time limit reached'

  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    const aStunned = a.stunnedTurns > 0
    const bStunned = b.stunnedTurns > 0

    let aAction: Action = aStunned ? 'WAIT' : energyAdjustedAction(pickAction(BERSERKER_BIAS), a.energy)
    let bAction: Action = bStunned ? 'WAIT' : energyAdjustedAction(pickAction(TACTICIAN_BIAS), b.energy)

    const aDefending = aAction === 'DEFEND'
    const bDefending = bAction === 'DEFEND'

    if (aAction === 'ATTACK' || aAction === 'CHARGE') moveToward(a, b)
    if (bAction === 'ATTACK' || bAction === 'CHARGE') moveToward(b, a)
    if (aAction === 'DEFEND' && distance(a, b) <= 1) moveAway(a, b)
    if (bAction === 'DEFEND' && distance(a, b) <= 1) moveAway(b, a)

    if (a.pos.x === b.pos.x && a.pos.y === b.pos.y) {
      b.pos.x = clamp(b.pos.x + 1, 0, GRID.w - 1)
    }

    let aDamage = 0
    let bDamage = 0

    if (aAction === 'ATTACK' && distance(a, b) <= ATTACK_RANGE) {
      aDamage = baseDamage() + (a.charged ? 8 : 0)
      if (bDefending) aDamage = Math.floor(aDamage * 0.45)
      a.charged = false
    } else if (aAction === 'CHARGE') {
      a.charged = true
    } else if (aAction === 'STUN' && distance(a, b) <= STUN_RANGE) {
      b.stunnedTurns = Math.max(b.stunnedTurns, 1)
    }

    if (bAction === 'ATTACK' && distance(a, b) <= ATTACK_RANGE) {
      bDamage = baseDamage() + (b.charged ? 8 : 0)
      if (aDefending) bDamage = Math.floor(bDamage * 0.45)
      b.charged = false
    } else if (bAction === 'CHARGE') {
      b.charged = true
    } else if (bAction === 'STUN' && distance(a, b) <= STUN_RANGE) {
      a.stunnedTurns = Math.max(a.stunnedTurns, 1)
    }

    a.hp = clamp(a.hp - bDamage, 0, HP_MAX)
    b.hp = clamp(b.hp - aDamage, 0, HP_MAX)

    a.energy = clamp(a.energy - COST[aAction] + ENERGY_REGEN, 0, ENERGY_MAX)
    b.energy = clamp(b.energy - COST[bAction] + ENERGY_REGEN, 0, ENERGY_MAX)

    if (aStunned) a.stunnedTurns = Math.max(0, a.stunnedTurns - 1)
    if (bStunned) b.stunnedTurns = Math.max(0, b.stunnedTurns - 1)

    const log = `T${turn} ${a.name} ${aAction}${aDamage ? `(-${aDamage})` : ''} vs ${b.name} ${bAction}${bDamage ? `(-${bDamage})` : ''}`

    turns.push({
      turn,
      aAction,
      bAction,
      aHp: a.hp,
      bHp: b.hp,
      aEnergy: a.energy,
      bEnergy: b.energy,
      aPos: { ...a.pos },
      bPos: { ...b.pos },
      aDamage,
      bDamage,
      log,
    })

    if (a.hp <= 0 || b.hp <= 0) {
      winner = a.hp === b.hp ? 'DRAW' : a.hp > b.hp ? 'BERSERKER' : 'TACTICIAN'
      reason = 'Knockout'
      break
    }
  }

  if (winner === 'DRAW') {
    const finalTurn = turns[turns.length - 1]
    if (finalTurn) {
      if (finalTurn.aHp > finalTurn.bHp) winner = 'BERSERKER'
      else if (finalTurn.bHp > finalTurn.aHp) winner = 'TACTICIAN'
      else reason = 'Even damage'
    }
  }

  return { turns, winner, reason }
}

export default function DemoLoop() {
  const [match, setMatch] = useState<MatchResult>(() => simulateMatch())
  const [visibleTurn, setVisibleTurn] = useState(0)
  const [phase, setPhase] = useState<'playing' | 'ended'>('playing')
  const [founderNote, setFounderNote] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startNewMatch = useCallback(() => {
    setFounderNote('')
    setMatch(simulateMatch())
    setVisibleTurn(0)
    setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase === 'ended') {
      timerRef.current = setTimeout(startNewMatch, 3500)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    if (visibleTurn >= match.turns.length) {
      setPhase('ended')
      return
    }

    timerRef.current = setTimeout(() => {
      setVisibleTurn((turn) => turn + 1)
    }, visibleTurn === 0 ? 900 : TURN_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visibleTurn, phase, match.turns.length, startNewMatch])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const current = visibleTurn > 0 ? match.turns[visibleTurn - 1] : null
  const aHp = current?.aHp ?? HP_MAX
  const bHp = current?.bHp ?? HP_MAX
  const aEnergy = current?.aEnergy ?? ENERGY_MAX
  const bEnergy = current?.bEnergy ?? ENERGY_MAX
  const logs = useMemo(() => match.turns.slice(0, visibleTurn), [match.turns, visibleTurn])
  const recentLogs = logs.slice(-6).reverse()

  const handleFounderCheckout = () => {
    if (!founderCheckoutUrl) {
      setFounderNote('Founder checkout is not configured yet. Use the homepage waitlist and we will email the launch checkout link.')
      return
    }
    const email = typeof window !== 'undefined' ? window.localStorage.getItem('moltpit_email') : ''
    const target = new URL(founderCheckoutUrl)
    if (email) target.searchParams.set('prefilled_email', email)
    window.location.href = target.toString()
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DEMO_STYLES }} />
      <div className="demo-root">
        <section className="demo-card">
          <h1 className="demo-title">AUTONOMOUS DEMO MOLT</h1>

          <div className="demo-grid">
            <div className="demo-arena">
              <div className="demo-vs">
                <div>
                  <div className="demo-bot-name" style={{ color: '#EB4D4B' }}>BERSERKER</div>
                  <div className="demo-bar-shell">
                    <div className="demo-bar-fill" style={{ width: `${(aHp / HP_MAX) * 100}%`, background: hpColor((aHp / HP_MAX) * 100) }} />
                  </div>
                  <div className="demo-stat-row">
                    <span>{aHp} HP</span>
                    <span>{aEnergy} EN</span>
                  </div>
                </div>

                <div className="demo-vs-text">VS</div>

                <div>
                  <div className="demo-bot-name" style={{ color: '#00E5FF', textAlign: 'right' }}>TACTICIAN</div>
                  <div className="demo-bar-shell">
                    <div className="demo-bar-fill" style={{ width: `${(bHp / HP_MAX) * 100}%`, background: hpColor((bHp / HP_MAX) * 100) }} />
                  </div>
                  <div className="demo-stat-row">
                    <span>{bHp} HP</span>
                    <span>{bEnergy} EN</span>
                  </div>
                </div>
              </div>

              <div className="demo-map">
                {Array.from({ length: GRID.h }).flatMap((_, y) =>
                  Array.from({ length: GRID.w }).map((__, x) => {
                    const aHere = (current?.aPos ?? { x: 1, y: 2 }).x === x && (current?.aPos ?? { x: 1, y: 2 }).y === y
                    const bHere = (current?.bPos ?? { x: GRID.w - 2, y: 2 }).x === x && (current?.bPos ?? { x: GRID.w - 2, y: 2 }).y === y
                    const isGoal = x >= 3 && x <= 5 && y >= 1 && y <= 3
                    return (
                      <div key={`${x}-${y}`} className={`demo-cell${isGoal ? ' goal' : ''}`}>
                        {aHere && <span className="demo-token" style={{ background: '#EB4D4B' }} />}
                        {bHere && <span className="demo-token" style={{ background: '#00E5FF' }} />}
                      </div>
                    )
                  }),
                )}
              </div>
            </div>

            <aside className="demo-feed">
              <div className="demo-feed-title">Action Ticker</div>
              <div className="demo-turn">
                {phase === 'playing'
                  ? visibleTurn === 0
                    ? 'Match booting...'
                    : `Turn ${visibleTurn}/${match.turns.length}`
                  : `Winner locked (${match.reason})`}
              </div>
              <div className="demo-ticker">
                {recentLogs.length === 0 && (
                  <div className="demo-log-line">Initializing action economy...</div>
                )}
                {recentLogs.map((entry, index) => (
                  <div key={entry.turn} className={`demo-log-line${index === 0 ? ' latest' : ''}`}>
                    T{entry.turn}{' '}
                    <span className="demo-tag" style={{ background: ACTION_COLORS[entry.aAction] }}>{entry.aAction}</span>
                    {' / '}
                    <span className="demo-tag" style={{ background: ACTION_COLORS[entry.bAction] }}>{entry.bAction}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}> · {entry.aHp} - {entry.bHp}</span>
                  </div>
                ))}
              </div>

              {phase === 'ended' && (
                <div className="demo-winner">
                  <div className="demo-winner-title">
                    {match.winner === 'DRAW' ? 'DRAW' : `${match.winner} WINS`}
                  </div>
                  <div className="demo-winner-sub">
                    Build a shell and enter ranked molts.
                  </div>
                  <div className="demo-cta-row">
                    <Link to="/shell" className="demo-cta primary">Build Your Crawler</Link>
                    <button type="button" className="demo-cta secondary" onClick={handleFounderCheckout}>
                      Founder Pack
                    </button>
                  </div>
                  {founderNote && <div className="demo-founder-note">{founderNote}</div>}
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </>
  )
}
