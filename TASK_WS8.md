# TASK WS8 — Arcade Visual Overhaul

## Objective
Bring the in-game screens (Dashboard, Armory, Card, AppNav) up to the same visual energy as the landing page (`MoltPitLanding.jsx`).

## The Problem
The landing page is an **arcade poster** — cream/textured bg, thick black borders, hard drop shadows, giant Bangers headings.
The in-game is a **generic SaaS dark mode** — flat black bg, thin glow borders, small headings, soft shadows.

The fix: apply the landing page's border/shadow/typography system to all in-game screens.

---

## Aesthetic Reference — Extract from Landing Page

These are the exact rules from the landing page CSS. Replicate the **same principles** in dark theme:

```
btn-arcade:
  border: 4px solid #000 (var(--c-dark))
  box-shadow: 0 6px 0 #000
  on active: transform translateY(4px), box-shadow none
  font-family: Bangers, uppercase

panel/card:
  background: white (or solid dark in dark variant)
  border: 3px solid #000
  box-shadow: 6px 6px 0 rgba(0,0,0,0.2)  ← hard shadow, NO blur
  border-radius: var(--radius)

section header:
  font-family: Bangers
  font-size: 3-4rem
  text-shadow: 4px 4px 0 var(--c-orange)
  text-transform: uppercase

bg texture:
  repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)
```

---

## Global Design Tokens to Add

Add to `__root.tsx` inline `<style>`:

```css
:root {
  /* keep existing vars, add: */
  --c-yellow: #FFD600;
  --c-orange: #FF9F1C;
  --c-red: #EB4D4B;
  --c-cyan: #00E5FF;
  --c-purple: #7C3AED;
  --c-dark: #1A1A1A;
  --c-black: #000000;

  --arcade-border: 3px solid #000;
  --arcade-shadow: 4px 4px 0 #000;
  --arcade-shadow-lg: 6px 6px 0 #000;

  --f-display: 'Bangers', display;
  --f-body: 'Kanit', sans-serif;
  --f-mono: 'IBM Plex Mono', monospace;
}

html, body {
  background: #0D0D0D;
  /* subtle dark diagonal stripe — matches landing texture but inverted */
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255,255,255,0.015) 10px,
    rgba(255,255,255,0.015) 20px
  );
}
```

---

## Phase 1 — `app/components/cards/Card.tsx`

**Replace the glow system with the arcade border system:**

### Full card (non-mini):
```
border: 3px solid #000
box-shadow: 4px 4px 0 #000
background: #111   (solid, no gradient needed)
```

Type colors move to the **top label bar** as SOLID FILLS with white text:
```
weapon top bar: background #EB4D4B, color #fff
armor top bar:  background #00E5FF, color #000
tool top bar:   background #7C3AED, color #fff
```

Remove all `glow`, `rgba(...,0.4)` border shadow, and `box-shadow: 0 0 12px ...` effects.

When selected:
```
border: 3px solid #FFD600
box-shadow: 4px 4px 0 #FFD600
```

### Mini card:
Same treatment, just smaller. Remove glow.

### Stats footer:
- Keep the weapon/armor/tool stat layout
- Font: IBM Plex Mono, slightly bigger (0.65rem not 0.6rem)
- Color: `rgba(255,255,255,0.85)` not 0.7

---

## Phase 2 — `app/components/Armory.tsx`

### Section headers ("CARD GALLERY", "CLAWS (MAX 3)", "BRAIN (DIRECTIVE)")
Replace whatever small text is being used with:
```css
font-family: 'Bangers', display;
font-size: 2.5rem;
text-transform: uppercase;
color: #fff;
text-shadow: 3px 3px 0 var(--c-orange);
letter-spacing: 2px;
margin-bottom: 1.2rem;
```

### Filter pills (ALL / WEAPONS / ARMOR / TOOLS)
Active state:
```
background: #FFD600
color: #000
border: 3px solid #000
box-shadow: 3px 3px 0 #000
font-family: Bangers
font-size: 1rem
```

Inactive state:
```
background: transparent
color: rgba(255,255,255,0.6)
border: 2px solid rgba(255,255,255,0.2)
```

### Shell panel (right side) — empty card slots
Currently plain gray squares. Make them look like card placeholders:
```
width: 120px; height: 180px
border: 3px dashed rgba(255,255,255,0.25)
border-radius: 10px
display: grid; place-items: center
color: rgba(255,255,255,0.2)
font-size: 2rem  (a "+" or "?" icon)
```

### SAVE button
```
background: #EB4D4B
color: #fff
font-family: Bangers
font-size: 1.3rem
border: 3px solid #000
box-shadow: 4px 4px 0 #000
padding: 0.6rem 2rem
cursor: pointer
on active: transform: translateY(4px); box-shadow: none
```

### Shell name input field
```
background: #0a0a0a
border: 3px solid rgba(255,255,255,0.3)
color: #fff
font-family: Kanit, font-weight 800
font-size: 1rem
padding: 0.6rem 1rem
border-radius: 6px
```
On focus: `border-color: #FFD600`

### Stat bars (WEIGHT, COMPLEXITY, ARMOR, MOVE COST)
- Labels: `font-family: Bangers; font-size: 1rem; color: rgba(255,255,255,0.8)`
- Bar track: `height: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 999px`
- Bar fill: keep existing color logic but height 10px

