import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

const PIT_STYLES = `
  .pit-root {
    min-height: calc(100vh - 56px);
    width: 100%;
    background:
      radial-gradient(circle, rgba(0,229,255,0.08) 1px, transparent 1px),
      radial-gradient(ellipse at 50% 30%, #0a0a2e 0%, #050510 60%, #000 100%);
    background-size: 24px 24px, 100% 100%;
    color: #f0f0f5;
    font-family: 'Kanit', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 1.5rem 4rem;
  }

  .pit-spotlight {
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%);
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .pit-hero {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .pit-hud-panel {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    background: rgba(0,0,0,0.7);
    border: 1px solid rgba(0,229,255,0.3);
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    color: rgba(0,229,255,0.8);
    backdrop-filter: blur(8px);
    min-width: 160px;
    z-index: 10;
  }
  .pit-hud-label { color: rgba(255,255,255,0.4); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; }
  .pit-hud-val { color: #00E5FF; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem; }

  .pit-title {
    font-family: 'Bangers', cursive;
    font-size: 4rem;
    color: #FFD600;
    text-shadow: 4px 4px 0 #000;
    letter-spacing: 3px;
    margin: 0;
    text-align: center;
  }

  .pit-subtitle {
    font-family: 'Kanit', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    color: rgba(255,255,255,0.5);
    text-align: center;
    margin: 0.25rem 0 1.5rem;
  }

  .pit-enter-btn {
    display: block;
    width: 100%;
    max-width: 400px;
    margin: 0 auto 2rem;
    padding: 1rem 2rem;
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    background: #00E5FF;
    color: #000;
    border: 4px solid #000;
    box-shadow: 0 6px 0 #000;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    text-shadow: none;
  }
  .pit-enter-btn:active {
    transform: translateY(6px);
    box-shadow: none;
  }
  .pit-enter-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .pit-enter-btn.pit-btn-noshell {
    background: #FFD600;
    color: #000;
    text-shadow: none;
  }

  .pit-error {
    text-align: center;
    color: #EB4D4B;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    margin: -1rem 0 1.5rem;
  }

  .pit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .pit-grid {
      grid-template-columns: 1fr;
    }
    .pit-title {
      font-size: 2.8rem;
    }
  }

  .pit-panel {
    border: 3px solid #000;
    box-shadow: 6px 6px 0 #000;
    background: rgba(255,255,255,0.03);
    border-radius: 14px;
    padding: 1.5rem;
  }

  .pit-section-title {
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 2px 2px 0 #FF9F1C;
    margin: 0 0 1rem;
  }

  .pit-lb-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.5rem;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .pit-lb-row.pit-lb-me {
    background: rgba(255,214,0,0.08);
    border-left: 3px solid #FFD600;
  }

  .pit-lb-rank {
    font-family: 'Bangers', cursive;
    color: #FFD600;
    font-size: 1.1rem;
    min-width: 28px;
  }

  .pit-lb-name {
    font-family: 'Kanit', sans-serif;
    font-weight: 800;
    color: #fff;
    flex: 1;
    font-size: 0.9rem;
  }

  .pit-lb-hardness {
    font-family: 'IBM Plex Mono', monospace;
    color: #00E5FF;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .pit-empty {
    color: rgba(255,255,255,0.3);
    font-family: 'IBM Plex Mono', monospace;
    padding: 1rem 0;
    font-size: 0.85rem;
  }

  .pit-tank-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .pit-tank-item:last-child { border-bottom: none; }

  .pit-tank-label {
    font-family: 'Kanit', sans-serif;
    font-weight: 800;
    color: rgba(255,255,255,0.7);
    font-size: 0.9rem;
  }

  .pit-tank-join {
    font-family: 'Bangers', cursive;
    font-size: 0.95rem;
    letter-spacing: 1px;
    color: #000;
    background: #00E5FF;
    border: 2px solid #000;
    border-radius: 8px;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    box-shadow: 2px 2px 0 #000;
    text-decoration: none;
    transition: transform 0.1s;
  }
  .pit-tank-join:active {
    transform: translateY(2px);
    box-shadow: 0 0 0 #000;
  }

  .pit-loading {
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

export default function ThePit() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/sign-in', search: { returnTo: '/play' } })
    }
  }, [isAuthenticated, isLoading, navigate])

  const { data: topPlayers } = useQuery({
    ...convexQuery(api.ladder.getTopPlayers, { limit: 10 }),
    enabled: isAuthenticated,
  })

  const { data: openTanks } = useQuery({
    ...convexQuery(api.tanks.listOpen, {}),
    enabled: isAuthenticated,
  })

  const { data: player } = useQuery({
    ...convexQuery(api.players.getCurrent, {}),
    enabled: isAuthenticated,
  })

  const { data: shells } = useQuery({
    ...convexQuery(api.shells.list, {}),
    enabled: isAuthenticated,
  })

  const createTank = useMutation(api.tanks.create)

  const [entering, setEntering] = useState(false)
  const [enterError, setEnterError] = useState('')

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PIT_STYLES }} />
        <div className="pit-loading">Loading...</div>
      </>
    )
  }

  const hasShells = shells && shells.length > 0
  const noShellText = 'BUILD A CRAWLER FIRST \u2192'

  const handleEnterMolt = async () => {
    if (!shells || shells.length === 0) {
      navigate({ to: '/shell' })
      return
    }
    setEntering(true)
    setEnterError('')
    try {
      const tankId = await createTank({ hostShellId: shells[0]._id })
      navigate({ to: `/tank/${tankId}` })
    } catch {
      setEnterError('Could not create tank. Try again.')
      setEntering(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PIT_STYLES }} />
      <div className="pit-root">
        {/* Hero area with spotlight */}
        <div className="pit-hero">
          <div className="pit-spotlight" />
          <h1 className="pit-title">&#9889; THE PIT</h1>
          <p className="pit-subtitle">The arena. Live matches. Real crawlers fighting now.</p>

          {/* Enter a Molt CTA */}
          <button
            className={`pit-enter-btn${!hasShells ? ' pit-btn-noshell' : ''}`}
            onClick={handleEnterMolt}
            disabled={entering}
          >
            {entering ? 'ENTERING...' : hasShells ? '\u26A1 ENTER A MOLT' : noShellText}
          </button>
          {enterError && <div className="pit-error">{enterError}</div>}
        </div>

        {/* Two-column grid */}
        <div className="pit-grid" style={{ width: '100%' }}>
          {/* Leaderboard */}
          <div className="pit-panel">
            <h2 className="pit-section-title">Leaderboard</h2>
            {!topPlayers || topPlayers.length === 0 ? (
              <div className="pit-empty">No players yet</div>
            ) : (
              topPlayers.map((p, i) => (
                <div
                  key={p._id}
                  className={`pit-lb-row${player && p._id === player._id ? ' pit-lb-me' : ''}`}
                >
                  <span className="pit-lb-rank">{i + 1}</span>
                  <span className="pit-lb-name">{p.username ?? 'Unknown'}</span>
                  <span className="pit-lb-hardness">{p.hardness}</span>
                </div>
              ))
            )}
          </div>

          {/* Open Tanks */}
          <div className="pit-panel">
            <h2 className="pit-section-title">Open Tanks</h2>
            {!openTanks || openTanks.length === 0 ? (
              <div className="pit-empty">No open tanks &mdash; be first!</div>
            ) : (
              openTanks.map((tank) => (
                <div key={tank._id} className="pit-tank-item">
                  <span className="pit-tank-label">
                    Tank #{String(tank._id).slice(-4)}
                  </span>
                  <button
                    className="pit-tank-join"
                    onClick={() => navigate({ to: `/tank/${tank._id}` })}
                  >
                    JOIN
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* HUD panel — bottom-left */}
        <div className="pit-hud-panel">
          <div className="pit-hud-label">Hardness</div>
          <div className="pit-hud-val">{player?.hardness ?? '—'}</div>
          <div className="pit-hud-label">Molts</div>
          <div className="pit-hud-val">{player?.moltsPlayed ?? 0}</div>
        </div>
      </div>
    </>
  )
}
