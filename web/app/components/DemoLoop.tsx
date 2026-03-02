import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@tanstack/react-router'

// ── Action Economy ──
type Action = 'ATTACK' | 'DEFEND' | 'CHARGE' | 'STUN'

interface BotConfig {
  name: string
  color: string
  hp: number
  bias: Record<Action, number> // weight for random action selection
}

interface TurnResult {
  turn: number
  p1Action: Action
  p2Action: Action
  p1Dmg: number
  p2Dmg: number
  p1Hp: number
  p2Hp: number
  log: string
}

const BERSERKER: BotConfig = {
  name: 'BERSERKER',
  color: '#EB4D4B',
  hp: 100,
  bias: { ATTACK: 50, DEFEND: 10, CHARGE: 30, STUN: 10 },
}

const TACTICIAN: BotConfig = {
  name: 'TACTICIAN',
  color: '#00E5FF',
  hp: 100,
  bias: { ATTACK: 25, DEFEND: 30, CHARGE: 20, STUN: 25 },
}

function pickAction(bias: Record<Action, number>): Action {
  const actions: Action[] = ['ATTACK', 'DEFEND', 'CHARGE', 'STUN']
  const total = actions.reduce((s, a) => s + bias[a], 0)
  let r = Math.random() * total
  for (const a of actions) {
    r -= bias[a]
    if (r <= 0) return a
  }
  return 'ATTACK'
}

function rollDamage() {
  return 15 + Math.floor(Math.random() * 11) // 15-25
}

function simulateMatch(): { turns: TurnResult[]; winner: string } {
  let p1Hp = BERSERKER.hp
  let p2Hp = TACTICIAN.hp
  let p1Charged = false
  let p2Charged = false
  let p1Stunned = false
  let p2Stunned = false
  const turns: TurnResult[] = []

  for (let t = 1; t <= 10; t++) {
    const p1Act = pickAction(BERSERKER.bias)
    const p2Act = pickAction(TACTICIAN.bias)

    let p1Dmg = 0 // damage dealt TO p2
    let p2Dmg = 0 // damage dealt TO p1

    // P1 action
    if (p1Act === 'ATTACK') {
      let dmg = rollDamage()
      if (p1Charged) { dmg = Math.floor(dmg * 1.4); p1Charged = false }
      if (p1Stunned && Math.random() < 0.5) { dmg = 0 } // 50% miss
      if (p2Act === 'DEFEND') dmg = Math.floor(dmg * 0.5)
      p1Dmg = dmg
    } else if (p1Act === 'CHARGE') {
      p1Charged = true
    } else if (p1Act === 'STUN') {
      p2Stunned = true
    }

    // P2 action
    if (p2Act === 'ATTACK') {
      let dmg = rollDamage()
      if (p2Charged) { dmg = Math.floor(dmg * 1.4); p2Charged = false }
      if (p2Stunned && Math.random() < 0.5) { dmg = 0 } // 50% miss
      if (p1Act === 'DEFEND') dmg = Math.floor(dmg * 0.5)
      p2Dmg = dmg
    } else if (p2Act === 'CHARGE') {
      p2Charged = true
    } else if (p2Act === 'STUN') {
      p1Stunned = true
    }

    p2Hp = Math.max(0, p2Hp - p1Dmg)
    p1Hp = Math.max(0, p1Hp - p2Dmg)

    // Clear stun after it's been applied for one turn
    if (p1Act !== 'STUN') p2Stunned = false
    if (p2Act !== 'STUN') p1Stunned = false

    const logParts: string[] = []
    logParts.push(`T${t}: ${BERSERKER.name} ${p1Act}`)
    if (p1Dmg > 0) logParts.push(`(${p1Dmg} dmg)`)
    logParts.push(`vs ${TACTICIAN.name} ${p2Act}`)
    if (p2Dmg > 0) logParts.push(`(${p2Dmg} dmg)`)

    turns.push({
      turn: t,
      p1Action: p1Act,
      p2Action: p2Act,
      p1Dmg,
      p2Dmg,
      p1Hp,
      p2Hp,
      log: logParts.join(' '),
    })

    if (p1Hp <= 0 || p2Hp <= 0) break
  }

  const winner = p1Hp > p2Hp ? BERSERKER.name
    : p2Hp > p1Hp ? TACTICIAN.name
    : 'DRAW'
  return { turns, winner }
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
    max-width: 700px;
    padding: 1.5rem;
  }

  .demo-title {
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    text-align: center;
    color: #FFD600;
    text-shadow: 2px 2px 0 #000;
    letter-spacing: 2px;
    margin: 0 0 1rem;
  }

  .demo-vs {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .demo-bot {
    flex: 1;
    text-align: center;
  }

  .demo-bot-name {
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
  }

  .demo-hp-bar {
    width: 100%;
    height: 20px;
    background: rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.15);
  }

  .demo-hp-fill {
    height: 100%;
    border-radius: 8px;
    transition: width 0.5s ease, background-color 0.3s;
  }

  .demo-hp-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.6);
    margin-top: 0.25rem;
  }

  .demo-vs-text {
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
    color: #FFD600;
    text-shadow: 1px 1px 0 #000;
    flex-shrink: 0;
  }

  .demo-log {
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(0,229,255,0.2);
    border-radius: 8px;
    padding: 0.75rem;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 1.5rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.78rem;
    line-height: 1.6;
  }

  .demo-log-entry {
    padding: 0.15rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    animation: demo-fade-in 0.3s ease;
  }

  @keyframes demo-fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .demo-action-tag {
    display: inline-block;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: 0 0.2rem;
  }

  .demo-winner {
    text-align: center;
    animation: demo-fade-in 0.5s ease;
  }

  .demo-winner-title {
    font-family: 'Bangers', cursive;
    font-size: 3rem;
    color: #FFD600;
    text-shadow: 3px 3px 0 #000;
    letter-spacing: 3px;
    margin: 0 0 0.5rem;
  }

  .demo-winner-sub {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 1.5rem;
  }

  .demo-cta {
    display: inline-block;
    padding: 0.85rem 2rem;
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
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
    margin: 1rem auto 0;
    background: none;
    border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.4);
    padding: 0.5rem 1.2rem;
    border-radius: 6px;
    font-family: 'Kanit', sans-serif;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .demo-restart:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.3); }

  .demo-turn-counter {
    text-align: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    color: rgba(0,229,255,0.6);
    letter-spacing: 1px;
    margin-bottom: 0.75rem;
  }
