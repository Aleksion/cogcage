import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useEffect } from 'react'
import { ClientOnly } from '~/components/ClientOnly'
import { getCard } from '~/lib/cards'

const FORGE_STYLES = `
  .forge-root {
    min-height: calc(100vh - 56px);
    width: 100%;
    background:
      radial-gradient(circle, rgba(255,120,30,0.07) 1px, transparent 1px),
      radial-gradient(ellipse at 30% 60%, #2a1000 0%, #120800 50%, #0a0500 100%);
    background-size: 32px 32px, 100% 100%;
    color: #f0f0f5;
    font-family: 'Kanit', sans-serif;
    padding: 2.5rem 3rem 4rem;
  }

  .forge-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .forge-welcome {
    font-family: 'Bangers', cursive;
    font-size: 2.2rem;
    letter-spacing: 2px;
    color: #FFD600;
    text-shadow: 3px 3px 0 #000;
    margin: 0;
  }

  .forge-cr {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: #FFD600;
    background: rgba(255,214,0,0.1);
    border: 2px solid #000;
    border-radius: 999px;
    padding: 0.3rem 1rem;
    box-shadow: 3px 3px 0 #000;
  }

  .forge-grid {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .forge-grid {
      grid-template-columns: 1fr;
    }
  }

  .forge-panel {
    background: rgba(255,120,30,0.05);
    border: 1px solid rgba(255,120,30,0.2);
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(255,80,0,0.1);
    padding: 1.5rem;
  }

  .forge-crawler-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .forge-bot-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .forge-bot-glow {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,120,30,0.2) 0%, transparent 70%);
    position: absolute;
    pointer-events: none;
  }

  .forge-bot-art {
    width: 140px;
    height: 140px;
    background: rgba(46,204,113,0.1);
    border: 3px solid #000;
    border-radius: 14px;
    display: grid;
    place-items: center;
    font-size: 4rem;
    margin-bottom: 1rem;
    box-shadow: 4px 4px 0 #000;
  }

  .forge-crawler-name {
    font-family: 'Bangers', cursive;
    font-size: 1.8rem;
    letter-spacing: 2px;
    color: #FFD600;
    text-shadow: 2px 2px 0 #000;
    margin: 0 0 0.25rem;
  }

  .forge-mold-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: 1rem;
  }

  .forge-stat-bar {
    width: 100%;
    margin-bottom: 0.6rem;
  }

  .forge-stat-label {
    display: flex;
    justify-content: space-between;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 0.2rem;
  }

  .forge-stat-track {
    height: 10px;
    background: rgba(255,255,255,0.08);
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.1);
    overflow: hidden;
  }

  .forge-stat-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .forge-ctas {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: 100%;
    margin-top: 1.25rem;
  }

  .forge-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem 1.5rem;
    font-family: 'Bangers', cursive;
    font-size: 1.3rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    border: 3px solid #000;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s;
    box-shadow: 4px 4px 0 #000;
  }
  .forge-cta:active {
    transform: translateY(3px);
    box-shadow: 1px 1px 0 #000;
  }

  .forge-cta-primary {
    background: #EB4D4B;
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0,0,0,0.3);
  }
  .forge-cta-primary:hover { background: #d93a38; }

  .forge-cta-secondary {
    background: #fff;
    color: #1A1A1A;
  }
  .forge-cta-secondary:hover { background: #f0f0f0; }

  .forge-section-title {
    font-family: 'Bangers', cursive;
    font-size: 1.2rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #fff;
    margin: 0 0 0.75rem;
    text-shadow: 1px 1px 0 #000;
  }

  .forge-quick-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .forge-stat-card {
    background: rgba(255,255,255,0.03);
    border: 3px solid #000;
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
    box-shadow: 4px 4px 0 #000;
  }

  .forge-stat-value {
    font-family: 'Bangers', cursive;
    font-size: 1.8rem;
    color: #FFD600;
    text-shadow: 2px 2px 0 #000;
    letter-spacing: 1px;
  }

  .forge-stat-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-top: 0.2rem;
  }

  .forge-molt-feed {
    margin-bottom: 1.5rem;
  }

  .forge-molt-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 0.9rem;
  }
  .forge-molt-item:last-child { border-bottom: none; }

  .forge-molt-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .forge-molt-opponent {
    font-weight: 700;
    color: rgba(255,255,255,0.8);
    flex: 1;
  }

  .forge-molt-cr {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .forge-molt-time {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.25);
  }

  .forge-tanks-strip {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .forge-tank-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 0.65rem 1rem;
  }

  .forge-tank-host {
    font-weight: 700;
    font-size: 0.9rem;
    color: rgba(255,255,255,0.7);
  }

  .forge-tank-join {
    font-family: 'Bangers', cursive;
    font-size: 0.95rem;
    letter-spacing: 1px;
    color: #1A1A1A;
    background: #00E5FF;
    border: 2px solid #000;
    border-radius: 8px;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    box-shadow: 2px 2px 0 #000;
    text-decoration: none;
    transition: transform 0.1s;
  }
  .forge-tank-join:active {
    transform: translateY(2px);
    box-shadow: 0 0 0 #000;
  }

  .forge-empty {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.5px;
    padding: 1rem 0;
  }

  .forge-loading {
    min-height: 50vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.25);
    letter-spacing: 2px;
    text-transform: uppercase;
  }
`

export const Route = createFileRoute('/forge')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — The Forge' },
      { name: 'description', content: 'Your home dashboard. Manage your crawler and jump into a molt.' },
    ],
  }),
  component: ForgePage,
})

