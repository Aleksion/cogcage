# TASK WS9 — The Pit + First-Time Flow

## Context
CogCage is an AI agent battle game. Players build crawlers (LLM agents with card loadouts + a directive prompt), then fight them in 1v1 Molts.

The game uses Convex for real-time data. Auth is Convex Auth. TanStack Router for routing.

## Objective
Fix the first-time user experience and make `/play` the actual arena lobby ("The Pit").

---

## Problem 1: `/forge` shows hardcoded DREADCLAW

`web/app/routes/forge.tsx` currently hardcodes:
- Crawler name: "DREADCLAW"
- Stats: Aggression 82%, Armor 65%, Compute Speed 88%

These are fake. Every user sees the same fake crawler on their dashboard.

**Fix:**
1. Add `useQuery(convexQuery(api.shells.list, {}))` (enabled: isAuthenticated)
2. Take `shells[0]` as the "active" shell (first saved shell)

**If shell exists (shells.length > 0):**
- Show `shell.name` instead of "DREADCLAW"
- Remove "Active Mold: Default" — replace with `shell.cards.length` cards equipped
- Show card icons: `shell.cards.slice(0, 6).map(cardId => getCard(cardId)?.icon ?? '?')`
- Stats — compute from shell.stats:
  - **ATTACK**: `Math.round(Math.min(100, (shell.stats.totalWeight / 24) * 100))`
  - **ARMOR**: `shell.stats.armorValue` (already 0-100)
  - **COMPUTE**: `Math.round(Math.max(0, 100 - (shell.stats.totalOverhead / 30) * 100))`
- Stat bar colors: Attack=#EB4D4B, Armor=#FFD600, Compute=#00E5FF
- "FIND A MOLT" → `/play`, "EDIT MOLD" → `/shell`

**If no shell (shells.length === 0 or shells is empty):**
Replace the left panel entirely with:
```
[ big robot emoji — 🤖 ]

FORGE YOUR CRAWLER

No crawler yet. Build your first
shell to enter the pit.

[ BIG CTA: ⚡ BUILD YOUR CRAWLER → /shell ]
```
Style this the same as the panel — `forge-panel`, thick border, arcade energy.
The CTA button should be the arcade style: yellow bg, black border, 6px hard shadow.

**Note:** Import `getCard` from `~/lib/cards` — it already exists.

---

## Problem 2: `/play` is dead — renders old Dashboard.tsx

`web/app/routes/play.tsx` currently renders `Dashboard` which is the old stale component. This should be **THE PIT** — the live arena lobby.

### Create: `web/app/components/ThePit.tsx`

The Pit is what players see when they want to fight. Think: UFC pre-fight lobby. Energy. Action. One big CTA.

**Requirements:**

#### Auth guard
Same as forge.tsx — check `useConvexAuth()`, if not auth'd redirect to `/sign-in?returnTo=/play`.

#### Data
```ts
const { data: topPlayers } = useQuery({ ...convexQuery(api.ladder.getTopPlayers, { limit: 10 }), enabled: isAuthenticated })
const { data: openTanks } = useQuery({ ...convexQuery(api.tanks.listOpen, {}), enabled: isAuthenticated })
const { data: player } = useQuery({ ...convexQuery(api.players.getCurrent, {}), enabled: isAuthenticated })
const { data: shells } = useQuery({ ...convexQuery(api.shells.list, {}), enabled: isAuthenticated })
const createTank = useMutation(api.tanks.create)
const navigate = useNavigate()
```

#### Layout (full width, max-width 900px centered)

**Header section:**
```
⚡ THE PIT

[subtitle: "The arena. Live matches. Real crawlers fighting now."]
```
- "⚡ THE PIT": Bangers, 4rem, color: #FFD600, text-shadow: 4px 4px 0 #000
- Subtitle: Kanit 800, 1rem, color: rgba(255,255,255,0.5)

**ENTER A MOLT button (below header):**
```
[ ⚡ ENTER A MOLT ]
```
- Full width up to 400px
- Arcade style: background #EB4D4B, color #fff, Bangers 2rem, border: 4px solid #000, box-shadow: 0 6px 0 #000
- On active: translateY(6px), box-shadow none
- On click:
  ```ts
  const handleEnterMolt = async () => {
    if (!shells || shells.length === 0) {
      navigate({ to: '/shell' })
      return
    }
    setEntering(true)
    try {
      const tankId = await createTank({ hostShellId: shells[0]._id })
      navigate({ to: `/tank/${tankId}` })
    } catch (e) {
      setEnterError('Could not create tank. Try again.')
      setEntering(false)
    }
  }
  ```
