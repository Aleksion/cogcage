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
- [ ] Hero/Origin/copy final QA (Sous voice consistency)
- [ ] Sign-in microcopy final pass
- [ ] Mobile keyboard + spacing sanity
- [ ] No legacy terms

## 2) The Mise (`/mise`, legacy `/shell` redirect)
- [ ] Replace all remaining legacy nouns in UI copy
- [ ] Header, stats, CTA, empty state in canonical language
- [ ] Visual hierarchy upgraded to game-client quality
- [ ] Desktop screenshots
- [ ] Mobile screenshots

## 3) The Shed (`/shed`, legacy `/forge` redirect)
- [ ] Route label/title/meta canonicalized
- [ ] Content language canonicalized (Molt system)
- [ ] Card/table/list visuals aligned to frontpage style
- [ ] Desktop screenshots
- [ ] Mobile screenshots

## 4) The Pit (`/pit`, legacy `/play` redirect)
- [ ] Replace old lobby terms (leaderboard/tanks/etc.)
- [ ] Canon sections: Active Scuttles, Ledger summary, entry actions
- [ ] CTA language and button hierarchy corrected
- [ ] Desktop screenshots
- [ ] Mobile screenshots

## 5) Molts (`/molts`, legacy `/molds` redirect)
- [ ] Remove all “mold(s)” text
- [ ] Canon labels: Molt/Molts throughout
- [ ] Filter/tab taxonomy aligned to current game model
- [ ] Empty state + create flow copy in Sous voice
- [ ] Desktop screenshots
- [ ] Mobile screenshots

## 6) Ledger (`/ledger`, legacy `/ops-log` redirect)
- [ ] Naming + metadata canonicalized
- [ ] Copy and labels aligned with world
- [ ] Visual consistency with other pages
- [ ] Desktop/mobile screenshots

## 7) Secondary routes (`/demo`, `/join/:code`, `/tank/:id`, `/success`)
- [ ] Canon language pass
- [ ] Visual consistency pass
- [ ] Empty/error states themed
- [ ] Desktop/mobile screenshots where applicable

---

## Navigation Checklist

- [ ] Primary nav uses only canonical labels: Surface / The Mise / The Shed / The Pit / Molts / Ledger
- [ ] Nav points to canonical URLs only
- [ ] Legacy URLs not shown in nav
- [ ] Landing nav + app nav do not double-stack
- [ ] Auth/unauth nav behavior validated

---

## Visual System Checklist

- [ ] `#050510` substrate base
- [ ] `#00E5FF` primary interactions
- [ ] No legacy yellow primary for core CTA system
- [ ] No generic SaaS card treatment
- [ ] Spacing/typography rhythm matches frontpage quality
- [ ] Mobile-first pass complete

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

- [ ] Should `/surface` be explicit route, or keep `/` as canonical Surface and alias `/surface` to it?
- [ ] Confirm final top-level nav labels (include Demo or hide behind dev mode?)
- [ ] Confirm `/tank/:id` user-facing name in canon terminology

---

**Rule:** If URL label and page content diverge, URL/content must be corrected before merge.
