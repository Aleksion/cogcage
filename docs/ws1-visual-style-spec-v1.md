# WS1 Visual Style Spec v1

Owner: Daedalus  
Status: Draft for review

## 1) Creative Direction
**Tagline:** Playable manga broadcast.  
Blend: Real Steel impact + comic readability + F1 telemetry storytelling.

## 2) Visual Pillars
1. **Readability first** — viewer understands state in <3 seconds.
2. **Impact clarity** — every hit class has unique visual signature.
3. **Broadcastability** — overlays support spectator narratives.
4. **System legibility** — agent decisions are visible, not hidden.

## 3) Art Style Tokens
- Linework: bold black strokes (2px UI, 3–4px key cards)
- Texture: subtle halftone + paper grain background
- Shapes: rounded cards, hard-edged callout bursts
- Motion: snappy, high-contrast transitions (<250ms for HUD state changes)

### Palette (core)
- Ink Black: `#111111`
- Off White: `#F6F3EA`
- Signal Red: `#FF4D4D`
- Signal Yellow: `#FFD233`
- Signal Cyan: `#27D9E8`
- Steel Gray: `#6F7785`

## 4) In-Match HUD (always visible)
1. Left/Right fighter plates: HP, energy, cooldown strips
2. Center objective widget: control state + score delta timer
3. Tactic label per fighter: e.g., `Flank Left`, `Hold Zone`, `Burst Window`
4. Event rail (top): compact combat log with icon + short reason tags

## 5) VFX Taxonomy
### Melee
- Burst shape: chunky radial crack
- Color: red/yellow core
- Camera: micro hit-stop + shake
- Text pop: KAPOW / CRACK

### Ranged
- Trail shape: tapered beam/bolt
- Color: cyan/white
- Impact: sharp spark burst, less shake than melee
- Text pop: ZZT / WHIP

### Guard/Block
- Effect: frontal arc shimmer + ring pulse
- Color: white + steel cyan edge
- Audio pairing: metallic ping
- Text pop: CLANG / PARRY

### KO / Clutch
- Freeze frame 120–180ms
- High-contrast border flash
- Big winner banner + reason code

## 6) SFX Direction
- Exaggerated, arcade-clean, layered by mechanic class
- Priority mix order: hit confirmation > guard confirmation > ambient
- Avoid muddy low-end stacking during burst exchanges

Cue classes:
- Melee impact: metal thud + transient crack
- Ranged shot: plasma chirp + short tail
- Guard: ping/chime with short decay
- Objective tick: subtle metronomic pulse

## 7) Spectator/Broadcast Overlays
Required overlays:
1. Momentum bar (last 10s damage + zone pressure)
2. Energy trend mini-graph
3. Cooldown sync highlights
4. "Why" tags on major swings:
   - OUT OF ENERGY
   - GUARD ARC BROKEN
   - OPTIMAL RANGE HELD
   - COOLDOWN WINDOW MISSED

## 8) Camera Rules
- Default: side-angled isometric, center-weighted framing
- Auto-pan threshold: when fighters separate >40% arena width
- Zoom-in on close brawls; zoom-out on kiting chases
- No camera cuts that hide critical exchanges

## 9) Accessibility + Clarity
- Color is never sole signal (shape + icon redundancy mandatory)
- Text popups max 2 on screen per side at once
- HUD text minimum 14px equivalent
- High-contrast mode variant required

## 10) Acceptance Checklist (Visual)
- [ ] Spectator can identify who is winning in <3s
- [ ] Player can read own cooldown/energy state instantly
- [ ] Every action class has distinct visual + audio identity
- [ ] Replay explains at least 80% of decisive swings with reason tags
- [ ] No visual noise obscures combat contact points
