import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import { SuccessPage as SuccessPageContent } from '~/components/SuccessPage'

export const Route = createFileRoute('/success')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Founder Spot Confirmed' },
      {
        name: 'description',
        content:
          'Your Molt Pit Founder checkout is complete. Next steps for alpha access inside.',
      },
    ],
  }),
  component: SuccessRoutePage,
})

function SuccessRoutePage() {
  return <ClientOnly>{() => <SuccessPageContent />}</ClientOnly>
}
