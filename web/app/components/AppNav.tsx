import { Link, useLocation } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'

const NAV_STYLES = `
  .appnav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #1A1A1A;
    border-bottom: 3px solid #000;
    font-family: 'Kanit', sans-serif;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    box-shadow: 0 4px 0 rgba(0,0,0,0.3);
  }

  .appnav-logo {
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    color: #EB4D4B;
    text-decoration: none;
    text-shadow: 2px 2px 0 #000;
    letter-spacing: 1px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .appnav-logo:hover { color: #ff6b6b; }

  .appnav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .appnav-link {
    font-family: 'Kanit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.5);
    text-decoration: none;
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }
  .appnav-link:hover {
    color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.05);
  }
  .appnav-link.active {
    color: #FFD600;
    background: rgba(255,214,0,0.08);
  }

  .appnav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .appnav-user {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.6);
    font-weight: 600;
  }

  .appnav-signout {
    font-family: 'Kanit', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    background: none;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .appnav-signout:hover {
    color: rgba(255,255,255,0.7);
    border-color: rgba(255,255,255,0.3);
  }

  .appnav-hamburger {
    display: none;
    background: none;
    border: none;
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    padding: 0.3rem;
  }

  @media (max-width: 768px) {
    .appnav-links {
      display: none;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      background: #1A1A1A;
      border-bottom: 3px solid #000;
      flex-direction: column;
      padding: 0.5rem 1rem;
      gap: 0;
    }
    .appnav-links.open {
      display: flex;
    }
    .appnav-link {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .appnav-hamburger {
      display: block;
    }
    .appnav-user {
      display: none;
    }
  }
`

const NAV_ITEMS = [
  { to: '/forge', label: 'Forge' },
  { to: '/shell', label: 'Molds' },
  { to: '/play', label: 'Cage' },
  { to: '/ops-log', label: 'Ladder' },
  { to: '/', label: 'Guide', exact: true },
] as const

export function AppNav() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: player } = useQuery({
    ...convexQuery(api.players.getCurrent, {}),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_STYLES }} />
      <nav className="appnav">
        <Link to="/forge" className="appnav-logo">
          <span style={{ fontSize: '1.1rem' }}>&#9889;</span> THE MOLT PIT
        </Link>

        <button
          className="appnav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <ul className={`appnav-links${menuOpen ? ' open' : ''}`}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`appnav-link${isActive ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="appnav-right">
          {player?.username && (
            <span className="appnav-user">{player.username}</span>
          )}
          <button className="appnav-signout" onClick={() => void signOut()}>
            Sign Out
          </button>
        </div>
      </nav>
    </>
  )
}
