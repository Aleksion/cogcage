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
  head: () => ({
    meta: [
      { title: 'The Molt Pit — Playable Demo Loop' },
      {
        name: 'description',
        content: 'Playable AI arena demo with map movement and action economy.',
      },
    ],
    styles: [{ children: DEMO_STYLES }],
  }),
  component: DemoPage,
})

function DemoPage() {
  return <DemoLoop />
}
