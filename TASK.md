# Task: The Forge + Persistent Nav + Bot Fix

Branch: `feat/forge-nav` off `main`
Repo: https://github.com/Aleksion/themoltpit.git
Stack: TanStack Start + TanStack Router + Convex + Nitro (Vercel preset)
Working dir: this repo (web/ subdirectory has the app)

Read `docs/app-ux-spec-v1.md` first — this is the design spec. Follow it precisely.

---

## P0 — Persistent Top Nav (do this FIRST)

Add a persistent authenticated nav bar to all authed routes. It should appear on `/forge`, `/shell`, `/play`, `/molds` (new), `/cage` (new), `/ladder` (new).

Nav spec from `docs/app-ux-spec-v1.md`:
```
[⚡ THE MOLT PIT]   FORGE    MOLDS    CAGE    LADDER    GUIDE    [avatar / credits 420 CR]
```

Implementation:
- Create `web/app/components/AppNav.tsx` — the persistent nav component
- Style: dark #1A1A1A background, yellow `#FFD600` active item, Kanit font, sticky top-0 z-50
- Logo links to `/forge` (or `/` if not logged in)
- Show avatar/sign-out if authenticated (use `useConvexAuth` + `useCurrentUser` from Convex)
- On mobile: hamburger menu or condensed icon-only nav
- Add `<AppNav />` to `__root.tsx` or create a layout route for authed pages

## P0 — The Forge Route (`/forge`)

Create `web/app/routes/forge.tsx` — the home dashboard for authenticated users.

Spec from `docs/app-ux-spec-v1.md` Screen 1. Key elements:
1. **Welcome header**: "WELCOME BACK, [username]" + CR balance
2. **Crawler preview panel** (left): Placeholder bot art (can be CSS/emoji for now), crawler name, active mold name, 3 stat bars (AGGRESSION, ARMOR, COMPUTE SPEED)
3. Two CTAs: `⚡ FIND A MOLT` (red, goes to `/cage`) + `✏️ EDIT MOLD` (goes to `/shell`)
4. **Quick Stats** (top right): Total Molts, Win%, Rank — pull from Convex `players` table
5. **Recent Molts feed**: Last 5 molts from Convex — can be empty/placeholder if no data
6. **Active Tanks strip**: Query Convex `tanks` table for open/waiting tanks, show [JOIN] buttons

Auth gate: if not authenticated → redirect to `/sign-in?returnTo=/forge`

After login, redirect user to `/forge` (not `/shell`). Update `sign-in.tsx`: change `navigate({ to: '/shell' })` → `navigate({ to: '/forge' })`. Also update `shell.tsx` auth gate to link to `/forge` on success.

## P1 — Bot Convergence Fix

File: `web/app/lib/ws2/bots.ts`

The scripted AI fallback currently idles when LLM is slow. Fix it to pathfind toward the opponent.

Find the `getScriptedAction` (or equivalent) function. Replace the fallback with:
```typescript
// If no LLM decision available, pathfind toward opponent
function getConvergenceAction(myPos: Position, enemyPos: Position, myEnergy: number): AgentAction {
  if (myEnergy < 4) return { type: 'WAIT' }
  const dx = enemyPos.x - myPos.x
  const dy = enemyPos.y - myPos.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  // Move toward enemy
  if (absDx >= absDy) {
    return { type: 'MOVE', dir: dx > 0 ? 'E' : 'W' }
  } else {
    return { type: 'MOVE', dir: dy > 0 ? 'S' : 'N' }
  }
}
```

Integrate this into the fallback path in the match runner / bot decision loop.

## P1 — Engineering Telemetry on Post-Molt

File: `web/app/components/MatchView.tsx` (or wherever the post-match result is shown)

After a match ends, show the engineering telemetry panel (per spec Screen 7):

```
ENGINEERING TELEMETRY
Bot A                           Bot B
Avg latency:  89ms              Avg latency:  312ms
Tokens/dec:   22                Tokens/dec:   187
Ticks missed: 0                 Ticks missed: 8
```

The match runner already collects events. Calculate:
- **Avg latency**: average ms between LLM request and response per decision
- **Tokens/decision**: average tokens used per LLM call (from API response)
- **Ticks missed**: number of ticks where no valid action was received in time

Add these to the match result object and display in the result overlay.

---

## Build & Test

```bash
cd web
npm run build
```

Build must pass clean. No TypeScript errors.

## Commit & Push

```bash
git add -A
git commit -m "feat(forge): Forge home + persistent nav + bot convergence + telemetry"
git push origin feat/forge-nav
```

Then create PR to main.

---

## Style Rules (non-negotiable)
- Colors: `#FFD600` yellow, `#EB4D4B` red, `#00E5FF` cyan, `#1A1A1A` dark
- Fonts: Bangers (headers), Kanit (body), IBM Plex Mono (stats/mono)
- Fonts are loaded in `__root.tsx` via `<link>` tags — do NOT add `@import` in CSS strings
- Thick black borders (2-3px solid #000), hard drop shadows (`6px 6px 0 #000`), neo-brutalist feel
- All interactive elements feel tactile (box-shadow gives 3D depth)
