import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { ClientOnly } from '~/components/ClientOnly'
import ThePit from '~/components/ThePit'
import DemoLoop from '~/components/DemoLoop'

export const Route = createFileRoute('/play')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — The Pit' },
      {
        name: 'description',
        content:
          'The Pit — live arena lobby. Enter a molt, climb the leaderboard.',
      },
    ],
  }),
  component: PlayPage,
})

function PlayPageInner() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#050510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
      }}>
        ENTERING THE BRINE...
      </div>
    )
  }

  // Pre-auth: show the demo loop
  if (!isAuthenticated) {
    return <DemoLoop />
  }

  return <ThePit />
}

function PlayPage() {
  return <ClientOnly>{() => <PlayPageInner />}</ClientOnly>
}
