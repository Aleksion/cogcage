import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import { OpsLogPage } from '~/components/OpsLogPage'

export const Route = createFileRoute('/ops-log')({
  head: () => ({
    meta: [{ title: 'The Molt Pit Ops Log' }],
  }),
  component: OpsLogRoute,
})

function OpsLogRoute() {
  return <ClientOnly>{() => <OpsLogPage />}</ClientOnly>
}
