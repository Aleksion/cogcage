import { Link, useLocation } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'

const NAV_STYLES = `
  .appnav {
    position: sticky;
    top: 0;
    z-index: 200;
    background: rgba(5,5,16,0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0,229,255,0.15);
    font-family: 'Kanit', sans-serif;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    /* scanline texture */
    background-image:
      repeating-linear-gradient(
        to bottom,
        transparent 0px, transparent 3px,
        rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px
      );
    background-color: rgba(5,5,16,0.95);
  }

  .appnav-logo {
    font-family: 'Bangers', cursive;
    font-size: 1.35rem;
    color: #00E5FF;
    text-decoration: none;
    letter-spacing: 3px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    text-shadow: 0 0 16px rgba(0,229,255,0.4);
    transition: text-shadow 0.15s;
  }
  .appnav-logo:hover {
    text-shadow: 0 0 28px rgba(0,229,255,0.7);
  }

  .appnav-links {
    display: flex;
    align-items: center;
    gap: 0;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .appnav-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(240,240,245,0.4);
    text-decoration: none;
    padding: 0.4rem 1rem;
    transition: color 0.15s;
    position: relative;
  }
  .appnav-link::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 50%; right: 50%;
    height: 2px;
    background: #00E5FF;
    transition: left 0.15s, right 0.15s;
  }
  .appnav-link:hover {
    color: rgba(240,240,245,0.8);
  }
  .appnav-link:hover::after {
    left: 1rem; right: 1rem;
  }
  .appnav-link.active {
    color: #00E5FF;
  }
  .appnav-link.active::after {
    left: 1rem; right: 1rem;
  }

  .appnav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .appnav-user {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(0,229,255,0.5);
    border: 1px solid rgba(0,229,255,0.2);
    padding: 0.3rem 0.85rem;
    clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));
  }

  .appnav-signout {
    color: rgba(240,240,245,0.25);
    background: none;
    border: none;
    width: 28px;
    height: 28px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }
  .appnav-signout:hover {
    color: rgba(240,240,245,0.7);
  }

  .appnav-hardness {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    letter-spacing: 2px;
    color: rgba(0,229,255,0.6);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .appnav-hardness-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(0,229,255,0.3);
  }

  .appnav-hamburger {
    display: none;
    background: none;
    border: none;
    color: rgba(240,240,245,0.6);
    cursor: pointer;
    padding: 0.3rem;
  }

  @media (max-width: 768px) {
    .appnav { padding: 0 1rem; }
    .appnav-links {
      display: none;
      position: fixed;
      top: 56px;
      left: 0;
      right: 0;
      background: rgba(5,5,16,0.98);
      border-bottom: 1px solid rgba(0,229,255,0.12);
      flex-direction: column;
      padding: 0.5rem 0;
      gap: 0;
      backdrop-filter: blur(16px);
    }
    .appnav-links.open { display: flex; }
    .appnav-link {
      width: 100%;
      padding: 0.85rem 1.5rem;
      border-bottom: 1px solid rgba(0,229,255,0.06);
    }
    .appnav-link::after { display: none; }
    .appnav-hamburger { display: block; }
    .appnav-user { display: none; }
  }
`

// Lore-correct navigation — The Sous's vocabulary
const NAV_ITEMS = [
  { to: '/shed',   label: 'The Shed'   },
  { to: '/mise',   label: 'The Mise'   },
  { to: '/pit',    label: 'The Pit'    },
  { to: '/molts',  label: 'The Molts'  },
  { to: '/ledger', label: 'The Ledger' },
  { to: '/demo',   label: 'Demo'       },
] as const

// Routes where the landing page supplies its own nav — suppress AppNav
const ROUTES_WITH_OWN_NAV = ['/']

export function AppNav() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const upsertPlayer = useMutation(api.players.upsertPlayer)

  useEffect(() => {
    if (isAuthenticated) {
      upsertPlayer({}).catch(() => {})
    }
  }, [isAuthenticated])

  const { data: player } = useQuery({
    ...convexQuery(api.players.getCurrent, {}),
    enabled: isAuthenticated,
  })

  // Landing page has its own nav — don't double-stack
  if (ROUTES_WITH_OWN_NAV.includes(location.pathname)) return null

  // Not logged in — no nav (sign-in page handles its own state)
  if (!isAuthenticated) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_STYLES }} />
      <nav className="appnav">
        <Link to="/" className="appnav-logo">
          THE MOLT PIT
        </Link>

        <button
          className="appnav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <ul className={`appnav-links${menuOpen ? ' open' : ''}`}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.to)
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
          <button
            className="appnav-signout"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Leave The Brine"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>
    </>
  )
}
