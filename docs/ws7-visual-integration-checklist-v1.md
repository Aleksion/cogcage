# WS7 Visual Assets & Art Pipeline — Integration Checklist v1

Owner: Daedalus  
Status: In Progress  
Thread: [WS7] Visual Assets & Art Pipeline  
Spec ref: `ws1-visual-style-spec-v1.md`  
DoD: Core visual pack integrated into playable Friday demo.

---

## 1) Bot Sprites

| Asset | Status | Notes |
|-------|--------|-------|
| Player bot SVG (green, inline) | ⬜ | Replaces colored cell — robot/mech silhouette |
| Enemy bot SVG (red, inline) | ⬜ | Distinct silhouette from player bot |
| Obstacle tile texture | ⬜ | Dark crosshatch / crate pattern |
| Zone tile indicator | ⬜ | Objective zone highlight ring |

## 2) VFX — Combat

| Effect | Trigger | Status |
|--------|---------|--------|
| KAPOW burst (melee hit) | `attack` action connects | ⬜ |
| CRACK burst (heavy melee) | high-damage threshold | ⬜ |
| ZZT bolt (ranged shot) | `ranged` action fires | ⬜ |
| WHIP trail (ranged) | beam/trail from src→dst | ⬜ |
| CLANG ring (guard) | `guard` action fires | ⬜ |
| PARRY arc shimmer | guard absorbs hit | ⬜ |
| KO freeze frame | HP = 0 | ⬜ |
| KO winner banner | match end | ⬜ |

## 3) HUD Elements

| Component | Status | Notes |
|-----------|--------|-------|
| HP bar — player (green gradient) | ⬜ | Left fighter plate |
| HP bar — opponent (red gradient) | ⬜ | Right fighter plate |
| Energy bar — player | ⬜ | Below HP |
| Energy bar — opponent | ⬜ | Below HP |
| AP counter pills | ⬜ | Per-fighter, 3 pips |
| Tactic label chip | ⬜ | "FLANK LEFT" / "HOLD ZONE" |
| Event rail (top of arena) | ⬜ | Compact combat log, icons |
| Momentum bar | ⬜ | Last 10s damage + zone pressure |
| "WHY" reason tag overlay | ⬜ | Shown on decisive swings |
| Match timer | ⬜ | Countdown to 90s timeout |

## 4) Arena Map

| Element | Status | Notes |
|---------|--------|-------|
| Halftone paper background | ⬜ | Behind grid |
| Bold black grid outline | ⬜ | 3px stroke |
| Player cell → sprite | ⬜ | SVG bot replaces letter |
| Enemy cell → sprite | ⬜ | SVG bot replaces letter |
| In-range highlight | ✅ | Yellow ring — exists |
| Obstacle cell texture | ⬜ | Visual upgrade |

## 5) Typography & Polish

| Element | Status | Notes |
|---------|--------|-------|
| Bangers/Kanit fonts | ✅ | Already loaded |
| Hit pop text (CSS animation) | ⬜ | Float-up + fade-out |
| Winner banner (freeze + flash) | ⬜ | KO screen w/ reason code |
| Action callout chips | ⬜ | MOVE / ATTACK / GUARD styled |

## 6) Accessibility

| Check | Status |
|-------|--------|
| Color not sole signal (shape + icon redundancy) | ⬜ |
| Max 2 text pops on screen per side | ⬜ |
| HUD text ≥ 14px equivalent | ⬜ |

---

## Acceptance Gate (Visual)

- [ ] Spectator identifies who is winning in <3s
- [ ] Player reads own cooldown/energy state instantly
- [ ] Every action class has distinct visual + audio identity
- [ ] Replay explains ≥80% of decisive swings with reason tags
- [ ] No visual noise obscures combat contact points

---

## Implementation Notes

- All sprites: inline SVG in TSX — no external asset files required for Friday demo
- All VFX: CSS keyframe animations + React state triggers
- Bot sprites must be `<svg viewBox="0 0 40 40">` so they scale with grid cell size
- Comic burst text (KAPOW etc.) absolute-positioned over arena cell, auto-dismiss after 600ms
- Fonts already loaded: `Bangers` (display), `Kanit` (body) — use for all VFX text

## File Target

All changes land in: `web/src/components/Play.tsx`  
(Single file, self-contained — no new deps needed)

---

*Last updated: WS7 kickoff*
