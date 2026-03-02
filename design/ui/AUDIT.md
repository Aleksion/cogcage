# UI AUDIT — The Molt Pit
**Auditor:** Interface Director, WS22
**Date:** 2026-03-02
**Verdict:** The lore is extraordinary. The site does not reflect it. Every page needs work.

---

## EXECUTIVE SUMMARY

The current site reads as a SaaS product page wearing a lobster costume. Light backgrounds, arcade buttons, pastel gradients, exclamation points, and marketing copy that could belong to any competitive game. None of it communicates what The Molt Pit actually is: an ancient, pressurized, bioluminescent arena where AI agents fight inside crustacean shells at the bottom of a digital ocean.

The lore bible describes a world with weight, history, and menace. The site describes a product with features. These are different things.

---

## PAGE-BY-PAGE FINDINGS

### 1. Landing Page (`/` — MoltPitLanding.jsx)

**Current state:** ~1800-line JSX monolith. Light-mode SaaS landing page.

| Issue | Severity | Detail |
|-------|----------|--------|
| **Wrong universe** | P0 | Background is `#F8F9FA` white gradient. Should be `#050510` substrate black. The Brine is cold and dark. This is a well-lit conference room. |
| **Wrong voice** | P0 | Copy uses SaaS marketing language: "Build bots, battle agents, climb the ladder." The House does not say "Build bots." The House says "The Pit is filling up." |
| **Wrong vocabulary** | P0 | Says "Bot", "Crawler", "Build Screen" — ontology says Crustie, Molt, The Mise. Every wrong word breaks the fiction. |
| **BattleHero component** | P1 | Cute animated lobster card with bouncing claws and white card body. This is a children's show mascot. Should communicate weight and menace. |
| **Light-mode nav** | P1 | White background, pastel drop shadows, arcade aesthetic. The Brine has no sunlight. |
| **Feature grid** | P1 | Generic product feature cards ("AI-Powered Combat", "Real-Time Strategy"). The Pit does not list features. The Pit exists. |
| **Waitlist form** | P2 | Standard email capture with "Join the alpha" copy. Fine functionally, wrong tonally. |
| **No lore presence** | P0 | The richest game world on the platform and not a single line of it appears on the page new visitors see first. |

**Verdict:** Full rewrite. Keep nothing but the route structure and waitlist functionality.

---

### 2. Sign-In Page (`/sign-in`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **"PLAYER AUTH" eyebrow** | P1 | The House does not say "Player Auth." The House says "Surface, Chef. Your Crustie needs you." |
| **"ENTER THE PIT" title** | P2 | Directionally correct but The Pit is the arena, not the sign-in. This screen is Surface. |
| **Background aesthetic** | P2 | Dark with cyan dot grid — closer to correct than the landing page. Keep the direction. |
| **Auth flows work** | — | GitHub OAuth, email OTP, guest auth all functional. Do not break. |

**Verdict:** Restyle and re-copy. Auth logic is solid.

---

### 3. Forge Page (`/forge`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Wrong name** | P1 | "The Forge" — ontology says this screen is "The Brine" (home/profile). The Forge/Shed is the build screen. |
| **"Crawler" everywhere** | P1 | Should be "Crustie." |
| **"CR" rating** | P1 | Should be "Hardness." |
| **"Mold" / "Molt" confusion** | P1 | Uses "Mold" in some places, "Molt" in others. Ontology is clear: it's "Molt." |
| **Orange-warm palette** | P2 | Warm workshop amber — closer to The Shed palette from STYLE-REFERENCE.md, but this isn't The Shed. |
| **Robot emoji for Crustie** | P2 | 🤖 emoji for the Crustie avatar. No. |

**Verdict:** Rename, retheme, recopy. The data bindings (player stats, shells, tanks) are correct.

---

### 4. Shell / Armory Page (`/shell`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **This IS The Mise** | P1 | The build screen should be called The Mise, not "The Shell." |
| **Auth gate copy** | P2 | "Access Restricted" / "BUILD YOUR CRAWLER" — wrong vocabulary. |
| **Loads Armory component** | — | Functional. Component needs audit separately. |

