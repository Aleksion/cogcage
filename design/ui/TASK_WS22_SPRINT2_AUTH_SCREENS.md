# TASK — WS22 Sprint 2: Authenticated Screens Canonicalization

**Owner:** Interface Director (Daedalus)
**Date:** 2026-03-02
**Objective:** Bring all authenticated/non-landing screens to frontpage quality with canonical naming, canonical URLs, and full visual/copy consistency.

---

## Non-Negotiables

1. **Canonical vocabulary only** (no legacy terms):
   - Crustie, Molt, Scuttle, Hardness, Roe, The Sous
2. **URL must match content name**
3. **Visual quality parity with frontpage**
4. **Desktop + mobile validated with screenshots**
5. **Auth + unauth + loading + empty states covered**

---

## Canonical URL Map (required)

### Canonical paths (target)
- `/surface` (landing/sign-in context can route from `/`)
- `/mise` (currently `/shell`)
- `/shed` (currently `/forge`)
- `/pit` (currently `/play`)
- `/molts` (currently `/molds`)
- `/ledger` (currently `/ops-log`)

### Legacy path policy
Legacy paths must 301/route-redirect to canonical:
- `/shell` -> `/mise`
- `/forge` -> `/shed`
- `/play` -> `/pit`
- `/molds` -> `/molts`
- `/ops-log` -> `/ledger`

No user-facing nav labels may reference legacy names.

---

## Screen-by-screen Checklist

## 1) Surface (`/` + `/sign-in`)
- [x] Hero/Origin/copy final QA (Sous voice consistency)
- [x] Sign-in microcopy final pass
- [x] Mobile keyboard + spacing sanity
- [x] No legacy terms

## 2) The Mise (`/mise`, legacy `/shell` redirect)
- [x] Replace all remaining legacy nouns in UI copy
- [x] Header, stats, CTA, empty state in canonical language
- [x] Visual hierarchy upgraded to game-client quality
- [x] Desktop screenshots
- [x] Mobile screenshots

## 3) The Shed (`/shed`, legacy `/forge` redirect)
- [x] Route label/title/meta canonicalized
- [x] Content language canonicalized (Molt system)
- [x] Card/table/list visuals aligned to frontpage style
- [x] Desktop screenshots
- [x] Mobile screenshots

## 4) The Pit (`/pit`, legacy `/play` redirect)
- [x] Replace old lobby terms (leaderboard/tanks/etc.)
- [x] Canon sections: Active Scuttles, Ledger summary, entry actions
- [x] CTA language and button hierarchy corrected
- [x] Desktop screenshots
- [x] Mobile screenshots

## 5) Molts (`/molts`, legacy `/molds` redirect)
- [x] Remove all “mold(s)” text
- [x] Canon labels: Molt/Molts throughout
- [x] Filter/tab taxonomy aligned to current game model
- [x] Empty state + create flow copy in Sous voice
- [x] Desktop screenshots
- [x] Mobile screenshots

## 6) Ledger (`/ledger`, legacy `/ops-log` redirect)
- [x] Naming + metadata canonicalized
- [x] Copy and labels aligned with world
- [x] Visual consistency with other pages
- [x] Desktop/mobile screenshots

## 7) Secondary routes (`/demo`, `/join/:code`, `/tank/:id`, `/success`)
- [x] Canon language pass
- [x] Visual consistency pass
- [x] Empty/error states themed
- [x] Desktop/mobile screenshots where applicable

---

## Navigation Checklist

- [x] Primary nav uses only canonical labels: Surface / The Mise / The Shed / The Pit / Molts / Ledger
- [x] Nav points to canonical URLs only
- [x] Legacy URLs not shown in nav
- [x] Landing nav + app nav do not double-stack
- [x] Auth/unauth nav behavior validated

---

## Visual System Checklist

- [x] `#050510` substrate base
- [x] `#00E5FF` primary interactions
- [x] No legacy yellow primary for core CTA system
- [x] No generic SaaS card treatment
- [x] Spacing/typography rhythm matches frontpage quality
- [x] Mobile-first pass complete

---

## Verification Protocol (required)

For each route/state:
1. Run dev server
2. Capture desktop screenshot
3. Capture mobile screenshot (390x844)
4. Verify vocabulary + URL + nav + CTA + empty states
5. Mark checklist item done only with screenshot evidence

---

## Deliverables

1. PR: route canonicalization + redirects + nav updates
2. PR: copy + visual parity pass (all screens)
3. Screenshot pack linked in PR description
4. Final audit matrix (route x state x pass/fail)

---

