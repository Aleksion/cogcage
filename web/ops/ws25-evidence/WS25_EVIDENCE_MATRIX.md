# WS25 Evidence Matrix

Captured on 2026-03-03 from `/demo` after entering pit.

## Desktop

| Check | Before | After | Result |
|---|---|---|---|
| V1 Neutral frame | `before/before-desktop-neutral.png` | `after/after-desktop-neutral.png` | PASS |
| V2 Melee impact frame | `before/before-desktop-melee.png` | `after/after-desktop-melee.png` | PASS |
| V3 Ranged cast frame | `before/before-desktop-ranged.png` | `after/after-desktop-ranged.png` | PASS |

## Mobile 390x844

| Check | Before | After | Result |
|---|---|---|---|
| M1 Neutral frame | `before/before-mobile-390x844-neutral.png` | `after/after-mobile-390x844-neutral.png` | PASS |
| M2 Melee impact frame | `before/before-mobile-390x844-melee.png` | `after/after-mobile-390x844-melee.png` | PASS |
| M3 Ranged cast frame | `before/before-mobile-390x844-ranged.png` | `after/after-mobile-390x844-ranged.png` | PASS |
| M4 HUD overlap check | `before/before-mobile-390x844-hud-check.png` | `after/after-mobile-390x844-hud-check.png` | PASS |

## Notes

- Build verification: `cd web && bun run build` passes on WS25 branch.
- Runtime capture used Vite dev server with automated Playwright navigation and screenshot capture.
