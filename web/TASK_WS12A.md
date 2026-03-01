# TASK WS12A — Game UI Overhaul: Full-Bleed Immersive Screens

**Branch:** `feat/ws12a-game-ui-overhaul`
**PR to:** `main`
**Goal:** Transform the flat, boxed app shell into full-bleed, atmosphere-rich game screens. Each screen owns its own visual world. No more generic dark container everywhere.

---

## Design Principles

- **Full-bleed**: No `max-width: 900px; margin: 0 auto` boxy containers. Screens fill the viewport edge-to-edge.
- **Atmospheric**: Each screen has its own background — ThePit is dark arena, Forge is warm ember lair. Background defined per-screen, not globally.
- **HUD-native**: Nav looks like a game HUD bar, not a website header.
- **Cyan = active**: Active state is a solid cyan `#00E5FF` pill, not an underline.
- **No global bg**: `__root.tsx` body background must be `transparent`/`none` — pages own their own backgrounds.

---

## Color Constants (already in :root, use these)

```
--c-yellow: #FFD600
--c-red:    #EB4D4B
--c-cyan:   #00E5FF
--c-dark:   #1A1A1A
--c-black:  #000000
```

Additional atmosphere colors to use inline (not in :root):
- Arena dark: `#050510` (ThePit bg)
- Forge ember: `#120800` (Forge bg)

---

## 1. `__root.tsx` — Remove global background

In the `RootDocument` component's inline `<style>`, change:
```css
html, body {
  background: #0D0D0D;
  background-image: repeating-linear-gradient(...); /* remove this */
}
```
To:
```css
html, body {
  margin: 0;
  width: 100%;
  min-height: 100%;
  background: #0D0D0D; /* keep this as fallback only */
  color: #f0f0f5;
}
```
Remove the `repeating-linear-gradient` diagonal stripe entirely. Pages own their backgrounds now.

---

## 2. `AppNav.tsx` — Game HUD Strip

Redesign the nav bar to feel like a game HUD, not a website header.

### Visual changes:
- **Background**: `#000` with a subtle 1px scanline texture overlay:
  ```css
  background: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0) 0px,
    rgba(0,0,0,0) 3px,
    rgba(255,255,255,0.03) 3px,
    rgba(255,255,255,0.03) 4px
  ), #000;
  ```
- **Border-bottom**: change from `3px solid #FFD600` to `1px solid rgba(0,229,255,0.25)` (cyan ghost line)
- **Logo**: keep as-is (Bangers, red, lightning bolt)
- **Nav items** → pill style:
  - Default: `color: rgba(255,255,255,0.5)`, `background: transparent`, `border-radius: 999px`, no border-bottom underline
  - Hover: `color: rgba(255,255,255,0.85)`, `background: rgba(255,255,255,0.07)`
  - **Active**: `color: #000`, `background: #00E5FF`, `font-weight: 800` — solid filled cyan pill
  - Remove all `border-bottom` underlines from nav links
  - Padding: `0.4rem 1rem`
