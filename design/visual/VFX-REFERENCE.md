# VFX Reference Sheet — Sprint 2 Priority Items
*Deep Brine Studios — The Molt Pit*
*For procedural implementation in Babylon.js*

---

## Design language

All VFX share the same visual grammar as the character art:
- **Bioluminescent glow** — light comes FROM the combatant, not the environment
- **Cel-shaded particles** — flat shaded, high contrast, no soft gradients
- **Thick outlines on key frames** — flash of outline at impact/trigger moments
- **Color = information** — each effect has one dominant color that matches its item

---

## Priority 1 VFX

---

### 1. WIDOW — "Shell cracks and reassembles, HP slams to 1"

**Trigger:** Incoming hit that would reduce HP to 0. Fires once per fight.

**Sequence (total ~1.2s):**
```
0.0s  — Impact flash: full-screen white flash (2 frames, hard cut)
0.05s — Shell CRACK: radial fracture lines burst from impact point
         Color: #FFFFFF → #111111 (white cracks on black shell)
         Shell pieces begin separating outward (6–8 chunks)
0.3s  — FREEZE FRAME: 3 frames held — broken shell suspended mid-air
         HP bar slams to 1 (red bar almost empty)
         Sound: ui/widow-save.mp3
0.35s — REASSEMBLE: shell chunks fly back at 3× speed (ease-in-out)
         Magnetic snap-back motion
         Trailing particles: deep void purple (#1A0033)
0.8s  — SEAL: final chunk locks, shell glows briefly black with purple edge
0.9s  — PULSE: one low-pressure bioluminescent pulse outward
         Color: #9C27B0 (rare/ghost color — The Widow's mark)
1.2s  — State: normal, HP = 1
```

**Color palette:** `#111111` (void black), `#9C27B0` (widow purple), `#FFFFFF` (crack flash)
**Babylon.js hint:** ParticleSystem with `emitFromMesh` at shell attachment bone. SpriteAnimation for crack overlay on shell mesh. Use `AbstractMesh.scaling` tween for the reassemble snap.

---

### 2. INVERTER — "Shell pulses inverted colors, incoming particles reverse"

**Trigger:** Active buff state while HP > 50%. Persistent visual while active.

**Idle state (looping):**
```
— Shell material inverts: orange-red shell becomes cyan-blue
— Slow breathing pulse: opacity 100% → 80% → 100% (2s loop)
— Incoming particle effects play in reverse (trail particles move toward attacker)
— Color: invert of species base color (lobster orange → teal, crab red → cyan)
```

**On hit while INVERTER active:**
```
0.0s  — Impact point: normal hit particles REVERSE direction (fly back at attacker)
         Color: complement of hit color (orange hit → blue reverse)
0.1s  — Shell inversion pulse brightens for 3 frames
0.2s  — Healing orb rises from hit point
         Small glowing green (#00C853) sphere, floats up 20 units
0.4s  — Orb absorbed into torso (bioluminescent green flash)
         HP bar increments
         Sound: items/carapace/inverter-heal.mp3
```

**Color palette:** `#00C853` (HP green), inverted species base color, `#FFFFFF` (pulse)
**Babylon.js hint:** Swap shell material `diffuseColor` on equip. Reverse particle velocity via `direction` property negation. HP gain: rising `GlowLayer` point light.

---

### 3. WIDOW-MAKER — "Cinematic slow-motion swing, claws shatter after"

**Trigger:** Widow-Maker claws attack (single-use).

**Sequence (total ~2.0s):**
```
0.0s  — CHARGE: claws glow deep crimson (#D32F2F), crackling energy builds
         Camera slight push-in (0.95× FOV over 0.3s)
         Sound: items/claws/widow-maker-hit.mp3 starts
0.3s  — SLOW-MO: time scale → 0.1× for 0.4s
         Claw swing animation plays at 10% speed
         Trail effect: deep red motion blur behind claws
         Cinematic bars appear (black 16:9 bars slide in)
0.7s  — IMPACT: full-speed resume, time scale → 1.0×
         Hit: shockwave ring emits from impact point
         Color: #D32F2F expanding ring
         Screen shake (0.15s, amplitude 8)
         Cinematic bars slide out
1.0s  — SHATTER: claw mesh breaks apart (6–8 pieces fly outward)
         Pieces fade out over 0.8s
         Color: dark steel gray (#37474F)
         Sound: items/claws/widow-maker-break.mp3
1.8s  — Empty claw socket visible — no claws remain
         Subtle glow from socket: ember cooling effect
2.0s  — State: claws slot empty
```

