# STYLE REFERENCE — The Molt Pit
**Visual Director: Deep Brine Studios**
**Status: Baseline locked — WS19**
**Date: 2026-03-01**

---

## Overview

Every visual asset in The Molt Pit must feel like it came from the same pressurized, bioluminescent, cartoon-violent place: **The Brine**. This document is the single source of truth for anyone — human or agent — generating art for this game.

Primary references: High on Life, Borderlands, Pacific Rim, deep-sea bioluminescence.
**We are:** cartoon violence with genuine menace. Bold, expressive, slightly absurd.
**We are not:** realistic, grimdark, generic sci-fi blue-grey, or cute.

---

## Color Palette

### Core Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| Brine Cyan | `#00E5FF` | The Brine, tech UI, neutral highlights |
| House Gold | `#FFD600` | Legendary items, The House branding, important UI |
| Damage Red | `#FF1744` | Damage numbers, danger states, Berserker rank |
| HP Green | `#00C853` | HP bar, healing, regeneration, connected state |
| Rare Purple | `#9C27B0` | Rare items, phase effects, The Ghost |
| Brine Dark | `#050510` | Arena background, substrate, deepest shadows |

### Screen Background Colors
| Screen | Primary BG | Secondary/Accent |
|--------|-----------|-----------------|
| The Brine (hub) | `#050510` | `#00E5FF` bioluminescent veins |
| The Shed | `#1A1208` | `#8B6914` warm workshop amber |
| The Pit (arena) | `#080815` | Perspective grid in `#00E5FF` at 15% opacity |
| The Tank | `#060F1A` | `#0066AA` deep aquarium blue |
| The Ledger | `#0D0D0D` | `#FFD600` gold chrome |
| The Pit Board | `#050510` | `#FF1744` accent lines |

### Rarity System
| Rarity | Border Color | Background Tint | Text Style | Glow |
|--------|-------------|-----------------|------------|------|
| Common | `rgba(255,255,255,0.2)` | None | Grey, no shadow | None |
| Rare | `#9C27B0` | `rgba(156,39,176,0.10)` | Purple, subtle glow | 4px purple blur |
| Legendary | `#FFD600` | `rgba(255,214,0,0.10)` | Gold, pulsing | 8px gold animated pulse |

### Action/Status Colors
| Action | Color | Hex |
|--------|-------|-----|
| Damage | Red | `#FF1744` |
| Heal / Regen | Green | `#00C853` |
| Stun | Cyan | `#00E5FF` |
| Phase / Dodge | Purple | `#9C27B0` |
| Buff / Empowered | Gold | `#FFD600` |
| Poison / DoT | Acid Green | `#76FF03` |
| Shield / Guard | Blue-White | `#E3F2FD` |
| Death | Near-Black | `#1A0000` with red fade |

---

## Item Color Keys
Each item has a single dominant color. This color is used for the icon, border, and any glow effects.

### Carapace Colors
| Item | Hex | Notes |
|------|-----|-------|
| BLOCK-7 | `#4CAF50` | Military green |
| THE ORIGINAL | `#9E9E9E` | Plain grey |
| HARDCASE | `#8D6E63` | Terracotta |
| SILKWORM | `#E0E0E0` | Translucent iridescent — use pearl white |
| ECHO | `#FF9800` | Orange |
| THE MOLT | `#F5F5DC` | Pale beige/bone |
| WIDOW | `#212121` | Near-black matte |
| BLEED BACK | `#E53935` | Red with spines |
| THE PATRIARCH | `#FFC107` | Ancient gold |
| GHOST SHELL | `#B0BEC5` | Near-invisible shimmer |
| INVERTER | `#78909C` | Grey/green split |
| THE SARCOPHAGUS | `#607D8B` | Stone grey |
| PAPER-MACHÉ | `#D7CCC8` | Beige papery |

### Claws Colors
| Item | Hex | Notes |
|------|-----|-------|
| MAXINE | `#F4511E` | Industrial orange-red |
| SNAPPER | `#78909C` | Blue-grey balanced |
| THE REACH | `#26C6DA` | Teal |
| THE FLICKER | `#FF9800` | Orange spinning |
| BUZZ | `#00E5FF` | Cyan electric |
| NEEDLE | `#F48FB1` | Thin pink |
| THE APOLOGIST | `#CE93D8` | Purple soft |
| TENDERHOOK | `#66BB6A` | Green hooked |
| VENOM | `#76FF03` | Acid green biological |
| WIDOW-MAKER | `#B71C1C` | Deep red cracked |
| REVERSAL | `#7E57C2` | Purple crystal |
| THE ORIGINAL APPENDAGE | `#FFF8E1` | Pale yellowed ancient |
| CRACKER | `#FFB300` | Amber wedge |
| THE HEIR | `#81D4FA` | Light blue modern |

### Tomalley Colors
| Item | Hex | Notes |
|------|-----|-------|
| THE RED GENE | `#FF1744` | Red pulsing |
| STANDARD ISSUE | `#8BC34A` | Dull green-grey |
| MULCH | `#4CAF50` | Living green wet |
| ORACLE | `#FFD600` | Gold circuit |
| THE GHOST PROTOCOL | `#9C27B0` | Purple phase |
| SPITE | `#B71C1C` | Dark red |
| DOUBLE DOWN | `#FF9800` | Orange five-tally |
| THE LONG GAME | `#1565C0` | Blue clock |
| SURVIVAL INSTINCT | `#FF6D00` | Orange instinct |
| DEEP MEMORY | `#29B6F6` | Light blue scan |
| SECOND WIND | `#00C853` | Green revival |
| QUANTUM HOOK | `#7B1FA2` | Purple space |
| THE HOUSE EDGE | `#FFD600` | Gold coin |

