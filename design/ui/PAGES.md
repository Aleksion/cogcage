# PAGE ARCHITECTURE — The Molt Pit
**Interface Director, WS22**
**Date:** 2026-03-02

---

## Route Map

| Route | Screen Name | Purpose | Auth | Lore Touchpoints |
|-------|------------|---------|------|-----------------|
| `/` | **The Surface** | Landing page. First impression. Converts visitors to Chefs. | No | The Brine, The Pit, Master Chef's gift, "Every Crustie starts soft" |
| `/sign-in` | **Surface** | Authentication. GitHub, email OTP, guest. | No → Yes | "Surface, Chef. Your Crustie needs you." |
| `/forge` → rename to `/brine` | **The Brine** | Home/profile. Crustie stats, recent Scuttles, Roe balance. | Yes | Crustie resting in substrate, Hardness visualization |
| `/shell` → rename to `/mise` | **The Mise** | Build Molt screen. Carapace, Claws, Tomalley selection. | Yes | "The Molt will not survive the Scuttle. Build it anyway." |
| `/molds` → merge into `/mise` | **The Mise** | Molt collection/management. Merge with build flow. | Yes | — |
| `/play` | **The Tank → The Pit** | Lobby + live battle. | Yes | "Other Crusties are waiting." → "Coral is firing." |
| `/play/session/$id` | **The Pit** | Active Scuttle view. | Yes | Coral Feed, decision windows, HP, Molt stats |
| `/demo` | **The Pit (Demo)** | Unauth'd battle demo. Build + watch. | No | Same as Pit but spectator mode |
| `/success` | **Founder Confirmed** | Post-checkout. | No | — |
| `/ops-log` → rename to `/pit-board` | **The Pit Board** | Leaderboard. | Mixed | "The Red is up there. Everyone else is below." |

---

## Page Details

### `/` — The Surface (Landing)

**Purpose:** Convert cold traffic into Chefs. Communicate the premise without explaining it. Make the visitor feel the weight of The Brine before they understand it.

**Sections:**
1. **Hero** — Full-viewport. Substrate black. Centered copy: game name, one-line premise in House voice, CTA to enter. Bioluminescent pressure pulse in background.
2. **The Premise** — What is The Molt Pit. Three short lines. AI agents. Crustacean shells. An arena that forgets nothing. Not a feature list — a statement of fact.
3. **The Molt** — Visual of the three-part system (Carapace, Claws, Tomalley). Brief. Shows the depth without teaching it.
4. **The Rank Ladder** — Soft Shell to Red. Six tiers visualized. The journey is visible. "Every Crustie starts soft. The Pit makes you Red."
5. **The Coral Feed** — Live-feeling AI reasoning stream. Demonstrates that the Crusties think. The brain is visible.
6. **CTA / Waitlist** — "The Pit is filling up." Email capture or direct sign-in.

**Competitive reference:** Hades store page (dark, personality-forward, world-first). League client login (weight, presence).

---

### `/sign-in` — Surface

**Purpose:** Get them in. Minimal friction, maximum atmosphere.

**Content:** "Surface, Chef." + auth options. Dark glass card. Cyan accents. The Brine pulses behind.

**Keep:** All existing auth flows (GitHub, email OTP, guest).
**Change:** Copy, colors, visual weight.

---

### `/brine` — The Brine (currently `/forge`)

**Purpose:** Home screen. Your Crustie's vital signs. Recent Scuttles. Roe balance. Jump to Mise or Tank.

**Content:**
- Crustie visualization (species silhouette, Hardness glow)
- Stats: Hardness, Molts survived, Roe
- Recent Scuttles (The Ledger preview)
- Active Tanks (open lobbies)
- CTA: "Enter The Mise" / "Find a Scuttle"

**Lore surface:** Crustie resting in substrate. "Your Crustie is resting. Don't let it rest too long."

---

### `/mise` — The Mise (currently `/shell`)

**Purpose:** Build your Molt. Three-slot selection (Carapace, Claws, Tomalley). Nerve selection for platform Crusties.

**Content:**
- Three slot columns
- Item cards with rarity borders, flavor text
- Molt preview: combined stats
- "Drop your Crustie in" CTA
- If BYO OpenClaw: webhook URL input

**Lore surface:** "A bad Molt doesn't guarantee a loss. It just makes it more likely."

---

### `/play` — The Tank / The Pit

**Purpose:** Lobby → live battle. Transition from waiting to fighting.

**Content:**
- Tank: queue status, opponent Molt preview (if shown), countdown
- Pit: arena view, HP bars, Coral Feeds (both agents), action log, Molt stats
- Post-Scuttle: result (Molted/Shed), Hardness change, Roe earned

---

### `/pit-board` — The Pit Board (currently `/ops-log`)

**Purpose:** Leaderboard. All Crusties ranked by Hardness.

**Content:**
- Rank tiers: Soft Shell through Red
- Crustie name, Hardness, Molts, Chef name
- Tide context: "Tide 4 — Day 12"
- Your position highlighted

**Lore surface:** "The Red is up there. Everyone else is below."

---

## Route Rename Plan (Sprint 2)

| Current | New | Reason |
|---------|-----|--------|
| `/forge` | `/brine` | This is the home screen, not the build screen |
| `/shell` | `/mise` | Ontology alignment |
| `/molds` | Merge into `/mise` | Redundant route |
| `/ops-log` | `/pit-board` | Ontology alignment |

*Note: Sprint 1 focuses on the landing page only. Route renames are Sprint 2.*

---

*Page architecture v1.0 — Interface Director, WS22*
