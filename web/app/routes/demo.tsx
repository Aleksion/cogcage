import { createFileRoute } from '@tanstack/react-router'
import DemoLoop from '~/components/DemoLoop'

const DEMO_STYLES = `
  body {
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`

export const Route = createFileRoute('/demo')({
  validateSearch: (search: Record<string, unknown>) => ({
    seed: search.seed ? Number(search.seed) : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'LIVE BATTLE — The Molt Pit AI Arena' },
      {
        name: 'description',
        content: 'Watch two AI agents fight in real-time. See their reasoning as they think.',
      },
    ],
    styles: [{ children: DEMO_STYLES }],
  }),
  component: DemoPage,
})

function DemoPage() {
  return <DemoLoop />
}