---

## Typography

### Current Fonts (from web CSS)
- **Sans-serif body:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen'`
- **Monospace / UI chrome:** `ui-monospace, Menlo, Monaco, 'Cascadia Mono', 'Segoe UI Mono', 'Roboto Mono'`

### Size Hierarchy
| Role | Size | Weight | Family |
|------|------|--------|--------|
| Arena header (h1) | 24px | 700 | Sans |
| Screen title (h2) | 18px | 600 | Sans |
| Item name | 14px | 500 | Sans |
| Body / description | 13px | 400 | Sans |
| Tooltip | 12px | 400 | Sans |
| Flavor text | 12px | 300 italic | Sans |
| The House labels | 12px | 500 | Mono, ALL CAPS |

### Voice Rules
- **The House** always speaks in ALL CAPS mono for system labels: `PLAYER ELIMINATED`, `ROUND 3`, `THE SHED`
- **Flavor text** (item descriptions, lore) is sentence case, italic, slightly dim
- **Numbers** (damage, HP, Roe) are mono, large, always the action color

---

## Icon Visual Language

### Sizes
| Context | Size | Line Weight |
|---------|------|-------------|
| Source / generation | 512×512px | 6px |
| Item card | 64×64px | 3px |
| Battle HUD | 32×32px | 2px |

### Color Rules
- **Single dominant color** per item (see item color keys above)
- Background: **transparent** always
- Shadows on the icon itself: **none** — depth from cel shading only
- No gradient fills — solid color fills only

### Glow Rules
| Rarity | Glow applied where |
|--------|--------------------|
| Common | No glow |
| Rare | 4px outer glow in item's dominant color at 60% opacity |
| Legendary | 8px animated pulsing outer glow in item's dominant color + gold |

### Border Rules
| Rarity | Border | Thickness |
|--------|--------|-----------|
| Common | `rgba(255,255,255,0.2)` solid | 1px |
| Rare | Item dominant color | 2px |
| Legendary | `#FFD600` gold animated | 2px + pulse animation |

---

## Cel-Shading Rules

### Outlines
- **Thickness:** 6px at 512px (scales proportionally — 3px at 64px, 2px at 32px)
- **Color:** Black `#000000` — always. Never colored outlines.
- **Application:** Applied as outer stroke. The silhouette reads first.

### Lighting Model
- **Single light source:** Top-left, at approximately 10 o'clock position
- **Light color:** Near-white `#F0F8FF` with slight blue tint (The Brine ambient)
- **Shadow:** Cast in opposite direction (bottom-right). Shadow is flat — no gradient, no ambient occlusion.
- **Highlight:** Single bright spot (not gradient). Max 1 specular highlight per object.

### Depth
- Depth is communicated through **shadow only, not gradient**
- Overlapping elements use **hard shadow** (flat silhouette cast)
- No Z-depth blur. No depth of field. It's a game icon, not a photograph.

### Fill Strategy
- Each area of an icon has exactly **2 tones**: base color and shadow tone
- Shadow tone = base color darkened by 30% (`multiply` blend)
- Highlight = base color lightened by 40%, applied as a flat chip — no soft edges

### Animation (Legendary items only)
- Outer glow pulses on a 2s loop (ease-in-out, 60-100% opacity)
- Border shimmers — a single bright point rotates around the border at 4s per revolution

---

## Image Generation Prompt Template

Use this template for DALL-E or any image generation system:

```
Game item icon, cel-shaded cartoon style, thick black outline (3px), [ITEM_DESCRIPTION],
single dominant color [ITEM_HEX], transparent background, 512x512,
High on Life / Borderlands visual style, bioluminescent deep sea aesthetic,
bold readable silhouette, flat color fills with hard shadow, no text, no gradients,
single light source top-left, game UI asset
```

### Example: MAXINE (Claws)
```
Game item icon, cel-shaded cartoon style, thick black outline (3px),
industrial hydraulic piston claws, heavy mechanical lobster claw with exposed pistons,
single dominant color #F4511E orange-red, transparent background, 512x512,
High on Life / Borderlands visual style, bioluminescent deep sea aesthetic,
bold readable silhouette, flat color fills with hard shadow, no text, no gradients,
single light source top-left, game UI asset
```

### Example: BUZZ (Claws)
```
Game item icon, cel-shaded cartoon style, thick black outline (3px),
electric lobster pincers with visible lightning arcs between tips,
single dominant color #00E5FF cyan, transparent background, 512x512,
High on Life / Borderlands visual style, bioluminescent deep sea aesthetic,
bold readable silhouette, flat color fills with hard shadow, no text, no gradients,
single light source top-left, game UI asset
```

---

## What "Consistent" Looks Like

When reviewing a batch of icons, ask:
1. **Silhouette test:** Does it read clearly as a black blob on white? If not, redesign.
2. **32px test:** Can you tell what it is at 32×32? If not, simplify.
3. **Family test:** Put all icons on the dark arena background. Do they look related? Same line weight, same outline style?
4. **Color test:** Is each icon dominated by exactly one color? No rainbow icons.
5. **Background test:** Does it feel like it belongs in a bioluminescent deep-sea arena? If it looks like a mobile game icon from 2019, regenerate.

---

*Visual baseline locked by Visual Director, WS19, 2026-03-01.*
*Any changes to this document require Visual Director sign-off.*
