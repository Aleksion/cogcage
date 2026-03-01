import { createFileRoute } from '@tanstack/react-router'
import MoltPitLanding, { globalStyles } from '~/components/MoltPitLanding'
import { battleHeroStyles } from '~/components/BattleHero'

/**
 * Landing page body override styles.
 * Mesh gradients baked directly into body background — avoids z-index:-1 div
 * being painted behind body's own background (CSS stacking context gotcha).
 * !important beats the dark #1A1A1A rule in __root.tsx.
 */
const LANDING_OVERRIDE_CSS = `
  body {
    background:
      radial-gradient(circle at 10% 20%, rgba(255,214,0,0.18) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(235,77,75,0.12) 0%, transparent 40%),
      repeating-linear-gradient(
        45deg,
        transparent, transparent 10px,
        rgba(0,0,0,0.035) 10px, rgba(0,0,0,0.035) 20px
      ),
      linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%) !important;
    color: #1A1A1A !important;
  }
`

// Merged into one <style> block — @import removed (fonts are in __root.tsx <link> tags)
const ALL_LANDING_STYLES = globalStyles + '\n' + LANDING_OVERRIDE_CSS + '\n' + battleHeroStyles

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
      {/* MoltPitLanding is SSR-safe: all localStorage/window calls are in useEffect.
          No ClientOnly wrapper needed — removing it eliminates the content-load FOUC.
          Mesh background is baked into body via LANDING_OVERRIDE_CSS (no z-index div needed). */}
      <MoltPitLanding />
    </>
  )
}
