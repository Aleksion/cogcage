/**
 * AuthButton — global auth state widget.
 * Shows Sign In link when unauthenticated, username + Sign Out when authenticated.
 * Client-only (Convex auth requires browser context).
 */
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

export function AuthButton({ className }: { className?: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()

  // Get player username once authenticated
  const { data: player } = useQuery({
    ...convexQuery(api.players.getCurrent, {}),
    enabled: isAuthenticated,
  })

  if (isLoading) return null

  if (!isAuthenticated) {
    return (
      <Link
        to="/sign-in"
        className={className}
        style={{
          display: 'inline-block',
          padding: '0.5rem 1.1rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '6px',
          textDecoration: 'none',
          letterSpacing: '0.02em',
          transition: 'background 0.15s',
        }}
      >
        Sign In
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {player?.username && (
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          {player.username}
        </span>
      )}
      <button
        onClick={() => void signOut()}
        style={{
          padding: '0.4rem 0.9rem',
          fontSize: '0.85rem',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.6)',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Sign Out
      </button>
    </div>
  )
}
