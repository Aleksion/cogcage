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

function ShellAuthGate({ returnTo }: { returnTo: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#888' }}>Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
          Sign in to build your crawler
        </h2>
        <p style={{ color: '#888', maxWidth: 360, margin: 0 }}>
          Your shells are saved to your account. Sign in to save, edit, and take them into the arena.
        </p>
        <button
          onClick={() => void signIn('github')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.75rem',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#fff',
            backgroundColor: '#24292e',
            border: '1px solid #555',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Sign in with GitHub
        </button>
        <Link
          to="/sign-in"
          style={{ fontSize: '0.9rem', color: '#8a8fff', textDecoration: 'underline' }}
        >
          Other sign-in options
        </Link>
        <Link to="/" style={{ fontSize: '0.85rem', color: '#666' }}>← Back</Link>
      </div>
    )
  }

  return <Armory returnTo={returnTo} />
}

function ShellPage() {
  const { returnTo } = useSearch({ from: '/shell' })
  return <ClientOnly>{() => <ShellAuthGate returnTo={returnTo} />}</ClientOnly>
}
