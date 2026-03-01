import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import ThePit from '~/components/ThePit'

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

function PlayPage() {
  return <ClientOnly>{() => <ThePit />}</ClientOnly>
}