## Open Questions (must resolve before final merge)

- [x] Should `/surface` be explicit route, or keep `/` as canonical Surface and alias `/surface` to it?
- [x] Confirm final top-level nav labels (include Demo or hide behind dev mode?)
- [x] Confirm `/tank/:id` user-facing name in canon terminology

---

**Rule:** If URL label and page content diverge, URL/content must be corrected before merge.

---

## WS22 Execution Audit — 2026-03-03

### Route/State Matrix (Pass/Fail + Evidence)
- `PASS` `/` Surface desktop: `web/output/playwright/ws22/desktop-surface.png`
- `PASS` `/` Surface mobile (390x844): `web/output/playwright/ws22/mobile-surface.png`
- `PASS` `/sign-in` unauth desktop: `web/output/playwright/ws22/desktop-sign-in-unauth.png`
- `PASS` `/sign-in` unauth mobile: `web/output/playwright/ws22/mobile-sign-in-unauth.png`
- `PASS` `/sign-in` authenticated handoff desktop: `web/output/playwright/ws22/desktop-sign-in-auth.png`
- `PASS` `/sign-in` authenticated handoff mobile: `web/output/playwright/ws22/mobile-sign-in-auth.png`
- `PASS` `/mise` desktop: `web/output/playwright/ws22/desktop-mise.png`
- `PASS` `/mise` mobile: `web/output/playwright/ws22/mobile-mise.png`
- `PASS` `/shed` desktop: `web/output/playwright/ws22/desktop-shed.png`
- `PASS` `/shed` mobile: `web/output/playwright/ws22/mobile-shed.png`
- `PASS` `/pit` desktop: `web/output/playwright/ws22/desktop-pit.png`
- `PASS` `/pit` mobile: `web/output/playwright/ws22/mobile-pit.png`
- `PASS` `/molts` desktop: `web/output/playwright/ws22/desktop-molts.png`
- `PASS` `/molts` mobile: `web/output/playwright/ws22/mobile-molts.png`
- `PASS` `/ledger` desktop: `web/output/playwright/ws22/desktop-ledger.png`
- `PASS` `/ledger` mobile: `web/output/playwright/ws22/mobile-ledger.png`
- `PASS` `/demo` desktop: `web/output/playwright/ws22/desktop-demo.png`
- `PASS` `/demo` mobile: `web/output/playwright/ws22/mobile-demo.png`
- `PASS` `/join/ALPHA7` desktop: `web/output/playwright/ws22/desktop-join-code.png`
- `PASS` `/join/ALPHA7` mobile: `web/output/playwright/ws22/mobile-join-code.png`
- `PASS` `/tank/nonexistent` desktop (error state themed): `web/output/playwright/ws22/desktop-tank-missing.png`
- `PASS` `/tank/nonexistent` mobile (error state themed): `web/output/playwright/ws22/mobile-tank-missing.png`
- `PASS` `/success` desktop: `web/output/playwright/ws22/desktop-success.png`
- `PASS` `/success` mobile: `web/output/playwright/ws22/mobile-success.png`

### Legacy Alias Verification
- `PASS` `/shell` -> `/mise` (desktop/mobile):
  - `web/output/playwright/ws22/desktop-legacy-shell.png`
  - `web/output/playwright/ws22/mobile-legacy-shell.png`
- `PASS` `/forge` -> `/shed` (desktop/mobile):
  - `web/output/playwright/ws22/desktop-legacy-forge.png`
  - `web/output/playwright/ws22/mobile-legacy-forge.png`
- `PASS` `/play` -> `/pit` (desktop/mobile):
  - `web/output/playwright/ws22/desktop-legacy-play.png`
  - `web/output/playwright/ws22/mobile-legacy-play.png`
- `PASS` `/molds` -> `/molts` (desktop/mobile):
  - `web/output/playwright/ws22/desktop-legacy-molds.png`
  - `web/output/playwright/ws22/mobile-legacy-molds.png`
- `PASS` `/ops-log` -> `/ledger` (desktop/mobile):
  - `web/output/playwright/ws22/desktop-legacy-ops-log.png`
  - `web/output/playwright/ws22/mobile-legacy-ops-log.png`
- Redirect URL proof: `web/output/playwright/ws22/redirect-checks.txt`

### Open Question Resolutions
- `/surface`: keep `/` as canonical Surface in this sprint; no separate `/surface` route added.
- Top-level nav labels: canonical-only set to `Surface / The Mise / The Shed / The Pit / Molts / Ledger`.
- `/tank/:id` user-facing naming: canonicalized to **Scuttle** in metadata and page copy.
