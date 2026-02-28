import { createFileRoute } from '@tanstack/react-router'
import MoltPitLanding, { globalStyles } from '~/components/MoltPitLanding'

/**
 * Landing page body + bg-mesh override styles.
 * These come AFTER globalStyles in the same <style> block.
 * We use !important to beat the dark __root.tsx body rule.
 */
const LANDING_OVERRIDE_CSS = `
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
    pointer-events: none;
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

// Merge into one <style> block so @import stays at the very top (required by CSS spec)
const ALL_LANDING_STYLES = globalStyles + '\n' + LANDING_OVERRIDE_CSS

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
    // TanStack Start renders these as <style> tags inside <head> via HeadContent.
    // SSR'd on first paint → zero FOUC. The @import for Google Fonts comes from
    // globalStyles and must stay at the top of the CSS string.
    styles: [{ children: ALL_LANDING_STYLES }],
  }),
  component: IndexPage,
})

function IndexPage() {
  return (
    <>
      {/* bg-mesh renders server-side — diagonal stripe is visible before JS hydrates */}
      <div className="bg-mesh" />
      {/* MoltPitLanding is SSR-safe: all localStorage/window calls are in useEffect.
          No ClientOnly wrapper needed — removing it eliminates the content-load FOUC. */}
      <MoltPitLanding />
    </>
  )
}