`

const ACTION_COLORS: Record<Action, string> = {
  ATTACK: '#EB4D4B',
  DEFEND: '#2ecc71',
  CHARGE: '#FFD600',
  STUN: '#9b59b6',
}

function hpColor(pct: number) {
  if (pct > 60) return '#2ecc71'
  if (pct > 30) return '#f39c12'
  return '#EB4D4B'
}

export default function DemoLoop() {
  const [match, setMatch] = useState(() => simulateMatch())
  const [visibleTurn, setVisibleTurn] = useState(0)
  const [phase, setPhase] = useState<'playing' | 'ended'>('playing')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const startNewMatch = useCallback(() => {
    setMatch(simulateMatch())
    setVisibleTurn(0)
    setPhase('playing')
  }, [])

  // Auto-advance turns
  useEffect(() => {
    if (phase !== 'playing') return

    if (visibleTurn >= match.turns.length) {
      setPhase('ended')
      // Auto-restart after 8 seconds
      timerRef.current = setTimeout(startNewMatch, 8000)
      return
    }

    timerRef.current = setTimeout(() => {
      setVisibleTurn((v) => v + 1)
    }, visibleTurn === 0 ? 1200 : 2200) // first turn faster

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visibleTurn, phase, match.turns.length, startNewMatch])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [visibleTurn])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const currentTurn = visibleTurn > 0 ? match.turns[visibleTurn - 1] : null
  const p1Hp = currentTurn ? currentTurn.p1Hp : BERSERKER.hp
  const p2Hp = currentTurn ? currentTurn.p2Hp : TACTICIAN.hp
  const p1Pct = (p1Hp / BERSERKER.hp) * 100
  const p2Pct = (p2Hp / TACTICIAN.hp) * 100
  const visibleLogs = match.turns.slice(0, visibleTurn)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DEMO_STYLES }} />
      <div className="demo-root">
        <div className="demo-arena">
          <h2 className="demo-title">QUICK DEMO</h2>

          {/* Health bars */}
          <div className="demo-vs">
            <div className="demo-bot">
              <div className="demo-bot-name" style={{ color: BERSERKER.color }}>{BERSERKER.name}</div>
              <div className="demo-hp-bar">
                <div className="demo-hp-fill" style={{ width: `${p1Pct}%`, background: hpColor(p1Pct) }} />
              </div>
              <div className="demo-hp-text">{p1Hp} / {BERSERKER.hp} HP</div>
            </div>
            <div className="demo-vs-text">VS</div>
            <div className="demo-bot">
              <div className="demo-bot-name" style={{ color: TACTICIAN.color }}>{TACTICIAN.name}</div>
              <div className="demo-hp-bar">
                <div className="demo-hp-fill" style={{ width: `${p2Pct}%`, background: hpColor(p2Pct) }} />
              </div>
              <div className="demo-hp-text">{p2Hp} / {TACTICIAN.hp} HP</div>
            </div>
          </div>

          {/* Turn counter */}
          <div className="demo-turn-counter">
            {phase === 'playing'
              ? visibleTurn === 0
                ? 'MATCH STARTING...'
                : `TURN ${visibleTurn} / ${match.turns.length}`
              : 'MATCH COMPLETE'}
          </div>

          {/* Action log */}
          <div className="demo-log" ref={logRef}>
            {visibleLogs.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '1rem 0' }}>
                Waiting for first turn...
              </div>
            ) : (
              visibleLogs.map((t) => (
                <div key={t.turn} className="demo-log-entry">
                  <span style={{ color: '#888' }}>T{t.turn}</span>{' '}
                  <span style={{ color: BERSERKER.color }}>{BERSERKER.name}</span>{' '}
                  <span className="demo-action-tag" style={{ background: ACTION_COLORS[t.p1Action], color: '#000' }}>
                    {t.p1Action}
                  </span>
                  {t.p1Dmg > 0 && <span style={{ color: '#EB4D4B' }}> -{t.p1Dmg}</span>}
                  {' vs '}
                  <span style={{ color: TACTICIAN.color }}>{TACTICIAN.name}</span>{' '}
                  <span className="demo-action-tag" style={{ background: ACTION_COLORS[t.p2Action], color: '#000' }}>
                    {t.p2Action}
                  </span>
                  {t.p2Dmg > 0 && <span style={{ color: '#EB4D4B' }}> -{t.p2Dmg}</span>}
                </div>
              ))
            )}
          </div>

          {/* Winner / CTA */}
          {phase === 'ended' && (
            <div className="demo-winner">
              <div className="demo-winner-title">
                {match.winner === 'DRAW' ? 'DRAW!' : `${match.winner} WINS!`}
              </div>
              <div className="demo-winner-sub">
                {match.winner === 'DRAW'
                  ? 'Both crawlers still standing after 10 rounds.'
                  : `${match.winner} crushed the opposition.`}
              </div>
              <Link to="/shell" className="demo-cta">
                BUILD YOUR CRAWLER &rarr;
              </Link>
              <button className="demo-restart" onClick={startNewMatch}>
                Watch another match
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
