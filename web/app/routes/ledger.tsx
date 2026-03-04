import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import { OpsLogPage } from '~/components/OpsLogPage'

export const Route = createFileRoute('/ledger')({
  head: () => ({
    meta: [{ title: 'The Molt Pit — Ledger' }],
  }),
  component: OpsLogRoute,
})

function OpsLogRoute() {
  return <ClientOnly>{() => <OpsLogPage />}</ClientOnly>
}
