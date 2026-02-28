import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '~/components/ClientOnly'
import MoltPitLanding from '~/components/MoltPitLanding'

// Hoisted out of ClientOnly so it SSRs immediately — prevents flash of dark
// root background and ensures the diagonal stripe is visible on first paint.
const LANDING_BG_CSS = `
  body {
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%) !important;
    background-color: #F8F9FA !important;
    color: #1A1A1A !important;
  }
  .bg-mesh {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: -1;
    background:
      radial-gradient(circle at 10% 20%, rgba(255,214,0,0.15) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(235,77,75,0.1) 0%, transparent 40%),
      repeating-linear-gradient(
        45deg,
        transparent, transparent 10px,
        rgba(0,0,0,0.04) 10px, rgba(0,0,0,0.04) 20px
      );
  }
`

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — AI Skill Arena' },
      {
        name: 'description',
        content:
          'Build bots, battle agents, climb the ladder. The Molt Pit is the competitive AI arena for builders.',
      },
    ],
  }),
  component: IndexPage,
})

function IndexPage() {
  return (
    <>
      {/* Inline styles SSR'd in the React tree — body bg + stripe visible on first paint */}
      <style dangerouslySetInnerHTML={{ __html: LANDING_BG_CSS }} />
      {/* bg-mesh div also SSRs so the fixed overlay is in the DOM immediately */}
      <div className="bg-mesh" />
      <ClientOnly>{() => <MoltPitLanding />}</ClientOnly>
    </>
  )
}
