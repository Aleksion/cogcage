import { createFileRoute, useSearch, Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { ClientOnly } from '~/components/ClientOnly'
import Armory from '~/components/Armory'

export const Route = createFileRoute('/shell')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: (search.returnTo as string) || '',
  }),
  head: () => ({
    meta: [
      { title: 'The Molt Pit — The Shell' },
      {
        name: 'description',
        content: 'Build your loadout. Choose weapons, armor, and tools for the arena.',
      },
    ],
  }),
  component: ShellPage,
})

const SHELL_GATE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:wght@400;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
  .shell-gate {
    min-height: 60vh;
    background: #1A1A1A;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    font-family: 'Kanit', sans-serif;
  }
  .shell-gate-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #FFD600;
    margin: 0 0 0.6rem;
  }
  .shell-gate-title {
    font-family: 'Bangers', cursive;
    font-size: 2.6rem;
    letter-spacing: 2px;
    color: #fff;
    margin: 0 0 0.5rem;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
  }
  .shell-gate-sub {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.4);
    max-width: 340px;
    margin: 0 auto 2rem;
    line-height: 1.5;
  }
  .shell-gate-gh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.85rem 2rem;
    font-family: 'Kanit', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #fff;
    background: #EB4D4B;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .shell-gate-gh-btn:hover { background: #d93a38; transform: translateY(-1px); }
  .shell-gate-more {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.25);
    text-decoration: none;
    font-family: 'Kanit', sans-serif;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .shell-gate-more:hover { color: rgba(255,255,255,0.5); }
`

function ShellAuthGate({ returnTo }: { returnTo: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
          Loading...
        </span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: SHELL_GATE_STYLES }} />
        <div className="shell-gate">
          <div className="shell-gate-eyebrow">Access Restricted</div>
          <h2 className="shell-gate-title">BUILD YOUR CRAWLER</h2>
          <p className="shell-gate-sub">
            Sign in to save your shells and take them into the arena.
          </p>
          <button className="shell-gate-gh-btn" onClick={() => void signIn('github')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
          <Link to="/sign-in" className="shell-gate-more">More sign-in options →</Link>
        </div>
      </>
    )
  }

  return <Armory returnTo={returnTo} />
}

function ShellPage() {
  const { returnTo } = useSearch({ from: '/shell' })
  return <ClientOnly>{() => <ShellAuthGate returnTo={returnTo} />}</ClientOnly>
}
