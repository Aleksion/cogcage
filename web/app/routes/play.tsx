import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import Dashboard from '~/components/Dashboard'

export const Route = createFileRoute('/play')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Play' },
      {
        name: 'description',
        content:
          'Battle AI bots in The Molt Pit. Build your strategy, earn your rank.',
      },
    ],
  }),
  component: PlayPage,
})

function PlayPage() {
  return <ClientOnly>{() => <Dashboard />}</ClientOnly>
}
