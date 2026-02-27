import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import MoltPitLanding from '~/components/MoltPitLanding'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — AI Skill Arena' },
      {
        name: 'description',
        content:
          'Build bots, battle agents, climb the ladder. The Molt Pit is the competitive AI arena for builders.',
      },
    ],
  }),
  component: IndexPage,
})

function IndexPage() {
  return <ClientOnly>{() => <MoltPitLanding />}</ClientOnly>
}