function ForgePage() {
  return <ClientOnly>{() => <ForgeContent />}</ClientOnly>
}

function ForgeContent() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/sign-in', search: { returnTo: '/forge' } })
    }
  }, [isAuthenticated, isLoading, navigate])

  const { data: player } = useQuery({
    ...convexQuery(api.players.getCurrent, {}),
    enabled: isAuthenticated,
  })

  const { data: shells } = useQuery({
    ...convexQuery(api.shells.list, {}),
    enabled: isAuthenticated,
  })

  const { data: openTanks } = useQuery({
    ...convexQuery(api.tanks.listOpen, {}),
    enabled: isAuthenticated,
  })

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: FORGE_STYLES }} />
        <div className="forge-loading">Loading...</div>
      </>
    )
  }

  const username = player?.username || 'Crawler'
  const moltsPlayed = player?.moltsPlayed ?? 0
  const moltsWon = player?.moltsWon ?? 0
  const winPct = moltsPlayed > 0 ? Math.round((moltsWon / moltsPlayed) * 100) : 0
  const rank = player?.hardness ?? 1000

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FORGE_STYLES }} />
      <div className="forge-root">
        {/* Header */}
        <div className="forge-header">
          <h1 className="forge-welcome">WELCOME BACK, {username.toUpperCase()}</h1>
          <span className="forge-cr">&#9889; {rank} CR</span>
        </div>

        {/* Main grid */}
        <div className="forge-grid">
          {/* Left column — Crawler preview */}
          {shells && shells.length > 0 ? (() => {
            const shell = shells[0]
            const attack = Math.round(Math.min(100, (shell.stats.totalWeight / 24) * 100))
            const armor = shell.stats.armorValue
            const compute = Math.round(Math.max(0, 100 - (shell.stats.totalOverhead / 30) * 100))
            return (
              <div className="forge-panel forge-crawler-preview">
                <div className="forge-bot-wrap">
                  <div className="forge-bot-glow" />
                  <div className="forge-bot-art">&#129302;</div>
                </div>
                <h2 className="forge-crawler-name">{shell.name}</h2>
                <div className="forge-mold-label">
                  {shell.cards.length} cards equipped&ensp;
                  {shell.cards.slice(0, 6).map((cardId, i) => (
                    <span key={i} style={{ fontSize: '1.1rem' }}>{getCard(cardId)?.icon ?? '?'}</span>
                  ))}
                </div>

                <StatBar label="Attack" value={attack} color="#EB4D4B" />
                <StatBar label="Armor" value={armor} color="#FFD600" />
                <StatBar label="Compute" value={compute} color="#00E5FF" />

                <div className="forge-ctas">
                  <Link to="/play" className="forge-cta forge-cta-primary">
                    &#9889; Find a Molt
                  </Link>
                  <Link to="/shell" className="forge-cta forge-cta-secondary">
                    &#9998; Edit Mold
                  </Link>
                </div>
              </div>
            )
          })() : (
            <div className="forge-panel forge-crawler-preview">
              <div className="forge-bot-wrap">
                <div className="forge-bot-glow" />
                <div className="forge-bot-art" style={{ fontSize: '5rem', background: 'rgba(235,77,75,0.1)' }}>&#129302;</div>
              </div>
              <h2 className="forge-crawler-name">FORGE YOUR CRAWLER</h2>
              <div className="forge-mold-label" style={{ maxWidth: 240 }}>
                No crawler yet. Build your first shell to enter the pit.
              </div>
              <div className="forge-ctas">
                <Link to="/shell" className="forge-cta" style={{
                  background: '#FFD600',
                  color: '#000',
                  border: '4px solid #000',
                  boxShadow: '0 6px 0 #000',
                  fontSize: '1.5rem',
                }}>
                  &#9889; Build Your Crawler
                </Link>
              </div>
            </div>
          )}

          {/* Right column */}
          <div>
            {/* Quick Stats */}
            <div className="forge-quick-stats">
              <div className="forge-stat-card">
                <div className="forge-stat-value">{moltsPlayed}</div>
                <div className="forge-stat-name">Molts</div>
              </div>
              <div className="forge-stat-card">
                <div className="forge-stat-value">{winPct}%</div>
                <div className="forge-stat-name">Win%</div>
              </div>
              <div className="forge-stat-card">
                <div className="forge-stat-value">#{Math.max(1, Math.round((2000 - rank) / 20))}</div>
                <div className="forge-stat-name">Rank</div>
              </div>
            </div>

            {/* Recent Molts */}
            <div className="forge-panel forge-molt-feed" style={{ marginBottom: '1.5rem' }}>
              <div className="forge-section-title">Recent Molts</div>
              <RecentMolts />
            </div>

            {/* Active Tanks */}
            <div className="forge-panel">
              <div className="forge-section-title">
                Active Tanks{openTanks && openTanks.length > 0 ? ` (${openTanks.length} open)` : ''}
              </div>
              <div className="forge-tanks-strip">
                {(!openTanks || openTanks.length === 0) ? (
                  <div className="forge-empty">No open tanks right now. Create one in the Cage.</div>
                ) : (
                  openTanks.map((tank) => (
                    <div key={tank._id} className="forge-tank-item">
                      <span className="forge-tank-host">&#9654; Tank</span>
                      <Link to={`/tank/${tank._id}`} className="forge-tank-join">JOIN</Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="forge-stat-bar">
      <div className="forge-stat-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="forge-stat-track">
        <div className="forge-stat-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function RecentMolts() {
  // Placeholder — no molts table query yet, show empty state
  return (
    <div className="forge-empty">No molts yet. Jump into the Cage to start fighting!</div>
  )
}
