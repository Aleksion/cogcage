import { createFileRoute, useSearch } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import Armory from '~/components/Armory'

export const Route = createFileRoute('/shell')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: (search.returnTo as string) || '',
  }),
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Armory' },
      {
        name: 'description',
        content:
          'Build your loadout. Choose weapons, armor, and tools for the arena.',
      },
    ],
  }),
  component: ShellPage,
})

function ShellPage() {
  const { returnTo } = useSearch({ from: '/shell' })
  return <ClientOnly>{() => <Armory returnTo={returnTo} />}</ClientOnly>
}
