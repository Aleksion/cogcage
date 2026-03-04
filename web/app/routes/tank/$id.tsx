import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import Lobby from '~/components/Lobby'

export const Route = createFileRoute('/tank/$id')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Scuttle' },
      {
        name: 'description',
        content:
          'Waiting in the scuttle dock. Tune your crustie and start the molt.',
      },
    ],
  }),
  component: TankPage,
})

function TankPage() {
  const { id } = Route.useParams()
  return <ClientOnly>{() => <Lobby lobbyId={id} />}</ClientOnly>
}