**Color palette:** `#D32F2F` (crimson charge), `#37474F` (shattering metal), `#FF6F00` (cooling ember)
**Babylon.js hint:** `scene.getAnimationRatio()` override for slow-mo. ShaderMaterial for the impact ring. Morph targets or `dispose()` + spawn debris meshes for shard effect.

---

### 4. THE FLICKER — "Laceration marks accumulate, brine leak at 8 stacks"

**Trigger:** Each hit with The Flicker adds 1 stack (max 8). Visual escalates with stacks.

**Stack progression on target shell:**
```
Stack 1-2: Single hairline scratch visible on shell surface
           Color: #FFEB3B yellow-white scratch lines
Stack 3-4: 2–3 scratches, faint yellow particle drift from wounds
           (tiny floating motes, bioluminescent yellow)
Stack 5-6: Scratches deepen, orange-tinted
           Occasional spark at wound sites
Stack 7:   Shell visibly cracked at scratch sites
           Persistent particle emission: orange sparks (#FF7043)
Stack 8:   BRINE LEAK — pressurized bioluminescent fluid jets from cracks
           Color: #26C6DA (teal brine)
           Continuous upward jet particles (10–15 particles/frame)
           Shell shows deep cyan-glowing fissures
           Target debuff icon appears
           Sound: looping wet hiss
```

**On-hit VFX (each stack):**
```
— Small spinning blade hit flash: yellow-white burst (4 frames)
— New scratch mark "stamps" onto shell
— Stack counter increments
— Sound: items/claws/the-flicker-hit.mp3
```

**Color palette:** `#FFEB3B` (early scratches), `#FF7043` (deep damage), `#26C6DA` (brine leak)
**Babylon.js hint:** Decal system for accumulating scratch marks on shell mesh. `ParticleSystem.minEmitRate` scales with stack count. At stack 8, switch particle direction to upward jets.

---

### 5. SECOND WIND — "Shell cracks, reforms, energy burst"

**Trigger:** HP hits 0 for the first time. One-time revival.

**Sequence (total ~1.8s):**
```
0.0s  — DEATH START: creature begins death animation
         Screen begins to desaturate (gray vignette closes in)
         Sound: KO sound starts...
0.2s  — INTERRUPT: gold flash fills screen (2 frames) — #F9A825
         Death animation reverses
         Desaturation reverses
0.25s — CRACK: shell fractures in ALL directions simultaneously
         White fracture lines radiate from center
         Shell pieces separate ~30 units outward, slow
0.5s  — VOID MOMENT: 2-frame hold. Creature's inner bioluminescence visible.
         Core glows gold (#F9A825) — the Second Wind organ
0.55s — REFORM: shell pieces SLAM back at 5× speed
         Shockwave ring at collision point: gold expanding ring
         Screen shake (0.2s)
         Sound: items/tomalley/second-wind-revive.mp3
0.8s  — BURST: omnidirectional energy burst outward
         Particles: gold sparks + small brine droplets
         HP bar fills to 40%
         "SECOND WIND" text flash (arcade style, gold, 0.3s, then fades)
1.5s  — Glow settles. Creature stands. Ready.
1.8s  — State: HP = 40%, Second Wind spent (visual indicator: faint gray tint on Second Wind slot icon)
```

**Color palette:** `#F9A825` (gold revival), `#FFFFFF` (fracture flash), `#26C6DA` (brine scatter)
**Babylon.js hint:** Two-pass animation: start death anim → interrupt via `animationGroup.stop()` → play reverse. GoldGlowLayer on core mesh during void moment. HP tween via custom easing.

---

## Shared VFX Assets

These can be shared across multiple effects:

| Asset | Used by | Description |
|-------|---------|-------------|
| `ShockwaveRing` | WIDOW-MAKER, SECOND WIND | Expanding flat torus, fades out |
| `CrackOverlay` | WIDOW, SECOND WIND, FLICKER-8 | Radial fracture line sprite |
| `BiolumPulse` | WIDOW, INVERTER | Sphere pulse from creature origin |
| `GoldFlash` | SECOND WIND | Full-screen color flash, 2 frames |
| `DebrisShard` | WIDOW-MAKER | Small angular mesh, physics-lite tumble |

---

*Authored: Visual Director, WS19 | March 2, 2026*
*Ready for procedural implementation in Babylon.js*
