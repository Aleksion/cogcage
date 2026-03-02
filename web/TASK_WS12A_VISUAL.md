# TASK WS12A — Visual Iteration with agent-browser

**YOU MUST SEE WHAT YOU BUILD. Do not push until screenshots confirm it looks right.**

## The Loop (mandatory)
1. Start the dev server
2. Take a screenshot
3. Fix what looks wrong
4. Screenshot again
5. Repeat until all screens look like the targets below
6. THEN commit and push

---

## Setup

```bash
# Start dev server in background
cd /Users/thealeks/clawd-engineer/projects/cogcage/worktrees/ws12a-game-ui-overhaul/web
npm run dev &
sleep 5

# Verify it's running
agent-browser open http://localhost:4321
agent-browser screenshot --full /tmp/landing.png
```

Dev server runs on port **4321** (Vite default for TanStack Start).
If port 4321 doesn't respond, try 3000 or check `npm run dev` output for the actual port.

---

## What Exists (built by previous blind agent — needs visual review + iteration)

The previous agent touched these files. Review what was actually built vs the targets:
- `web/app/routes/__root.tsx` — diagonal stripe removed from body
- `web/app/components/AppNav.tsx` — HUD strip, scanlines, cyan pills
- `web/app/components/ThePit.tsx` — arena bg, spotlight, HUD panel
- `web/app/routes/forge.tsx` — ember lair bg, warm panels

**Start by screenshotting each page. Then compare to targets. Fix gaps.**

---

## Auth Redirect Problem

`/forge` and `/play` redirect to `/sign-in` if unauthenticated.
To preview authenticated screens without logging in, check the route guard:
- Look in `forge.tsx` route — there's likely a `useConvexAuth()` redirect
- Temporarily comment out the redirect (replace with a `TODO` comment) just for visual dev, then restore it before committing

OR take screenshots of `/sign-in` first — that page also needs the overhaul.

---

## Target Visuals

### AppNav (visible on all authenticated pages)
- Background: `#000` with faint horizontal scanline texture (`repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px), #000`)
- Bottom border: `1px solid rgba(0,229,255,0.25)` (NOT the old yellow `3px solid #FFD600`)
- Nav links: pill shape, `border-radius: 999px`
  - Default: `color: rgba(255,255,255,0.5)`, transparent bg
  - Hover: `background: rgba(255,255,255,0.07)`
  - **Active: solid `background: #00E5FF`, `color: #000`** — must be a filled cyan capsule
- Sign-out: icon only (door/arrow SVG), no text, `20px × 20px`
- Screenshot check: active nav item should be a filled cyan pill — not an underline, not yellow

### ThePit (`/play` when auth bypassed)
- Background: dark blue-black `radial-gradient(ellipse at 50% 30%, #0a0a2e 0%, #050510 60%, #000 100%)`
- Dot grid overlay: `radial-gradient(circle, rgba(0,229,255,0.08) 1px, transparent 1px)`, `24px 24px`
- NO max-width box — content fills viewport width, centered via flexbox
- Title glows with a cyan spotlight circle behind it
- Fixed lower-left HUD panel with cyan border: `position: fixed; bottom: 2rem; left: 2rem;`
- Enter button is **cyan** (`#00E5FF`, black text), not red
- Screenshot check: should look like a dark arena with cyan accents, not a generic dark website

### Forge (`/forge` when auth bypassed)
- Background: deep ember `radial-gradient(ellipse at 30% 60%, #2a1000 0%, #120800 50%, #0a0500 100%)`
- Ember grid: `radial-gradient(circle, rgba(255,120,30,0.07) 1px, transparent 1px)`, `32px 32px`
- NO max-width box — full viewport width
- Panel cards have amber borders: `1px solid rgba(255,120,30,0.2)`, warm bg `rgba(255,120,30,0.05)`
- Bot art area has a warm glow behind it
- Screenshot check: should feel warm/dark lair, not generic dark gray

### Sign-in (`/sign-in`)
- Background: same as ThePit (dark arena radial blue-black)
- Card: `background: rgba(0,0,0,0.7)`, `border: 1px solid rgba(0,229,255,0.25)`, `backdrop-filter: blur(12px)`, `border-radius: 16px`
- "ENTER THE PIT" heading: `color: #fff`, Bangers font, `text-shadow: 0 0 30px rgba(0,229,255,0.4)`
- "PLAYER AUTH" label: IBM Plex Mono, tiny, cyan color `rgba(0,229,255,0.6)`
- GitHub button: white bg, black text, arcade border (`3px solid #000`, hard shadow `4px 4px 0 #000`)
- Magic link button: `background: #00E5FF`, black text, arcade border
- Screenshot check: should feel like entering a dark arena, not a generic SaaS login

---

## Iteration Workflow

```bash
# After each set of changes:
agent-browser open http://localhost:4321/sign-in
agent-browser screenshot --full /tmp/sign-in.png

# To view the forge (disable auth redirect temporarily):
# Find the redirect in forge.tsx — comment it out, then:
agent-browser open http://localhost:4321/forge
agent-browser screenshot --full /tmp/forge.png

# Annotated screenshot to see element refs:
agent-browser screenshot --annotate /tmp/nav-annotated.png
```

Take screenshots. Look at them. If it doesn't match the target, fix the CSS and screenshot again.
**Do not push until you've taken final screenshots and confirmed each screen looks right.**

---

## Final Screenshots (required before commit)

Before committing, take and save these screenshots:
```bash
agent-browser open http://localhost:4321/sign-in && agent-browser screenshot --full /tmp/ws12a-signin-final.png
agent-browser open http://localhost:4321/forge && agent-browser screenshot --full /tmp/ws12a-forge-final.png  
# (after temporarily bypassing auth)
```

---

## Commit

When visuals are confirmed:
```bash
# Kill dev server
kill $(lsof -ti:4321)

# Restore any auth redirects you disabled
# Then:
git add -A
git commit -m "feat(ws12a): visual-verified — HUD nav, arena pit, ember forge, arena sign-in"
git push origin feat/ws12a-game-ui-overhaul
# PR #38 already exists — the push will update it
```

---

## Color Reference
```
Arena dark:    #050510  (ThePit + sign-in bg)
Ember dark:    #120800  (Forge bg)
Cyan:          #00E5FF  (active state, magic link btn, HUD accents)
Yellow:        #FFD600  (logo, headings only — NOT nav active state)
Red:           #EB4D4B  (CTAs, GitHub btn not this)
```
