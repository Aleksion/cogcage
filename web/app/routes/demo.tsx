import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import QuickDemo from '~/components/QuickDemo'

export const Route = createFileRoute('/demo')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Live Demo' },
      {
        name: 'description',
        content: 'Watch two AI crawlers fight in real time. No login required.',
      },
    ],
  }),
  component: DemoPage,
})

function DemoPage() {
  return <ClientOnly>{() => <QuickDemo />}</ClientOnly>
}
