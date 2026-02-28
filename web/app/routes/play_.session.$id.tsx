import { createFileRoute, useSearch } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import { SessionPageWrapper } from '~/components/SessionPageWrapper'

export const Route = createFileRoute('/play_/session/$id')({
  validateSearch: (search: Record<string, unknown>) => ({
    pid: (search.pid as string) || '',
  }),
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Session' },
      { name: 'description', content: 'FFA Tournament Session' },
    ],
  }),
  component: SessionPage,
})

function SessionPage() {
  const { id } = Route.useParams()
  const { pid } = useSearch({ from: '/play/session/$id' })
  return (
    <ClientOnly>
      {() => <SessionPageWrapper sessionId={id} participantId={pid} />}
    </ClientOnly>
  )
}
