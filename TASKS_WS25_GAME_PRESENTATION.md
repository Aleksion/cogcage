# WS25 — Game Presentation Reset Task Board

**Created:** 2026-03-02 21:18 ET  
**Updated:** 2026-03-03 18:20 ET  
**Owner:** Daedalus  
**Status:** Active (A/B complete, initial C complete, D/E pending)

## Objective
Ship a match presentation that feels like a real 2.5D game (not a 2-player debug mod), matches Visual Director style direction, and is verified on desktop + mobile.

---

## Acceptance Gates (must all pass)
- [ ] Visual style matches reference direction (Borderlands/XIII-inspired cel look)
- [x] Arena is dominant/full-bleed on mobile live match views
- [x] HUD is game-first and FFA-ready (not debug panel layout)
- [x] 3D crusties are clear/readable at tested camera distances
- [ ] SCUTTLE/PINCH/SPIT feedback is visually legible and punchy
- [x] No critical overlap on 390x844 viewport
- [x] Verified screenshots attached (desktop + 390x844)

---

## Workstream A — HUD / Layout Architecture (FFA-first)
- [x] A1 Define canonical live HUD information hierarchy (timer, phase, alive count, your crustie state, focused target state)
- [x] A2 Remove/reduce side-panel debug dominance in live match mode
- [x] A3 Implement mobile safe-zone layout policy (collapse/overlay side panels)
- [x] A4 Add responsive breakpoints and clamp typography for 390x844
- [x] A5 Ensure opponent brain stream remains hidden during live match (debrief only)

## Workstream B — Arena Framing + Camera
- [x] B1 Lock camera framing so full units remain visible on mobile
- [x] B2 Keep full-arena tactical readability while preserving 2.5D depth
- [x] B3 Validate actor scale buckets across desktop/tablet/mobile
- [x] B4 Prevent bottom-edge clipping of large meshes during combat

## Workstream C — Style System (not one-off tweaks)
- [x] C1 Finalize toon banding profile (quantized light levels)
- [x] C2 Finalize silhouette outlines (thickness by viewport)
- [x] C3 Finalize team rim-light profile (color + intensity)
- [x] C4 Build reusable style presets in `PitScene.ts` (single source of truth)
- [ ] C5 Verify style against Visual Director benchmark frames (neutral/melee/ranged)

## Workstream D — Combat Readability VFX
- [ ] D1 MELEE_STRIKE: impact arc + burst + readable hit confirmation
- [ ] D2 RANGED_SHOT: cast/read trajectory clarity
- [ ] D3 Damage numbers: scale/contrast/timing tuned for mobile
- [ ] D4 Add short hitstop/camera impulse where appropriate without breaking tick semantics

## Workstream E — Asset Pipeline Reliability
- [ ] E1 Verify current blob URLs for all base GLBs (lobster/mantis/shrimp/crab/hermit)
- [ ] E2 Re-verify animation clip URLs; keep remote clip loading disabled until stable
- [ ] E3 Document source-of-truth asset manifest in repo

---

## Verification Matrix (required artifacts)

### Desktop
- [x] V1 Neutral frame (arena + both units visible)
- [x] V2 Melee impact frame (readable impact language)
- [x] V3 Ranged cast frame (clear cast + trajectory)

### Mobile 390x844
- [x] M1 Neutral frame
- [x] M2 Melee impact frame
- [x] M3 Ranged cast frame
- [x] M4 HUD overlap check (none)

Evidence path: `web/ops/ws25-evidence/` (before + after)

---

## Technical TODO (current code targets)
- [x] `web/app/components/BabylonArena.tsx` — full-bleed arena behavior + responsive safe-zone logic
- [x] `web/app/components/arena/CinematicBattle.tsx` — non-debug live HUD composition, mobile overlay policy
- [x] `web/app/components/arena/BattleHUD.tsx` — compact FFA-ready HUD cards
- [x] `web/app/game/PitScene.ts` — style presets, camera lock, VFX language, readability tuning

---

## Branch / PR Plan
- [x] Create branch: `feat/ws25-game-presentation-reset`
- [x] Implement in focused commits by workstream (A-C this run)
- [ ] Open new PR from WS25 branch (do not reuse old narrative)
- [ ] Keep PR #68 open as prototype/reference until WS25 evidence passes

---

## Open Questions
- [ ] Should side panels be fully removed from live match mobile mode, or available via tap-to-expand drawer?
- [ ] Should PR #67 be closed now as superseded by ws24/ws25 path?
- [ ] Are benchmark frame PNGs committed in a permanent path, or still temp-only?
- [ ] Should brain stream UI be behind a debug toggle globally?
