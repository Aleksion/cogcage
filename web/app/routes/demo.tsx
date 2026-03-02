import { createFileRoute } from '@tanstack/react-router'
import PlayableDemo from '~/components/PlayableDemo'

export const Route = createFileRoute('/demo')({
  head: () => ({
    meta: [
      { title: 'Playable Demo - CogCage' },
      {
        name: 'description',
        content: 'Playable turn-gated demo with movement, action economy, and energy spend.',
      },
    ],
  }),
  component: PlayableDemo,
})