### Skill chips (Claws section)
Currently text buttons. Make them look like mini card chips:
```
background: #1a1a1a
border: 2px solid <category-color>
box-shadow: 2px 2px 0 #000
font-family: Kanit; font-weight: 800
padding: 4px 10px
border-radius: 6px
font-size: 0.8rem
```

When selected:
```
background: <category-color>
color: #000 or #fff (depending on color)
border-color: #000
```

### Brain presets (AGGRESSIVE, DEFENSIVE, etc.)
Same chip treatment. Selected = solid fill + black border.

---

## Phase 3 — `app/components/Dashboard.tsx`

### Welcome header section
The screen shows "WELCOME BACK, ALEKSANDER" — this header needs to be in Bangers, big (2.5-3rem), with a yellow or orange text-shadow. NOT the current flat white.

### Crawler card
Currently: `rgba(20,20,28,0.8)` blur card with a dashed border.

Replace with:
```
background: #111
border: 3px solid #FFD600
box-shadow: 6px 6px 0 #000
border-radius: 12px
padding: 1.5rem
```

Crawler name:
```
font-family: Bangers
font-size: 2.5rem  ← MUCH bigger than current 1.3rem
color: #FFD600
text-shadow: 3px 3px 0 #000
```

"ACTIVE MOLD: DEFAULT" line → rename to match game terminology, or remove if no meaningful content.

### FIND A MOLT button
Currently a small red button. Make it arcade:
```
background: #EB4D4B
color: #fff
font-family: Bangers
font-size: 1.8rem
text-transform: uppercase
border: 4px solid #000
box-shadow: 0 6px 0 #000
width: 100%
padding: 1rem 2rem
cursor: pointer
on active: transform: translateY(6px); box-shadow: none
```

### EDIT MOLD / secondary buttons
```
background: transparent
color: #fff
font-family: Bangers
font-size: 1.2rem
border: 3px solid rgba(255,255,255,0.5)
box-shadow: 3px 3px 0 rgba(255,255,255,0.2)
padding: 0.6rem 2rem
```

### Stats row (0 MOLTS / 0% WIN% / #50 RANK)
Currently boring gray tiles. Make them punchy:
```
each stat tile:
  background: #111
  border: 3px solid #000
  box-shadow: 4px 4px 0 #000
  border-radius: 10px

stat number:
  font-family: Bangers
  font-size: 3rem
  color: #FFD600 (for good stats) or #EB4D4B (for 0 stats)
  text-shadow: 2px 2px 0 #000

stat label:
  font-family: Kanit; font-weight: 800
  font-size: 0.7rem
  text-transform: uppercase
  color: rgba(255,255,255,0.5)
  letter-spacing: 2px
```

### Section titles ("RECENT MOLTS", "ACTIVE TANKS")
Same header treatment as Armory:
```
font-family: Bangers
font-size: 2rem
text-shadow: 2px 2px 0 var(--c-orange)
```

### Empty state text ("No molts yet...")
```
font-family: Kanit; font-weight: 800
font-size: 1rem
color: rgba(255,255,255,0.4)
```

---

## Phase 4 — `app/components/AppNav.tsx`

Read this file first to understand current structure.

Logo ("The Molt Pit" or similar):
```
font-family: Bangers
font-size: 2rem
color: #EB4D4B
text-shadow: 2px 2px 0 #000
```

Nav links:
- Inactive: `color: rgba(255,255,255,0.6); font-weight: 800; uppercase`
- Active/current route: 
  ```
  color: #FFD600
  border-bottom: 3px solid #FFD600
  ```

Nav container:
```
background: #000
border-bottom: 3px solid #FFD600
padding: 0.8rem 2rem
```

Credits/balance badge (top right "1000 CR"):
```
background: #FFD600
color: #000
font-family: Bangers
font-size: 1.1rem
border: 3px solid #000
box-shadow: 3px 3px 0 #000
border-radius: 999px
padding: 0.3rem 1rem
```

---

## What NOT to change
- Game logic, routes, API calls — zero changes
- Convex queries — zero changes
- Auth flow — zero changes
- Responsive breakpoints that already exist — preserve them
- The landing page component (`MoltPitLanding.jsx`) — DO NOT TOUCH

---

## Commit & Push

After all 4 phases are done:
1. `cd` into the worktree root  
2. `npm --prefix web run build` — must pass with zero errors
3. `git add -A && git commit -m "feat(ws8): arcade visual overhaul — bring in-game UI to landing page energy"`
4. `git push origin feat/ws8-arcade-visual`
5. Run: `openclaw system event --text "Done: WS8 arcade visual overhaul committed and pushed to feat/ws8-arcade-visual" --mode now`

---

## File summary (edit these, in order)
1. `web/app/routes/__root.tsx` — add global tokens + dark stripe bg
2. `web/app/components/cards/Card.tsx` — replace glow with arcade border
3. `web/app/components/Armory.tsx` — section headers, filter pills, shell slots, SAVE button, stat bars
4. `web/app/components/Dashboard.tsx` — crawler card, buttons, stat tiles, section titles
5. `web/app/components/AppNav.tsx` — logo, nav links, credits badge