- **Sign-out button**: Replace text "Sign Out" with an SVG exit/door icon only (no text label). Keep `onClick={() => void signOut()}`. Style: `color: rgba(255,255,255,0.3)`, `background: none`, `border: none`, size `24px×24px`, cursor pointer. On hover: `color: rgba(255,255,255,0.7)`.
  - SVG icon: simple door-with-arrow: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`

---

## 3. `ThePit.tsx` — Arena Full-Bleed

Replace the current boxed `max-width: 900px` layout with a full-viewport arena layout.

### Background:
```css
background: radial-gradient(ellipse at 50% 30%, #0a0a2e 0%, #050510 60%, #000 100%);
```
Add a subtle hex/dot grid overlay:
```css
background-image: radial-gradient(circle, rgba(0,229,255,0.08) 1px, transparent 1px);
background-size: 24px 24px;
```
Combine both as layered backgrounds on `.pit-root`.

### Layout:
- Remove `max-width: 900px; margin: 0 auto`
- Make `.pit-root` fill full viewport: `min-height: calc(100vh - 56px); width: 100%;`
- Content stays centered via flexbox: `display: flex; flex-direction: column; align-items: center; padding: 3rem 1.5rem 4rem`

### Crawler centerpiece:
- Add a large circular "arena spotlight" behind the title:
  ```css
  .pit-spotlight {
    width: 300px; height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%);
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
  ```
- Wrap the title + enter button in a `position: relative` container so spotlight sits behind

### Info panel (Fortnite lower-left style):
Add a fixed/absolute positioned stat block in the bottom-left corner of ThePit:
```css
.pit-hud-panel {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(0,229,255,0.3);
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: rgba(0,229,255,0.8);
  backdrop-filter: blur(8px);
  min-width: 160px;
  z-index: 10;
}
.pit-hud-label { color: rgba(255,255,255,0.4); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; }
.pit-hud-val { color: #00E5FF; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem; }
```
Render it with static placeholder values (or real player data if available):
```tsx
<div className="pit-hud-panel">
  <div className="pit-hud-label">Hardness</div>
  <div className="pit-hud-val">—</div>
  <div className="pit-hud-label">Molts</div>
  <div className="pit-hud-val">0</div>
</div>
```

### Enter button:
Keep the existing button logic but update style to use cyan instead of red:
```css
background: #00E5FF; color: #000; border: 4px solid #000; box-shadow: 0 6px 0 #000;
```
Text: keep as-is

---

## 4. `forge.tsx` — Lair Full-Bleed

Replace boxed `max-width: 1100px` with full-bleed warm lair atmosphere.

### Background:
```css
background: radial-gradient(ellipse at 30% 60%, #2a1000 0%, #120800 50%, #0a0500 100%);
```
Add a faint ember particle grid:
```css
background-image: radial-gradient(circle, rgba(255,120,30,0.07) 1px, transparent 1px);
background-size: 32px 32px;
```

### Layout:
- Remove `max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 3rem`
- New: `min-height: calc(100vh - 56px); width: 100%; padding: 2.5rem 3rem 4rem`
- Keep the `forge-grid` two-column layout but make it span wider
- Welcome heading color stays `#FFD600`

### Panel atmosphere:
Update `.forge-panel` to match the lair theme:
```css
background: rgba(255,120,30,0.05);
border: 1px solid rgba(255,120,30,0.2);
border-radius: 12px;
box-shadow: 0 4px 24px rgba(255,80,0,0.1);
```

### Crawler hero area (`.forge-crawler-preview`):
- Add a warm glow behind the bot art placeholder:
  ```css
  .forge-bot-glow {
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,120,30,0.2) 0%, transparent 70%);
    position: absolute;
    pointer-events: none;
  }
  ```
- Wrap `.forge-bot-art` in a `position: relative` container with `.forge-bot-glow` behind it

---

## File Changes Summary

1. `web/app/routes/__root.tsx` — remove diagonal bg stripe from body
2. `web/app/components/AppNav.tsx` — HUD style, pill nav, cyan active, icon-only sign-out
3. `web/app/components/ThePit.tsx` — full-bleed arena, spotlight, HUD panel, cyan CTA
4. `web/app/routes/forge.tsx` — full-bleed lair bg, ember panels, bot glow

---

## Constraints

- Do NOT touch: `MoldsCollection.tsx`, `Armory.tsx`, `MoltPitLanding.jsx`, `Play.tsx`, any page routes other than `forge.tsx`
- Do NOT change copy (text labels, button text)
- Do NOT break existing Convex queries or auth logic — layout/style changes only
- Keep all existing class names or update them consistently within the same file
- No new npm packages — CSS only, inline styles, or existing classes

---

## Done criteria

1. `npm --prefix web run build` passes with 0 errors
2. `AppNav` active state is a solid cyan filled pill (not yellow underline)
3. `ThePit` background is dark blue-black radial gradient (not flat `#1A1A1A`)
4. `forge` background is deep ember/warm (not flat `#1A1A1A`)
5. `__root.tsx` body has no diagonal stripe
6. Sign-out is icon-only
7. All screens are full-bleed (no visible narrow content box)

---

## Branch + PR

```bash
cd /Users/thealeks/clawd-engineer/projects/cogcage/repo
git pull origin main
git checkout -b feat/ws12a-game-ui-overhaul
# implement changes
npm --prefix web run build
git add -A && git commit -m "feat(ws12a): full-bleed game UI overhaul — HUD nav, arena pit, ember forge"
git push origin feat/ws12a-game-ui-overhaul
gh pr create --title "feat(ws12a): full-bleed game UI overhaul" --body "HUD nav strip, cyan pill active state, arena ThePit, ember Forge, remove global bg. WS12A."
```
