import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import { JoinSession } from '~/components/JoinSession'

export const Route = createFileRoute('/join/$code')({
  head: () => ({
    meta: [{ title: 'The Molt Pit — Join Session' }],
  }),
  component: JoinPage,
})

function JoinPage() {
  const { code } = Route.useParams()
  return <ClientOnly>{() => <JoinSession code={code.toUpperCase()} />}</ClientOnly>
}
