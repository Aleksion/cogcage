# COMPONENT LIBRARY — The Molt Pit
**Interface Director, WS22**
**Date:** 2026-03-02

---

## Design Tokens (CSS Custom Properties)

```css
/* Palette */
--brine-substrate: #050510;
--brine-cyan: #00E5FF;
--house-gold: #FFD600;
--damage-red: #FF1744;
--hp-green: #00C853;
--rare-purple: #9C27B0;
--text-primary: #f0f0f5;
--text-dim: rgba(240,240,245,0.45);
--text-ghost: rgba(240,240,245,0.2);
--border-glow: rgba(0,229,255,0.25);
--border-faint: rgba(240,240,245,0.08);

/* Typography */
--f-display: 'Bangers', display;
--f-body: 'Kanit', sans-serif;
--f-mono: 'IBM Plex Mono', monospace;

/* Spacing */
--page-max: 1200px;
--page-padding: clamp(1.5rem, 4vw, 6rem);
```

---

## Reusable Components

### 1. `<HouseText>`
The House speaks in ALL CAPS monospace. Used for labels, eyebrows, system messages.
- Font: `--f-mono`
- Weight: 600
- Size: 0.72rem–0.85rem
- Letter-spacing: 2px
- Transform: uppercase
- Color: `--brine-cyan` (default), `--house-gold` (emphasis), `--damage-red` (error)

### 2. `<BrinePanel>`
Container for content blocks. Dark glass.
- Background: `rgba(0,229,255,0.03)`
- Border: `1px solid var(--border-glow)`
- Border-radius: 16px
- Backdrop-filter: `blur(12px)`
- Padding: 2rem
- Variants: `glow` (stronger cyan border + shadow), `dense` (1rem padding)

### 3. `<SubstrateButton>`
Primary CTA. Feels heavy, like pushing through pressure.
- Background: `--brine-cyan`
- Color: `#000`
- Font: `--f-body`, weight 700, uppercase
- Border: none
- Border-radius: 10px
- Box-shadow: `0 0 20px rgba(0,229,255,0.3)`
- Hover: shadow intensifies, slight lift
- Variants: `gold` (House Gold bg), `ghost` (transparent, dim text, border only)

### 4. `<RankBadge>`
Displays rank icon + name.
- Ranks: Soft Shell (◯), Brine-Touched (◎), Hardened (◉), Tide-Scarred (★), Deep (◆), Red (🔴)
- Color coded per rank
- Red badge pulses

### 5. `<ItemCard>`
Displays a Molt component (Carapace, Claws, or Tomalley).
- Shows: icon, name, rarity border, stat preview, flavor text
- Rarity borders per STYLE-REFERENCE.md
- Legendary items pulse gold

### 6. `<CoralFeed>`
Scrolling AI reasoning display. Monospace, cyan text on black.
- Font: `--f-mono`, 0.72rem
- Background: `rgba(0,0,0,0.6)`
- Border: `1px solid var(--brine-cyan)`
- Auto-scrolls
- Cursor blink animation

### 7. `<BrineBackground>`
Full-page background layer. Substrate + bioluminescent effects.
- Base: `--brine-substrate`
- Dot grid: `radial-gradient(circle, rgba(0,229,255,0.06) 1px, transparent 1px)` at 24px
- Optional: depth glow, pressure pulse animation

### 8. `<FlavorLine>`
Italic House copy that appears below section headers.
- Font: `--f-body`, 300 italic
- Color: `--text-dim`
- Max-width: 600px

### 9. `<StatBar>`
HP/Hardness/stat display.
- Track: `rgba(255,255,255,0.08)`, 8px height
- Fill: color per stat type (red=damage, gold=armor, cyan=compute, green=HP)
- Animated fill on mount

### 10. `<GlowDivider>`
Horizontal rule with bioluminescent feel.
- Height: 1px
- Background: `linear-gradient(to right, transparent, var(--brine-cyan), transparent)`
- Opacity: 0.3

### 11. `<PressurePulse>`
Subtle ambient animation layer.
- Radial gradient that slowly breathes (opacity 0.03–0.08)
- Used in backgrounds to suggest The Brine's pressure

### 12. `<LandingNav>`
Pre-auth navigation. Minimal, dark.
- Logo left, single CTA right
- Transparent until scroll, then dark glass
- No hamburger on landing — content scrolls naturally

---

## Component Principles

1. **Dark-first.** Every component assumes `#050510` substrate background.
2. **Glow, not shadow.** Light comes from within (bioluminescence), not from above.
3. **Weight.** Interactions should feel heavy — buttons push down, not bounce up.
4. **Mono for The House.** Anything the system/platform says uses `--f-mono` ALL CAPS.
5. **No emojis in production UI.** Rank icons are text symbols (◯, ◎, ◉, ★, ◆) or SVG. The 🔴 for Red is the exception.
6. **No exclamation points.** The House does not exclaim.

---

*Component library v1.0 — Interface Director, WS22*