**Verdict:** Rename route, update copy.

---

### 5. Play Page (`/play`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Loads ThePit/DemoLoop** | — | Functional split between auth/unauth. Correct pattern. |
| **Loading state** | P3 | Minimal, correct aesthetic (dark, mono, uppercase). Good. |

**Verdict:** Mostly fine. Loading state is one of the few things that feels right.

---

### 6. Demo Page (`/demo`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **"LOADING ARENA..."** | P3 | Uses Bangers font, gold color. Acceptable. |
| **Functional** | — | MoldBuilder → CinematicBattle flow works. |

**Verdict:** Low priority. The demo battle experience is the strongest part of the current site.

---

### 7. Root Layout (`__root.tsx`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Body background `#0D0D0D`** | P2 | Close but not `#050510`. Should be exact substrate color. |
| **CSS variable `--c-dark: #1A1A1A`** | P2 | The Brine substrate is `#050510`. `#1A1A1A` is too light. |
| **Font stack** | P3 | Bangers, IBM Plex Mono, Inter, Kanit, Space Grotesk — too many fonts. Pick: Bangers (display), one body sans, IBM Plex Mono (system/House voice). |
| **AppNav only shows when auth'd** | — | Correct behavior. Landing page should feel different from the app. |

**Verdict:** Update CSS variables, tighten font stack.

---

### 8. AppNav Component

| Issue | Severity | Detail |
|-------|----------|--------|
| **"Forge" / "Molds" / "The Pit" / "Demo" / "Ladder" / "Guide"** | P1 | Mix of ontology-correct and wrong names. Should be: The Brine, The Mise, The Pit, Demo, The Pit Board, Guide. |
| **Visual direction** | P2 | Dark with cyan border — correct direction. Scanline pattern in background is a nice touch. |

**Verdict:** Rename nav items. Visual is close.

---

## SYSTEMIC ISSUES

### 1. No Design System
Every page has its own inline `<style>` block, often 200-400 lines. No shared CSS variables beyond the root. No reusable component library. The visual language drifts between pages because nothing enforces consistency.

### 2. Wrong Color Language
The art direction specifies Brine Cyan `#00E5FF`, House Gold `#FFD600`, Damage Red `#FF1744`, substrate `#050510`. The site uses `#EB4D4B` (softer red), `#FF9F1C` (warm orange), `#1A1A1A` (too-light dark), and white backgrounds. The palette communicates "playful arcade game" not "ancient pressurized deep-sea arena."

### 3. Vocabulary Drift
"Crawler", "Bot", "Mold", "Shell", "Build", "Forge" — the ontology is specific and locked. The site ignores it in roughly half of all copy. Each wrong word is a paper cut to the fiction.

### 4. The House Has No Voice
The copy guide defines a specific register: dry, flat, ancient, no exclamation points. The current site uses standard game-marketing copy with energy and enthusiasm. The House is not enthusiastic. The House has been running The Pit since before you were born.

### 5. No Lore Surface
The lore bible is one of the strongest game-world documents written for any indie project. Zero lines of it appear anywhere in the player-facing experience. The Sous, Master Chef, Subject 1, The Deep, the rank descriptions — none of it surfaces. This is the biggest missed opportunity in the entire product.

---

## PRIORITY MATRIX

| Priority | Items | Sprint |
|----------|-------|--------|
| **P0** | Landing page full rewrite, vocabulary alignment, House voice | Sprint 1 |
| **P1** | Sign-in restyle, Forge rename/retheme, Nav rename, Shell rename | Sprint 2 |
| **P2** | Root CSS variables, color system alignment, font consolidation | Sprint 2 |
| **P3** | Loading states, demo page polish | Sprint 3 |

---

*Audit complete. The foundation (auth, data, routes) is solid. The presentation layer needs to be demolished and rebuilt to match the world we've written.*