- If `entering`: show "ENTERING..." (disabled)
- If no shells: button text "BUILD A CRAWLER FIRST →", navigates to `/shell`

**Two-column grid below the CTA (768px breakpoint → stack):**

**LEFT: LEADERBOARD**
Section title: "LEADERBOARD" in Bangers 2rem, text-shadow orange.
Show top 10 players:
```
# RANK  NAME          HARDNESS
1       SKULLCRUSHER  1842
2       IRONVEIL      1763
...
```
Each row:
- Rank number: Bangers, color #FFD600
- Name: Kanit 800, color #fff
- Hardness: IBM Plex Mono, color #00E5FF
- Row bg: rgba(255,255,255,0.03), border-bottom: 1px solid rgba(255,255,255,0.05)
- Highlight current player's row with: background rgba(255,214,0,0.08), border-left: 3px solid #FFD600

If no players yet: `<div style={{color:'rgba(255,255,255,0.3)',fontFamily:'IBM Plex Mono',padding:'1rem 0',fontSize:'0.85rem'}}>No players yet</div>`

**RIGHT: OPEN TANKS**
Section title: "OPEN TANKS" in Bangers 2rem, text-shadow orange.
Show waiting tanks:
- Each tank: "Tank #XYZ" (last 4 of ID) + JOIN button
- JOIN button: cyan bg #00E5FF, color #000, Bangers, border 2px solid #000, box-shadow 2px 2px 0 #000
- On join click: `navigate({ to: '/tank/${tank._id}' })`
- If no open tanks: "No open tanks — be first!" in empty style

**Panels:** Both columns wrapped in `.pit-panel` (border: 3px solid #000; box-shadow: 6px 6px 0 #000; background: rgba(255,255,255,0.03); border-radius: 14px; padding: 1.5rem)

**Full inline styles** — same pattern as other components (inject via `<style dangerouslySetInnerHTML>` with unique class names prefixed `pit-`).

#### Update `web/app/routes/play.tsx`
Replace `Dashboard` import with `ThePit`:
```tsx
import ThePit from '~/components/ThePit'
// ...
function PlayPage() {
  return <ClientOnly>{() => <ThePit />}</ClientOnly>
}
```

---

## Problem 3: AppNav "Cage" label

In `web/app/components/AppNav.tsx`, the NAV_ITEMS array has:
```ts
{ to: '/play', label: 'Cage' },
```

Change label to:
```ts
{ to: '/play', label: 'The Pit' },
```

---

## Problem 4: Armory save doesn't redirect

In `web/app/components/Armory.tsx`, find the save handler. After a successful save (when `shellId` comes back from the mutation), redirect to `/play`:

Find the save logic and after success add:
```ts
import { useNavigate } from '@tanstack/react-router'
// in component:
const navigate = useNavigate()
// after successful save:
navigate({ to: '/play' })
```

Only redirect on FIRST save (i.e., if there were previously 0 shells). If editing an existing shell, stay on page. Check: `if (savedShells.length === 0) navigate({ to: '/play' })`

---

## Import notes

- `getCard` is at `~/lib/cards` — already imported in Armory.tsx, can copy that pattern
- Convex API: `import { api } from '../../convex/_generated/api'`
- Convex hooks: `import { useConvexAuth, useMutation } from 'convex/react'`
- TanStack query: `import { useQuery } from '@tanstack/react-query'`
- Convex query adapter: `import { convexQuery } from '@convex-dev/react-query'`
- Navigate: `import { useNavigate } from '@tanstack/react-router'`

The `api.tanks.create` mutation takes `{ hostShellId: Id<"shells"> }` — confirmed from `convex/tanks.ts`.

---

## What NOT to change
- Game engine, match logic, Convex schema
- The landing page (`MoltPitLanding.jsx`)
- Other routes not mentioned
- Auth flow

---

## Build & Ship

1. `npm --prefix web run build` — must pass zero errors
2. `git add -A && git commit -m "feat(ws9): The Pit arena lobby + fix forge real crawler data + first-time flow"`
3. `git push origin feat/ws9-the-pit`
4. `openclaw system event --text "Done: WS9 The Pit + first-time flow pushed to feat/ws9-the-pit" --mode now`

## Files to edit (in order)
1. `web/app/routes/forge.tsx` — load real shell, first-time state
2. `web/app/components/ThePit.tsx` — CREATE new file
3. `web/app/routes/play.tsx` — swap Dashboard → ThePit
4. `web/app/components/AppNav.tsx` — rename "Cage" → "The Pit"
5. `web/app/components/Armory.tsx` — redirect after first save
