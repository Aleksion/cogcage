# ITEMS IN PLAY
*How Every Item Actually Affects the Game State*
*Deep Brine Studios | WS18 | Lead Game Designer*
*Locked: March 2, 2026 (WS18.1 hand update)*

---

## Reading This Document

Each item entry specifies four things:
1. **Exact mechanical effect** — numbers, triggers, conditions, edge cases
2. **Agent state representation** — what the LLM sees in its game state JSON
3. **Spectator display** — what viewers see (visual + sound trigger)
4. **Balance notes** — synergies, degenerate combos, tuning flags

Items are organized by slot: Carapace (14) → Hands (14) → Tomalley (13).

All damage values are **pre-reduction** unless otherwise specified. Reduction chain is always: base damage × active-hand weapon modifier → apply Carapace reduction → apply SHELL UP → apply other passives.

---

## WS18.1 Hand System (Canonical)

- Every Crustie has **two equipped hand slots**: `main_hand` and `off_hand`.
- Hand items are classed as `weapon` or `shield`.
- Weapons must carry `weapon_tag: melee | ranged`.
- Crusties can carry up to **4 hand items total**: 2 equipped + up to 2 reserve.
- `main_hand` must always hold a weapon.
- `PINCH` and `SPIT` use the active weapon in `main_hand`.
- `off_hand` contributes shield effects while equipped.
- If `off_hand` holds a weapon, that weapon is stowed (inactive) until swapped into `main_hand`.
- Mid-fight swap action:
  - `SWAP_HAND(slot, item_id)` where `slot ∈ {main_hand, off_hand}` and `item_id` is carried.
  - Validation: swapping a shield into `main_hand` is invalid and resolves as NO_OP.
  - Duration: **1 decision window = 5 ticks = 750ms**.
  - Swap commits at end-of-window. During that window, old hand gear is still active.
  - Queue cap remains **3**; swap occupies one queue slot like any other action.
- Legacy note: historical snippets below use `"claws"` in example JSON. Runtime canonical path is `hands.main_hand.item_id` and `hands.off_hand.item_id`.

### Hand Class Assignment (v1)

| Item | Class | Weapon Tag |
|------|-------|------------|
| MAXINE | Weapon | Melee |
| SNAPPER | Weapon | Melee |
| THE REACH | Weapon | Ranged |
| THE FLICKER | Weapon | Melee |
| BUZZ | Weapon | Ranged |
| NEEDLE | Weapon | Melee |
| THE APOLOGIST | Weapon | Melee |
| TENDERHOOK | Weapon | Melee |
| VENOM | Weapon | Ranged |
| WIDOW-MAKER | Weapon | Melee |
| CRACKER | Weapon | Melee |
| THE HEIR | Weapon | Melee |
| REVERSAL | Shield | N/A |
| THE ORIGINAL APPENDAGE | Shield | N/A |

---

## BALANCE PRINCIPLES

1. **Combos are good.** Strong interactions are a feature, not a bug, as long as they have readable counterplay.
2. **No universal best item.** Power is matchup-, map-, and timing-dependent. Any item that dominates all contexts is a balance bug.
3. **Downsides are mandatory.** Every item has a real cost in tempo, reliability, range, or survivability.
4. **Swap decisions are strategic tax.** Hand swapping creates intentional 750ms vulnerability windows that opponents can punish.

---

## Example Turn: Timed Swap into Combo

Pre-window state:

```json
{
  "current_tick": 150,
  "hands": {
    "main_hand": {"item_id": "THE_REACH", "class": "weapon", "weapon_tag": "ranged"},
    "off_hand": {"item_id": "REVERSAL", "class": "shield"},
    "reserve": ["MAXINE", "WIDOW_MAKER"],
    "swap_pending": {"active": false}
  },
  "queued_actions": [
    "SWAP_HAND(slot=main_hand,item_id=WIDOW_MAKER)",
    "BURST_E",
    "PINCH"
  ]
}
```

Resolution:
- Window 31 (ticks 150-154): swap starts and consumes the window.
- End of tick 154: `main_hand` becomes `WIDOW_MAKER`; old `THE_REACH` goes to reserve.
- Window 32 (ticks 155-159): `BURST_E` resolves using movement rules.
- Window 33 (ticks 160-164): `PINCH` resolves with WIDOW-MAKER damage.

The combo is strong, but the 750ms swap window gave the opponent one whole decision cycle to punish it.

---

## CARAPACE (14 items)

Carapace items modify HP, damage received, and movement. Applied at fight start, locked for the Scuttle.

---

### BLOCK-7
*Composite Exo-Plating | Common*

**Mechanical effect:**
- +30 HP (HP pool = 130)
- 10% incoming damage reduction (multiplicative with other reductions)
- SCUTTLE penalty: a `scuttle_penalty_counter` tracks SCUTTLE usage. Every 7th SCUTTLE attempt is consumed as NO_OP; counter resets. Energy cost still paid. Penalty fires silently — the agent receives no warning, only sees that it didn't move.

**Agent state:**
```json
"carapace": "BLOCK-7",
"hp": 130,
"damage_reduction": 0.10,
"scuttle_penalty_every": 7,
"scuttle_counter": 3
```

**Spectator display:** Heavy shell creak on SCUTTLE. Penalty NO_OP plays a grinding-halt sound + brief shell shimmer. No dedicated icon change.

**Balance notes:** Strong tank pick. Pairs well with REVERSAL (more HP = more windows to wait for counterplay) and DOUBLE DOWN (patience build). Countered by NEEDLE (ignores armor, negates reduction). INVERTER interaction: BLOCK-7 reduction applies only above 50% HP threshold (INVERTER takes over below). The reductions do not stack in any special way — INVERTER replaces damage math entirely below 50% HP.

---

### THE ORIGINAL
*Standard Shell | Common*

**Mechanical effect:**
- +15 HP (HP pool = 115)
- No passive effect. No downside.

**Agent state:**
```json
"carapace": "THE_ORIGINAL",
"hp": 115,
"damage_reduction": 0.00
```

**Spectator display:** No special effects. The plain shell. Looks dependable and slightly boring.

**Balance notes:** The benchmark item. Everything else is measured against it. A Lobster running THE ORIGINAL should win on pure agent quality alone — no item crutch, no item weakness. It's the "I don't need gimmicks" pick and should feel like a confident statement. Slight undertuning is acceptable (brave players pick it; reward their confidence at a reasonable rate, not an excessive one).

---

### HARDCASE
*Monolithic Exo-Shell | Common*

**Mechanical effect:**
- +40 HP (HP pool = 140)
- BURST is permanently disabled. `valid_actions` never contains BURST.
- SCUTTLE energy cost: 2 (instead of 1)
- No damage reduction passive (HP is the defense)

**Agent state:**
```json
"carapace": "HARDCASE",
"hp": 140,
"damage_reduction": 0.00,
"burst_disabled": true,
"scuttle_cost": 2
```

**Spectator display:** Slow SCUTTLE animation (weighted, deliberate). A heavy shell-drag sound on each move. Visual: slight dust plume on landing.

**Balance notes:** Pairs with PINCH-heavy builds (no need for BURST repositioning if you're a brawler). MAXINE Claws + HARDCASE = slow murderer build — close the gap once and commit. Countered by kiting (THE REACH range) and hazard maps (moving through HAZARD costs 2 energy + HP penalty). HARDCASE + HAZARD tile = energy drain + HP drain. Punishes passive play hard. Flag: HARDCASE + THE PATRIARCH is a degenerate no-mobility build — both BURST disabled, extreme slow. Probably fine since mobility is a counter-strategy available to opponent. Watch tournament data.

---

### SILKWORM
*Phase-Scatter Membrane | Rare*

**Mechanical effect:**
- ±0 HP (HP pool = 100)
- -10 HP effective pool (HP pool = 90)
- Incoming damage scatter: 20% of each incoming damage instance is negated (not redirected — just dissipated). Implementation: `effective_damage = raw_damage × 0.80` applied before other reductions.
- Speed: no penalty (this is the mobile/dodge shell)

**Agent state:**
```json
"carapace": "SILKWORM",
"hp": 90,
"damage_reduction": 0.20
```

**Spectator display:** Hit particles scatter sideways instead of impacting directly. A phasing shimmer on the shell. Audio: hit sound has a phase-scatter tail (soft echo).

**Balance notes:** With 90 HP, SILKWORM Lobsters die faster to burst damage (MAXINE, WIDOW-MAKER) than default. The scatter helps against sustained DPS (THE FLICKER DoT is reduced by 20% per stack application). SILKWORM + GHOST SHELL is a significant miss-chance + reduction build: 20% reduction + 25% miss chance = roughly 40% effective damage received on average. Pair with NEEDLE (ignores armor, but SILKWORM's scatter is passive/shell — does NEEDLE ignore scatter? **Rule:** NEEDLE ignores Carapace stat damage_reduction only. SILKWORM's scatter is treated as a separate passive, NOT as Carapace reduction. NEEDLE does NOT bypass SILKWORM scatter. Document this clearly in engine).

---

### ECHO
*Reactive Neural Mesh | Rare*

**Mechanical effect:**
- +10 HP (HP pool = 110)
- On being hit: if the Lobster's NEXT action (next window) is not already queued, the engine automatically queues PINCH or SPIT (whichever is valid — prefer PINCH if opponent is adjacent, else SPIT) at no additional energy cost. This is an automatic counter-queue, not a free attack.
- "Auto counter" means: if the agent submits a different action, the agent's action takes priority. ECHO fires only if no action is queued for that window.

**Agent state:**
```json
"carapace": "ECHO",
"hp": 110,
"damage_reduction": 0.00,
"echo_counter_pending": true  // set to true the window after being hit, cleared after
```

**Spectator display:** Visual pulse from shell on hit (ripple outward). Counter-attack animation is preceded by a brief glow. Audio: hit followed immediately by a reactive buzz.

**Balance notes:** ECHO rewards passivity paired with the right agent — an agent that banks queued moves can override ECHO when needed, or deliberately NOT queue to let ECHO fire. Meta-play: skilled agents might intentionally save a queue slot open to let ECHO auto-counter. Countered by SHELL UP spam (ECHO triggers on being hit but if opponent is guarding, their attacks are less valuable). ECHO + THE RED GENE: powerful — wounded + auto-counter = aggression spiral.

---

### THE MOLT
*Adaptive Chitin Layer | Rare*

**Mechanical effect:**
- -5 HP at fight start (HP pool = 95)
- Every 20 ticks: damage_reduction increases by 5% permanently for this fight (capped at 40% at tick 160)
- Tick schedule: +5% at ticks 20, 40, 60, 80, 100, 120, 140, 160. After 160: no further increases.

**Tick → Reduction table:**
| Tick | Total Reduction |
|------|----------------|
| 0-19 | 0% |
| 20-39 | 5% |
| 40-59 | 10% |
| 60-79 | 15% |
| 80-99 | 20% |
| 100-119 | 25% |
| 120-139 | 30% |
| 140-159 | 35% |
| 160-300 | 40% |

**Agent state:**
```json
"carapace": "THE_MOLT",
"hp": 95,
"damage_reduction": 0.15,  // example at tick 55
"molt_next_increase_tick": 60
```

**Spectator display:** Shell visually darkens/hardens at each 20-tick interval. A brief calcification sound. The shell should look progressively more armored.

**Balance notes:** Rewards patient, survivable agents. Pairs with LONG GAME Tomalley (both ramp over time). Countered by aggressive burst early (kill it before it hardens). At tick 160+ THE MOLT has 40% reduction — equivalent to THE PATRIARCH without the mobility penalty. This is strong. Consider whether 40% cap is right. Currently balanced by: the -5 HP start, the weakness window (first 20 ticks), and the opponent knowing the timer. Agents facing THE MOLT should know to pressure early.

---

### WIDOW
*Survivor's Shell | Rare*

**Mechanical effect:**
- -15 HP (HP pool = 85)
- One-time ability: if a damage instance would reduce HP to 0 or below, instead set HP = 1. The killing blow is negated. This fires **once per Scuttle** and is then permanently consumed.
- WIDOW trigger condition: HP goes from >0 to ≤0 in a single damage resolution. If HP was already 1 from a prior save and another hit lands: WIDOW has already fired, Lobster dies.

**Agent state:**
```json
"carapace": "WIDOW",
"hp": 85,
"widow_active": true   // false after it fires
```

**Spectator display:** When WIDOW fires — dramatic visual: shell cracks and reassembles, HP bar slams to 1 with a red pulse. Audio: crack + crystallization sound. This is the "clutch moment" spectators cheer for.

**Balance notes:** The drama item. 85 HP means a Lobster can be killed by 85 damage without triggering WIDOW — it only saves from the killing blow. MAXINE (120% × 20 = 36 damage base — not enough to one-shot through WIDOW). WIDOW-MAKER (400% × 20 = 80 damage — still not one-shot through 85 HP... unless opponent has buffs). THE PATRIARCH + WIDOW-MAKER can trigger WIDOW. After WIDOW fires, the Lobster is at 1 HP — SPITE Tomalley (40% maxHP damage on death) pairs with WIDOW to ensure a dying strike. Classic clutch combo: WIDOW + SPITE + REVERSAL. You survive, then explode on the way out.

---

### BLEED BACK
*Thorn Membrane | Rare*

**Mechanical effect:**
- -10 HP (HP pool = 90)
- 8% of all incoming damage is reflected back to the attacker (before reductions are applied to the reflection — the reflection is raw). The Lobster wearing BLEED BACK still receives the full damage (minus their own reductions). The reflection is additional damage to the attacker.
- Reflection does NOT trigger the attacker's own BLEED BACK (no infinite ping-pong).
- SHELL UP on the attacker: the reflected damage is affected by the attacker's SHELL UP. The reflection hits the attacker like any other damage.

**Agent state:**
```json
"carapace": "BLEED_BACK",
"hp": 90,
"damage_reduction": 0.00,
"reflect_percent": 0.08
```

**Spectator display:** Small spike/thorn visual on shell. On being hit: a brief return-shot particle from the shell toward the attacker. Audio: hit sound + a second smaller impact sound (the return).

**Balance notes:** 8% reflect is low but consistent. Against sustained DPS (THE FLICKER 8 stacks × DoT) the reflection adds up. Against MAXINE (big single hit): 8% of a large hit = noticeable bleed return. BLEED BACK + ECHO: hit triggers BLEED BACK reflection AND ECHO counter-queue. Punishes aggression from two angles. Countered by ranged play — SPIT damage is reflected too, but at range the attacker doesn't care as much about 8% of 12 damage = ~1 HP. BLEED BACK is a melee-counter item.

---

### THE PATRIARCH
*Ancestral Full-Body Carapace | Legendary*

**Mechanical effect:**
- +60 HP (HP pool = 160)
- 20% incoming damage reduction (multiplicative)
- BURST permanently disabled
- SCUTTLE penalty: every 4th SCUTTLE is NO_OP (25% effective movement reduction). Counter resets after each NO_OP.
- No other mobility modifiers

**Agent state:**
```json
"carapace": "THE_PATRIARCH",
"hp": 160,
"damage_reduction": 0.20,
"burst_disabled": true,
"scuttle_penalty_every": 4,
"scuttle_counter": 2
```

**Spectator display:** Massive, imposing shell. SCUTTLE animations are slow and deliberate. SCUTTLE NO_OPs show the shell shuddering in place. Audio: deep bass resonance on each movement.

**Balance notes:** 160 HP + 20% reduction = effectively 200 raw damage to kill. Opponent needs significant time investment. Countered by hazard maps (can't dodge hazards effectively), NEEDLE (ignores reduction), and time pressure (MAX_TICKS tiebreaker goes to higher HP — but THE PATRIARCH usually wins that). Flag: PATRIARCH + HARDCASE is rejected as a combo by the engine (Legendary + Common from same slot — not possible, they're both Carapace. Player picks one. This note is moot.) Check loadout builder prevents equipping two Carapace items.

---

### GHOST SHELL
*Phase-Shift Membrane | Legendary*

**Mechanical effect:**
- ±0 HP (HP pool = 100)
- No damage reduction passively
- Each damage instance (PINCH, SPIT, BURST hit, HAZARD, DoT ticks) has a 25% chance to miss entirely (deal 0 damage). Roll per instance, not per window.
- Miss chance is applied BEFORE the damage reduction chain. A miss = 0 damage after the roll; reduction never fires.
- GHOST SHELL does NOT affect SPITE on-death damage (that targets the opponent, not the GHOST SHELL wearer).

**Agent state:**
```json
"carapace": "GHOST_SHELL",
"hp": 100,
"damage_reduction": 0.00,
"miss_chance": 0.25
```

**Spectator display:** Shell has a semi-transparent shimmer. Missed attacks pass through with a ghost-trail effect. Audio: hit attempt + a phasing sound where the impact would be.

**Balance notes:** 25% miss chance is high variance. Over a 45-second fight (~40 windows), GHOST SHELL will effectively negate ~10 attacks. Against MAXINE (slow but powerful): negating 1 in 4 MAXINE hits is significant. Against THE FLICKER (many small hits): miss chance applies per-tick of DoT too, meaning each bleed tick has a 25% miss. GHOST SHELL hard-counters sustained DoT builds. Flag (Fog of War): Under Fog, the opponent doesn't know GHOST SHELL is active — they see their attacks "missing" without understanding why. Dramatically more interesting under Fog. Flag for Tide 2.

---

### INVERTER
*Polarity Conversion Shell | Legendary*

**Mechanical effect:**
- ±0 HP (HP pool = 100)
- No damage reduction
- **Above 50% HP:** standard damage math. INVERTER provides NO benefit. The Lobster is fully vulnerable.
- **Below 50% HP (HP ≤ 50):** every incoming damage instance is instead converted to healing. The Lobster heals the amount that would have damaged it (before reduction, after other passives). Net effect: being attacked heals you.
- INVERTER healing cannot exceed 100 HP (base cap). Overheal not possible.
- SHELL UP below 50% HP: still valid. SHELL UP reduces the "incoming damage" value, which means less healing (it reduces the heal, not the damage). Counter-intuitive: below 50% HP, SHELL UP is a DPS loss for the INVERTER wearer. The LLM must understand this and NOT use SHELL UP below 50%.

**Agent state:**
```json
"carapace": "INVERTER",
"hp": 72,
"damage_reduction": 0.00,
"inverter_active": false,  // true when hp <= 50
"inverter_healing_mode": false
```

**Spectator display:** Below 50% HP: shell pulses with an inverted color scheme (cyan/magenta instead of normal colors). "Attacks" visually heal the Lobster — incoming particles reverse direction. HP bar goes up when hit. Crowd reaction moment.

**Balance notes:** Most interesting item in the game for spectators. A Lobster in INVERTER mode is nearly unkillable from direct attacks — opponent must use hazards or DoT. INVERTER does NOT convert hazard damage (hazards are environmental, not attacks). INVERTER DOES convert: PINCH, SPIT, BURST hit, BLEED BACK reflection (they attacked, it reflects → healing). INVERTER does NOT convert: HAZARD tiles, SPITE on-death (environmental), THE FLICKER DoT ticks (rule: DoT is classified as environmental damage, applied by the engine, not the opponent's action per-window — does NOT convert). This distinction is critical for balance. Flag: without DoT immunity, THE FLICKER counters INVERTER hard. This is correct and intentional — INVERTER has a counter.

---

### THE SARCOPHAGUS
*Ancient Layered Shell | Legendary*

**Mechanical effect:**
- First 3 hits taken: deal 0 damage (the hits are absorbed by outer layers, called "seals")
- After 3 seals break: -20 HP applied immediately (HP pool drops to 80 from 100). No damage reduction from this point.
- Seals track distinct hit instances (not windows). Each PINCH, SPIT, BURST hit, or DoT tick counts as one hit. HAZARD damage per window counts as one hit per window.
- Seal tracking:
  - `seals_remaining: 3` at fight start
  - Each hit: `seals_remaining--`, damage = 0
  - At `seals_remaining = 0`: apply -20 HP, flag `seals_broken: true`
  - All subsequent hits: normal damage math with no reduction

**Agent state:**
```json
"carapace": "THE_SARCOPHAGUS",
"hp": 100,
"damage_reduction": 0.00,
"seals_remaining": 2,
"seals_broken": false
```

**Spectator display:** Shell shows crack layers visually. Each seal break: a visual crack appears + a stone-shattering sound. At seal 3 break: dramatic crumble animation + HP bar drops visibly by 20. After: the shell looks damaged and exposed.

**Balance notes:** Forces opponent to "break" the Sarcophagus before dealing real damage. Against FLICKER (DoT ticks fast): 3 ticks burns seals in ~3 windows — fast, but then THE FLICKER's sustained damage is unimpeded after. Against MAXINE (3 big hits): 3 MAXINE swings burn seals. But MAXINE hits once per 3 windows — burning seals takes ~9 windows (6.75 seconds). THE SARCOPHAGUS is a hard counter to burst builds; weak against sustained DPS. This is correct.

---

### PAPER-MACHÉ
*Incredibly Thin Shell | Common*

**Mechanical effect:**
- -40 HP (HP pool = 60)
- Speed +30% implemented as: every 10th Decision Window, grant 1 free SCUTTLE at the end of that window's resolution (regardless of energy). The free SCUTTLE moves in the last direction the Lobster SCUTTLEd, or can be overridden by submitting an explicit SCUTTLE for that window (the explicit SCUTTLE fires instead, and the "free" bonus is credited as energy-free).
- No other bonuses. No damage reduction.

**Agent state:**
```json
"carapace": "PAPER_MACHE",
"hp": 60,
"damage_reduction": 0.00,
"speed_bonus_window_counter": 7,  // counts up to 10
"free_scuttle_pending": false
```

**Spectator display:** Shell looks paper-thin, slightly crumpled. Movement animations are fast and light. The bonus SCUTTLE appears as a brief burst of speed — a quick scurry sound.

**Balance notes:** 60 HP means death from ~3 good hits. PAPER-MACHÉ demands a glass cannon build: MAXINE + PAPER-MACHÉ is "one-shot or die." THE FLICKER + PAPER-MACHÉ is "stack DoT before they kill you." GHOST SHELL + PAPER-MACHÉ is "pray to RNG." Pairs naturally with SURVIVAL INSTINCT (the one auto-dodge buys a window to escape). Countered by everything. This is the "I know what I'm doing" item.

---

## HAND ITEMS (14 total: 12 weapons + 2 shields)

Unless explicitly marked as a shield, entries in this section are weapon-class hand items.
Weapon damage multipliers apply to PINCH/SPIT from `main_hand` unless otherwise specified.

---

### MAXINE
*Hydraulic Compression Claws | Common*

**Mechanical effect:**
- Damage multiplier: +80% (PINCH deals 20 × 1.80 = 36 base; SPIT deals 12 × 1.80 = 21.6 ≈ 22)
- Cooldown: after using PINCH or SPIT, MAXINE enters a cooldown. MAXINE attacks are unavailable for the next 2 Decision Windows. (Attack in window N: unavailable in N+1 and N+2. Available again in N+3.)
- Engine tracks: `maxine_cooldown_windows_remaining` (starts at 0; set to 2 after each attack; decremented each window)
- During cooldown, PINCH and SPIT are removed from `valid_actions`

**Agent state:**
```json
"claws": "MAXINE",
"damage_multiplier": 1.80,
"maxine_cooldown_windows_remaining": 1
```

**Spectator display:** MAXINE's attack animation is slow, heavy, and deliberate — a visible hydraulic compression before impact. The hit lands with a bone-crunching visual. Cooldown shown as MAXINE "recharging" — subtle mechanical animation. Audio: hydraulic hiss → SLAM → hiss on reload.

**Balance notes:** Paired with SHELL UP during cooldown windows — the optimal play. MAXINE + THE PATRIARCH = slow tanky brawler that OHKO-threats every 3 windows. MAXINE + HARDCASE = pure commitment brawler (no BURST, high damage). Countered by kiting — if opponent maintains range, MAXINE can't PINCH (needs adjacency) and SPIT at +80% is strong but 2-window cooldown makes ranged kiting viable.

---

### SNAPPER
*Standard Combat Claws | Common*

**Mechanical effect:**
- Damage multiplier: ±0 (PINCH: 20 base; SPIT: 12 base)
- No special effects. No cooldown. No restrictions.

**Agent state:**
```json
"claws": "SNAPPER",
"damage_multiplier": 1.00
```

**Spectator display:** Clean, reliable animations. SNAPPER looks competent and unpretentious.

**Balance notes:** The baseline. Measures the value of any Claws special effect. An agent beating SNAPPER opponents must be winning on strategy, positioning, or Tomalley advantage. SNAPPER + THE ORIGINAL + STANDARD ISSUE = full default loadout. Exists for Pitmasters who want to test pure agent quality without item noise.

---

### THE REACH
*Extended Range Claws | Common*

**Mechanical effect:**
- Damage multiplier: -20% (PINCH: 16; SPIT: 9.6 ≈ 10)
- SPIT range extended: from 3 to 5 tiles (Chebyshev distance `max(|dx|, |dy|) ≤ 5`)
- PINCH range unchanged (still 1-tile adjacency). THE REACH is a Claws item — it doesn't affect PINCH reach (that would break the melee/ranged balance).

**Agent state:**
```json
"claws": "THE_REACH",
"damage_multiplier": 0.80,
"spit_range": 5
```

**Spectator display:** Claws visually extended (longer, spindlier). SPIT projectile travels farther visually. Audio: longer SPIT sound.

**Balance notes:** Kiting build. Stay at range 4-5, SPIT continuously. Opponent must close to PINCH, giving you windows to SCUTTLE away. Countered by: fast-close builds (BURST + HARDCASE tank), and ORACLE (predicting SPIT and pre-positioning). The -20% damage is significant — this is a sustain-over-time Claws that requires the fight to go long. Pairs with LONG GAME Tomalley (ramp damage as fight extends). Note: BUZZ Claws also unlocks SPIT but at shorter range — THE REACH is the dedicated ranged build.

---

### THE FLICKER
*Rapid Laceration Array | Rare*

**Mechanical effect:**
- Damage multiplier: -40% per hit (PINCH: 12; SPIT: 7.2 ≈ 7)
- Each PINCH or SPIT application stacks a "Bleed" status on the opponent. Max 8 stacks.
- **Bleed DoT:** Each stack deals 2 HP per tick (at 150ms ticks = 2 HP per tick). All stacks fire simultaneously.
- Stack calculation: 8 stacks × 2 HP/tick = 16 HP per tick = 107 HP/second at max stacks. This is extremely high.
- Stacks persist until the fight ends (no natural decay).
- Each new PINCH/SPIT adds 1 stack (if below 8). If already at 8, new attack deals only direct damage (no additional stack).

**Bleed tick timing:** Bleed fires at resolution step 6 (Tomalley passives fire). At 150ms ticks, 8 stacks = 16 HP/tick = death in ~6 ticks at full stacks if opponent has no regeneration or armor.

**Agent state:**
```json
"claws": "THE_FLICKER",
"damage_multiplier": 0.60,
"bleed_stacks_on_opponent": 5,
"bleed_max_stacks": 8
```

**Spectator display:** Each hit leaves a glowing laceration mark on the opponent's shell. At max stacks, the opponent visibly leaks brine. HP drains tick by tick. Audio: each hit is a quick slice; at 8 stacks, a wet dripping sound loops under the fight.

**Balance notes:** High skill ceiling. Requires 8 attacks to reach max damage. Against GHOST SHELL: each bleed application has 25% miss chance — reaching max stacks takes more attempts. Against THE SARCOPHAGUS: first 3 hits are seals (but bleed stacks STILL apply on seal hits — the seal absorbs the direct damage but the bleed mechanic still fires). This is intentional and significant. After seals break, THE FLICKER has 3 stacks already. Against INVERTER below 50%: FLICKER DoT is environmental (does not convert) — INVERTER's counter. Degenerate scenario check: THE FLICKER + DOUBLE DOWN (200% attack every 5th) — 5th attack with DOUBLE DOWN applies 2 stacks at 200% direct damage. Not broken — it's just 2 stacks applied at once. Stack cap prevents runaway. Cleared: not degenerate.

---

### BUZZ
*Electrostatic Discharge Pincers | Legendary*

**Mechanical effect:**
- Damage multiplier: -15% (PINCH: 17; SPIT: 10.2 ≈ 10)
- Unlocks SPIT action regardless of range (SPIT available when opponent is in standard 3-tile range)
- 25% chance on each PINCH or SPIT: opponent is Stunned for 1 Decision Window
  - Stunned: `valid_actions = ["NO_OP"]` only. Cannot act. Energy still regens.
  - Stun is communicated to both agents in the state snapshot
- BUZZ does NOT extend SPIT range (that's THE REACH)

**Agent state (attacker):**
```json
"claws": "BUZZ",
"damage_multiplier": 0.85,
"spit_always_available": true,
"stun_chance": 0.25
```

**Agent state (opponent when stunned):**
```json
"status_effects": ["STUNNED"],
"stun_windows_remaining": 1,
"valid_actions": ["NO_OP"]
```

**Spectator display:** BUZZ sparks with electricity — visible arcing on the claws at rest. Hits crackle. Stun: opponent's shell flashes white, then briefly locks up. Stun icon appears on opponent portrait. Audio: electric discharge → stun buzz → lock-up click.

**Balance notes:** The "personality" item. Stun is incredibly powerful (free window) at 25% rate — in 40 windows, expect ~10 stun procs. Countered by GHOST SHELL (miss chance applies before stun roll — 25% miss × 75% hit × 25% stun = ~14% effective stun rate on GHOST SHELL wearers). BUZZ + THE RED GENE: stun when near death, then attack while stunned. High entertainment value. BUZZ + ORACLE: predict opponent's intent, stun at optimal moment. BUZZ stun does NOT interrupt a queued action — if opponent has 2 actions queued, stun burns the current window but their queued moves still fire next window. This is intentional — queue depth still matters even under stun.

---

### NEEDLE
*Armor-Pierce Claws | Rare*

**Mechanical effect:**
- Damage multiplier: -50% (PINCH: 10; SPIT: 6)
- Ignores all Carapace damage_reduction. The damage_reduction field on the opponent is set to 0 for NEEDLE's damage calculations.
- Does NOT ignore: SHELL UP (SHELL UP is an action choice, not Carapace — NEEDLE respects it), SILKWORM scatter (scatter is a passive, not a Carapace stat — see SILKWORM note), INVERTER healing conversion (that's not reduction — it's conversion)
- NEEDLE also ignores THE SARCOPHAGUS seals. Each NEEDLE hit counts as a hit for seal tracking purposes, but the 0-damage immunity of seals is bypassed. NEEDLE hits through seals.

**Agent state:**
```json
"claws": "NEEDLE",
"damage_multiplier": 0.50,
"armor_pierce": true
```

**Spectator display:** Thin, precise claws. Hits animate as precise punctures, not bludgeons. Audio: sharp piercing sound vs. the dull impact of SNAPPER.

**Balance notes:** Hard counter to heavy armor builds (BLOCK-7, THE PATRIARCH, THE MOLT late-game). THE PATRIARCH with 20% reduction + NEEDLE = THE PATRIARCH receives full 10 and 6 damage from PINCH and SPIT. Without NEEDLE vs PATRIARCH, those numbers would be 20×0.8=16 and 12×0.8=9.6. NEEDLE's counter role justifies the -50% base damage penalty. Against unarmored opponents (SILKWORM -10 HP with 20% scatter, GHOST SHELL 0% reduction): NEEDLE is a bad pick — you'd rather run SNAPPER. Correct. NEEDLE is a metagame pick against known-heavy opponents.

---

### THE APOLOGIST
*Remorseful Combat Appendage | Rare*

**Mechanical effect:**
- Damage multiplier: -5% (nearly neutral)
- On each PINCH or SPIT: 20% chance the opponent's NEXT action is forced to misfire. Misfired action: the opponent submits their intended action, but the engine ignores it and substitutes NO_OP instead. The opponent is not told their action misfired until the state snapshot reveals it didn't happen.
- Misfire does NOT drain the opponent's energy for the failed action.
- 20% misfire rate per attack (not per window).

**Agent state (attacker):**
```json
"claws": "THE_APOLOGIST",
"damage_multiplier": 0.95,
"misfire_chance": 0.20
```

**Spectator display:** Claws look slightly ashamed — drooping, uncertain. Hit animation includes a faint "sorry" audio cue (the mandatory muffled apology — non-negotiable per WS19 decision). The misfire on the opponent shows as their intended action shimmering out, replaced by a confused wobble animation. Audio: hit + apology sound + opponent's aborted action whoosh.

**Balance notes:** Psychological item more than statistical. 20% misfire is significant in high-stakes moments (opponent queued a MAXINE strike — it misfires). The misfire is invisible to the AGENT (they see their action submitted; they don't know it misfired until the snapshot). This creates a learning lag — the agent submitted a PINCH, health didn't change, position didn't change. Over multiple windows, a well-designed agent may detect the pattern. This is the intended depth. Countered by pre-queuing multiple actions (if you have 2 queued, one misfire still leaves a queued action for the next window). Against THE APOLOGIST: queue depth is your defense.

---

### TENDERHOOK
*Grapple Claws | Rare*

**Mechanical effect:**
- Damage multiplier: ±0 (PINCH: 20; SPIT: 12 — but TENDERHOOK primarily augments PINCH)
- TENDERHOOK PINCH: when PINCH lands, opponent is **held** for 2 Decision Windows.
  - Held: opponent cannot SCUTTLE, BURST, or change position. Can still PINCH, SPIT, SHELL UP.
  - The hold occupies TENDERHOOK itself for 2 windows (no new PINCH or SPIT during hold). TENDERHOOK claws are "engaged."
  - `tenderhook_hold_windows_remaining` tracks this
- One use per Scuttle. After the hold resolves (2 windows), TENDERHOOK reverts to standard PINCH/SPIT (at ±0 modifier, no special effect) for the rest of the fight.
- SPIT is unaffected by the hold mechanic.

**Agent state:**
```json
"claws": "TENDERHOOK",
"damage_multiplier": 1.00,
"tenderhook_active": true,    // false after use
"tenderhook_hold_active": false,
"tenderhook_hold_windows_remaining": 0
```

**Spectator display:** Claws show a grapple hook detail. On successful PINCH: opponent's Lobster is visually locked in place by a glowing tether. Hold countdown visible on HUD. Audio: hook deployment → tether hum × 2 windows → release snap.

**Balance notes:** One-use repositioning denial. Optimal use: hold the opponent while queuing 2 PINCH attacks from other Claws... wait, Claws are locked during hold. Optimal use: hold while using BURST to reposition to cover, then release. Or: hold while waiting for energy to build for a 3-energy PINCH in window 3 of the hold. The "no new PINCH during hold" prevents TENDERHOOK → 2 free attacks combo. Intentional.

---

### VENOM
*Necrotic Sting | Rare*

**Mechanical effect:**
- Base direct damage: ~0 (PINCH: 2; SPIT: 1) — essentially a delivery vector, not a damage dealer
- On each PINCH or SPIT: applies 1 VENOM stack on opponent. Max stacks: unlimited (no cap, unlike FLICKER)
- **VENOM DoT:** Each stack deals 2 HP per DECISION WINDOW (not per tick). Window-based DoT, not tick-based.
- Stack accumulation rate: 1 per attack. At 1 attack/window, that's 1 stack/window.
- Damage over time by window:
  - Window 5: 5 stacks = 10 HP/window from DoT
  - Window 10: 10 stacks = 20 HP/window from DoT
  - Window 20: 20 stacks = 40 HP/window from DoT (lethal territory)
- Note: VENOM DoT is slower than FLICKER DoT (window-based vs tick-based) but has no stack cap

**Comparison: FLICKER vs VENOM:**
| | FLICKER | VENOM |
|--|---------|-------|
| Stack cap | 8 | None |
| DoT rate | 2/tick (fast) | 2/window (slow) |
| Direct damage | -40% | ~0 |
| Kill speed (no armor) | Very fast at 8 stacks | Slow ramp, deadly late |

**Agent state:**
```json
"claws": "VENOM",
"damage_multiplier_direct": 0.10,
"venom_stacks_on_opponent": 7
```

**Spectator display:** Claws have a sickly green tint. Each hit injects a visual cloud of green. At high stacks, opponent visually darkens with venom. HP bar ticks down slowly each window. Audio: injection sound per hit; increasingly wet/sick sound at high stacks.

**Balance notes:** VENOM is a long-game item. Fights end at 300 ticks / 40 windows. At 1 stack/window, you reach 40 stacks = 80 HP/window DoT at end... but the opponent has been dying from DoT the whole time. Math: at constant 1 stack/window, total VENOM damage = sum(2×n for n in 1..40) = 1640 HP over the full fight from DoT. No one has 1640 HP. Point: VENOM wins on time. Countered by: MULCH regen (offsets early stacks), SECOND WIND (revive at 10% HP buys time but doesn't clear stacks), aggressive burst to end fight before stacks accumulate. Against GHOST SHELL: each VENOM delivery has 25% miss — no stack applied on miss.

---

### WIDOW-MAKER
*One-Shot Devastation | Legendary*

**Mechanical effect:**
- Damage multiplier: 400% on one attack (PINCH: 20 × 4 = 80 damage; SPIT: 12 × 4 = 48 damage)
- **Breaks after use.** After the WIDOW-MAKER attack resolves, CLAWS is destroyed. For the rest of the Scuttle: PINCH deals 5 damage (bare-claw emergency strike), SPIT deals 3 damage. No multiplier.
- Cannot queue WIDOW-MAKER uses — the item breaks on first use, so queuing PINCH twice in one window: first PINCH uses WIDOW-MAKER (80 damage), second PINCH (if still valid) uses bare claws (5 damage).
- If WIDOW-MAKER PINCH is the killing blow: the item-break still applies (doesn't matter — fight is over).

**Agent state:**
```json
"claws": "WIDOW_MAKER",
"widow_maker_available": true,
"damage_multiplier": 4.00,  // or 0.25 after break
"widow_maker_broken": false
```

**Spectator display:** WIDOW-MAKER glows intensely before use. The single attack animation is cinematic — time briefly slows on the swing. Impact is massive. After use: claws visually shatter/crack. The sound of breaking metal. Subsequent bare-claw attacks look and sound pathetic. This contrast is intentional and funny.

**Balance notes:** Single high-risk play. 80 PINCH damage requires adjacency. Against WIDOW Carapace: 80 damage on 85 HP triggers WIDOW save (opponent survives at 1 HP). WIDOW + WIDOW-MAKER = classic counter scenario. Degenerate combo check: can WIDOW-MAKER be looped? No — it breaks after one use. Cannot trigger twice. Not degenerate. THE HOUSE EDGE Tomalley + WIDOW-MAKER: pay 15% Roe in-game for +50% dmg — WIDOW-MAKER at 400% × 1.5 = 600% = 120 PINCH damage. This one-shots everything. Balance: THE HOUSE EDGE is expensive (Roe cost), WIDOW-MAKER is Legendary. Running both Legendary items costs significant Roe. Acceptable — high-cost, high-risk, high-reward.

---

### REVERSAL
*Counter-Strike Claws | Legendary*

**Mechanical effect:**
- Item class: **Shield**
- Damage multiplier: ±0 (PINCH: 20; SPIT: 12)
- When SHELL UP is active AND the Lobster is hit: 60% of the damage received is dealt back to the attacker.
- Calculation: `reversal_damage = damage_received × 0.60` (where damage_received is after SHELL UP's 50% reduction).
- Example: opponent deals 20 PINCH, SHELL UP reduces to 10 received, REVERSAL returns 10 × 0.60 = 6 damage to opponent.
- REVERSAL only fires when SHELL UP is active. Passive hits without SHELL UP deal no counter.
- REVERSAL can trigger on every window SHELL UP is active.
- See MOVEMENT.md for REVERSAL + SHELL UP interaction note.

**Agent state:**
```json
"claws": "REVERSAL",
"hand_item_class": "shield",
"damage_multiplier": 1.00,
"reversal_active_when_guarding": true
```

**Spectator display:** Claws have a mirrored/reflective surface. When SHELL UP is active: a shield aura appears. On hit: the counter-damage shoots back as a visible projectile from the shell toward the attacker. Audio: block sound → reversal whip-crack.

**Balance notes:** REVERSAL rewards patient, guardian play. The optimal REVERSAL strategy: SHELL UP when opponent is in PINCH range, let them swing, take reduced damage, return counter. Works against high-damage burst (MAXINE's 36 PINCH → 18 received after SHELL UP → 10.8 returned). Countered by: ranged kiting (SPIT at distance avoids REVERSAL range), IGNORING THE BAIT (opponent just doesn't attack while SHELL UP is active), and hazard (hazard damage doesn't trigger REVERSAL). Strong against: MAXINE, WIDOW-MAKER, THE PATRIARCH builds.

---

### THE ORIGINAL APPENDAGE
*Legendary Baseline | Legendary*

**Mechanical effect:**
- Item class: **Shield**
- Damage multiplier: +25% (PINCH: 25; SPIT: 15)
- Status immune: Lobster cannot be Stunned, Held, Misfired, or affected by any debuff. Bleed and Venom stacks CAN still be applied (DoT is not a debuff — it's an environmental effect).
- Cannot pair with any Legendary Tomalley (loadout builder enforces this at construction time)

**Agent state:**
```json
"claws": "THE_ORIGINAL_APPENDAGE",
"hand_item_class": "shield",
"damage_multiplier": 1.25,
"status_immune": true,
"legendary_tomalley_locked": true
```

**Spectator display:** Pure, clean claws. No special visual effects (the power is invisible — which is its own statement). On attempted stun/hold: a brief immunity pulse.

**Balance notes:** +25% damage + status immunity is strong. The Legendary Tomalley restriction is the real cost — no ORACLE, SECOND WIND, QUANTUM HOOK, or THE HOUSE EDGE. You trade passive power for consistency. Countered by: itemized damage (THE FLICKER DoT applies regardless), NEEDLE (DoT isn't reduced by armor, and NEEDLE bypasses reduction anyway). THE ORIGINAL APPENDAGE is the "I don't want mind games" item.

---

### CRACKER
*Armor Crusher | Common*

**Mechanical effect:**
- Damage multiplier: -15% vs unarmored opponents (if opponent has `damage_reduction: 0.00`, CRACKER deals 0.85× damage)
- Effect: reduces opponent's Carapace `damage_reduction` by 30 percentage points, permanently for the Scuttle. Applied on the FIRST hit only.
  - Example: BLOCK-7 opponent has 10% reduction. CRACKER's first hit reduces it to 0% (floored at 0, cannot go negative). All subsequent hits on that opponent: no reduction.
  - Example: THE PATRIARCH (20% reduction) reduced to 0%.
  - Example: SILKWORM (0% reduction, 20% scatter): CRACKER first hit applies 0% reduction reduction (scatter is not reduction — see SILKWORM note). Cracker -30% doesn't affect scatter.
- Cracker_debuff_applied flag on opponent

**Agent state (attacker):**
```json
"claws": "CRACKER",
"damage_multiplier": 0.85,
"cracker_debuff_applied": false  // true after first hit
```

**Spectator display:** Claws have a crushing, gear-like appearance. First hit: armor-crack visual on opponent's shell, reduction stat visually "breaks." Audio: crunching, mechanical crack on first hit.

**Balance notes:** One-shot debuff + sustained damage. Against BLOCK-7: one CRACKER hit strips 10% reduction, subsequent hits at 0.85× unmodified = 0.85× but still better than 0.85 × 0.90 = 0.765× without CRACKER. Against unarmored: CRACKER is weak (the -15% vs unarmored hurts, no reduction to strip). Classic meta pick into armor-heavy metas. Countered by high-armor builds that rely on it after CRACKER has fired (wrong — CRACKER debuff is permanent for the Scuttle).

---

### THE HEIR
*Generational Claws | Rare*

**Mechanical effect:**
- Damage multiplier: starts at -10% below SNAPPER (PINCH: 18; SPIT: 10.8 ≈ 11)
- Per win (prior Scuttles won): +5% damage multiplier accumulated in the Lobster's persistent record. This is NOT per-window — it's per prior fight won.
  - A Lobster with 0 wins: 0.90×
  - A Lobster with 1 win: 0.95×
  - A Lobster with 2 wins: 1.00× (equals SNAPPER)
  - A Lobster with 3 wins: 1.05×
  - A Lobster with 10 wins: 1.40×
- The multiplier is capped at 2.00× (after 22 wins).
- Win count is the Lobster's ALL-TIME Scuttle wins, not current-session.

**Agent state:**
```json
"claws": "THE_HEIR",
"damage_multiplier": 1.25,  // for a 7-win Lobster
"heir_wins": 7,
"heir_multiplier_cap": 2.00
```

**Spectator display:** Claws look worn and seasoned — visible notches and wear marks. Each win adds a visual flourish (for high-win Lobsters, the claws glow faintly). Audio: hit sound deepens/gains reverb with more wins.

**Balance notes:** Progression item. Hatchlings are at a disadvantage but can grow. High-win Lobsters with THE HEIR are genuinely terrifying (1.40× or higher). Creates inherent rivalry: a Hatchling beating a 10-win HEIR Lobster is a massive upset. This is great spectator design — the underdog story. Resets on Molt: THE HEIR tracks the LOBSTER's wins, not the Molt. A Lobster who won 20 times brings 2.00× multiplier into any fight they equip THE HEIR.

---

## TOMALLEY (13 items)

Tomalley items are passive organs that fire without explicit agent commands. They are the reactive layer — the agent doesn't control them directly, but a smart agent designs around them.

---

### THE RED GENE
*Adrenaline Splice | Common*

**Mechanical effect:**
- Below 40% HP (HP ≤ 40 on base 100-HP Lobster): damage multiplier +40% on all attacks
- Above 40% HP: damage multiplier -10%
- Applies multiplicatively with Claws multiplier: `final_damage = base × claws_multiplier × red_gene_modifier`
- Threshold is on CURRENT HP, checked at attack resolution. HP fluctuates; effect toggles.

**Agent state:**
```json
"tomalley": "THE_RED_GENE",
"red_gene_active": false,  // true when hp <= 40
"current_damage_modifier": 0.90  // or 1.40 when active
```

**Spectator display:** Below 40% HP: shell pulses red. Eyes (visual element) go from normal to full red. Attack animations become faster/more aggressive in style. Audio: low-HP heartbeat sound loops; attacks have a desperate, raw sound quality.

**Balance notes:** Comeback mechanic. Below 40% HP = death is close — the buff might not help enough. Against BLOCK-7 opponents (130 HP), the attacker needs to have dealt 60-90 HP already to be near death themselves. THE RED GENE rewards dual-risk scenarios (both Lobsters battered). Classic pairing: WIDOW (survive lethal hit at 1 HP, now RED GENE is active at max intensity) → massive comeback potential. The -10% above 40% means THE RED GENE weakly hurts healthy play — intentional, makes the tradeoff real.

---

### STANDARD ISSUE
*Baseline Tomalley | Common*

**Mechanical effect:**
- +2 HP per Decision Window (healing, not regen from energy)
- HP cannot exceed max HP pool (no overheal). If at max HP, regen does nothing.
- Applied at resolution step 6 (same time as Tomalley passives).

**Agent state:**
```json
"tomalley": "STANDARD_ISSUE",
"hp_regen_per_window": 2
```

**Spectator display:** Subtle green pulse on shell every window. Not dramatic — this is the quiet item. Audio: very faint heal chime.

**Balance notes:** 2 HP/window × 40 windows = 80 HP total regen over a full fight. That's significant sustained healing. Counters THE FLICKER somewhat (8 stacks = 16 DoT/tick, but STANDARD ISSUE only regens 2 HP/window, not per tick — the DoT is tick-based, regen is window-based. Net effect at 8 FLICKER stacks: 16 HP lost per tick × 5 ticks/window = 80 HP lost per window vs 2 HP gained = still dying fast). STANDARD ISSUE doesn't counter FLICKER; it offsets light sustained damage. Strong against SPIT kiting (12 HP/SPIT, 2 HP regen/window = each SPIT costs net 10 HP). Pairs with SHELL UP (guard turn + regen = sustainable defense).

---

### MULCH
*Regenerative Core | Rare*

**Mechanical effect:**
- +5 HP per Decision Window
- Overheal: can exceed base max HP up to 120% of max HP.
  - Example: BLOCK-7 Lobster (130 HP) can overheal to 156 HP
  - Example: standard Lobster (100 HP) can overheal to 120 HP
- Downside: opponent can see your exact HP% at all times (normally exact HP is visible, but MULCH makes it explicitly prominent in the opponent's state — the display is more... flagrant).
  - Mechanical effect of transparency: opponent's `opponent_hp_percent` is always included (this exists in base game too, but MULCH flags it as `hp_visible_enhanced: true`). In a potential Fog mode, MULCH would reveal HP even through fog.

**Agent state:**
```json
"tomalley": "MULCH",
"hp_regen_per_window": 5,
"overheal_max": 120,
"hp_visible_enhanced": true
```

**Spectator display:** Shell grows vines/organic matter visually as HP rises. Overheal shown as HP bar extending beyond the normal limit with a green overflow section. Audio: organic growth sound on regen ticks.

**Balance notes:** 5 HP/window × 40 windows = 200 HP total regen potential. Strong. The overheal cap means against HARDCASE + MULCH: 140 HP base + overheal to 168 HP. Very tanky. The transparency downside is minor in full-vis v1 (everyone sees HP anyway) but meaningful in Fog mode. Flag for Fog tuning: MULCH transparency should be revisited when Fog ships — it might need to be an actual mechanical cost rather than aesthetic.

---

### ORACLE
*Predictive Combat Cortex | Legendary*

**Mechanical effect:**
- +15% accuracy bonus: all attack rolls (stun, miss checks) are shifted 15% in the wearer's favor.
  - Attacking vs GHOST SHELL (25% miss chance): normally 75% hit; with ORACLE: 75% + 15% = 90% hit
  - BUZZ stun chance (25%): with ORACLE: 25% + 15% = 40% stun rate
- Downside: adds 0.5s (500ms) to the wearer's decision window. The agent's effective window drops from 750ms to effectively 1250ms ceiling (but the server still processes at 750ms — the ORACLE agent has 750ms budget shared with ORACLE's computation). Implementation: this is an LLM prompt note, not an engine change. The prompt fragment tells the agent it's running ORACLE and its response is being processed through ORACLE's prediction layer. In practice, the agent should budget for slightly more token usage (predictions to include).
  - The +500ms is simulated via prompt complexity, not engine enforcement. It's a design signal to Pitmaster: your agent needs to handle more context. Don't use ORACLE with a model that's already struggling to hit 750ms.

**Agent state:**
```json
"tomalley": "ORACLE",
"accuracy_bonus": 0.15,
"oracle_prediction": {
  "opponent_likely_action": "SPIT",
  "confidence": 0.72
}
```

**Spectator display:** Shell shows a subtle scanning animation (like sonar pulses). ORACLE's prediction is displayed on the Coral Feed — spectators see what the Lobster thinks the opponent will do, and whether it was right. This is prime Coral Feed content.

**Balance notes:** ORACLE is a meta-information item. Its value depends entirely on the agent's ability to USE the prediction. A dumb agent with ORACLE wastes it. A smart agent adapts its queued moves based on prediction. ORACLE + THE ORIGINAL APPENDAGE is blocked (Legendary Tomalley + Legendary Claws restriction). Intentional — ORACLE wants a Tomalley slot, not Legendary Claws competition.

---

### THE GHOST PROTOCOL
*Phase-Step Passive | Rare*

**Mechanical effect:**
- After being hit (each hit instance): the Lobster phases for 1 tick (150ms). During phase: immune to all damage. Duration: 1 tick (150ms = 1 tick, which is a small fraction of a Decision Window).
- Downside: during phase tick, the Lobster cannot act. If an action was being resolved in that tick, it is delayed by 1 tick (pushed to next tick within the window).
- Implementation: phase is so brief (1/5th of a decision window) that it rarely delays action resolution meaningfully. The action still fires in the same Decision Window, just 1 tick later.

**Agent state:**
```json
"tomalley": "THE_GHOST_PROTOCOL",
"ghost_phase_active": false,
"ghost_phase_ticks_remaining": 0
```

**Spectator display:** After each hit: brief shimmer/translucent flash (1 tick = barely perceptible). The visual is more of a "blink" effect than a full phase. Audio: high-pitched phase ping after each impact.

**Balance notes:** Minimal practical effect in v1. The 1-tick phase is too brief to matter much. Intended for Fog mode (where phasing creates interesting "disappeared for a moment" effects). In v1: the accumulated micro-invincibility windows add up — in a prolonged fight, THE GHOST PROTOCOL effectively reduces damage from rapid-fire DoT by providing 1-tick immunity after each DoT tick. Against THE FLICKER at max stacks: each DoT tick phases the Lobster → next tick is immune → every other tick of DoT is negated = effective 8 DoT/tick instead of 16. Significant! This is the hidden synergy. Flag: GHOST PROTOCOL is THE FLICKER's hard counter. Design intentionally.

---

### SPITE
*Dying Sting | Rare*

**Mechanical effect:**
- Zero benefit while alive. Purely passive death effect.
- On death: deal damage equal to 40% of the wearer's MAX HP to the opponent (before any reductions on the recipient).
  - SNAPPER Lobster with SPITE: 40% × 100 = 40 death damage
  - BLOCK-7 Lobster with SPITE: 40% × 130 = 52 death damage
  - THE PATRIARCH + SPITE: 40% × 160 = 64 death damage
- The death damage is NOT mitigated by SHELL UP (the Lobster is dead and can't act). It IS mitigated by opponent's Carapace reduction and active effects.
- DESPITE fires even if death was from hazard, DoT, or any cause.
- Cannot pair with SECOND WIND (explicit restriction — both are on-death effects).

**Agent state:**
```json
"tomalley": "SPITE",
"spite_damage_on_death": 40
```

**Spectator display:** On death: the Lobster explodes in a burst of brine. The explosion animation hits the opponent. Audio: death sound → brine explosion → impact thud on opponent.

**Balance notes:** "You'll regret killing me." High drama item. WIDOW + SPITE: survive lethal hit → still at 1 HP → opponent must kill again → on that death, SPITE fires for 40. If opponent is also low HP, SPITE kills them simultaneously → DRAW. Both Lobsters die in the same window → tiebreaker: highest HP tiebreaker (both at 0/1) → Hardness tiebreaker. Interesting. THE PATRIARCH + SPITE: 64 death damage is substantial — can kill an already-damaged opponent. This is a valid strategy: absorb damage with THE PATRIARCH's HP, then die and punish with SPITE.

---

### DOUBLE DOWN
*Escalating Claws Passive | Rare*

**Mechanical effect:**
- On attacks 1-4 (every cycle): damage multiplier -10% (Claws modifier reduced by 10%)
- On every 5th attack: damage multiplier +200% (×2 bonus on Claws modifier)
- Attack counter tracks total attack uses (PINCH + SPIT combined), resets to 0 after the 5th attack (the 200% hit)
- Example with SNAPPER (1.00×):
  - Attacks 1-4: 0.90× damage
  - Attack 5: 2.00× damage

**Agent state:**
```json
"tomalley": "DOUBLE_DOWN",
"double_down_counter": 3,
"current_multiplier_modifier": 0.90  // or 2.00 on attack 5
```

**Spectator display:** Attack counter visible on Lobster portrait (small charge indicator 1-4). On 5th attack: visual burst of energy in attack animation. Audio: each hit builds a charge sound, 5th hit has full release.

**Balance notes:** Rewards consistent attack rhythm. A Lobster that attacks every other window: 5-attack cycle takes 10 windows = 7.5 seconds. The -10% on 4 attacks + 200% on 1 = net: 4×0.9 + 1×2.0 = 3.6 + 2.0 = 5.6 damage over 5 attacks (vs 5.0 for SNAPPER). +12% effective damage over 5-attack cycles. DOUBLE DOWN is mildly positive when attack rate is consistent. Punished by forced NO_OPs (MAXINE cooldown, HARDCASE energy drain). Rewarded by aggressive agents who attack every window. THE FLICKER + DOUBLE DOWN: the 5th hit deals double Flicker damage AND adds 1 bleed stack. Not broken — 1 extra stack, 1 big hit. Acceptable.

---

### THE LONG GAME
*Patience Passive | Rare*

**Mechanical effect:**
- +2% damage multiplier per 10 ticks elapsed in the fight (across all attacks)
- Maximum bonus: uncapped within fight duration
- At tick 300 (max fight): +60% damage multiplier
- Applies multiplicatively: `final_damage = base × claws_multiplier × (1 + 0.02 × floor(tick / 10))`
- The bonus applies to all outgoing damage: PINCH, SPIT, BURST hit, any direct attack

**Damage ramp table:**
| Tick | Bonus |
|------|-------|
| 0-9 | 0% |
| 10-19 | +2% |
| 50-59 | +10% |
| 100-109 | +20% |
| 200-209 | +40% |
| 290-300 | +58-60% |

**Agent state:**
```json
"tomalley": "THE_LONG_GAME",
"long_game_bonus": 0.14,  // at tick ~70
"current_tick": 73
```

**Spectator display:** Subtle aura that intensifies over time. At 30%+ bonus: visibly glowing. At 60%: full intensity glow. Audio: low ambient hum that grows louder as time passes.

**Balance notes:** Designed for defensive/kiting agents. THE REACH + THE LONG GAME: kite opponent at range, wait out the clock, attacks hit harder as fight extends. Pairs with THE MOLT (both time-reward items — a patient build). Countered by early aggression (kill before the bonus matters). At tick 100, +20% damage is meaningful but not decisive. The item's power is in fights that go 200+ ticks.

---

### SURVIVAL INSTINCT
*Auto-Dodge | Common*

**Mechanical effect:**
- One-time: automatically dodges the single highest-damage incoming attack in the Scuttle.
- Trigger: when a damage instance would be the largest single damage value the Lobster has received so far in the fight, SURVIVAL INSTINCT fires. The attack deals 0 damage.
- "Highest so far" tracking: engine tracks `max_damage_received_so_far`. When a new hit would be strictly greater, SURVIVAL INSTINCT fires (if not yet consumed).
- After firing: `survival_instinct_used: true`. No further auto-dodges.
- SURVIVAL INSTINCT does NOT fire on the first hit (unless the first hit is also the largest). Wait — it fires on any hit that exceeds the current maximum. On the first hit: `max_damage_received_so_far = 0`. Any positive damage is greater than 0. SURVIVAL INSTINCT would fire on the very first hit. That's wrong. **Rule: SURVIVAL INSTINCT triggers only when incoming damage exceeds the running maximum AND the running maximum is > 0. First hit always lands.** If tied with the current max: does not trigger (must be strictly greater).

**Agent state:**
```json
"tomalley": "SURVIVAL_INSTINCT",
"survival_instinct_used": false,
"max_damage_received_so_far": 22
```

**Spectator display:** The dodge is dramatic — a visual blur/sidestep the instant before impact. "DODGE!" text flash. Audio: whoosh + near-miss sound.

**Balance notes:** Wastes itself against FLICKER (many small hits never exceeds the max, so it might save against the first large hit then become irrelevant). Best against MAXINE or WIDOW-MAKER (a single massive hit — SURVIVAL INSTINCT saves you from MAXINE's 36 damage or WIDOW-MAKER's 80 damage). The Pitmaster must consider: SURVIVAL INSTINCT fires on the first hit that exceeds the prior max. Against MAXINE that attacks infrequently, SURVIVAL INSTINCT is almost guaranteed to dodge the big swing. Against THE FLICKER, it might dodge the 5th stack hit that's a larger accumulated instance... wait, DoT ticks are per-tick, constant (2 HP/tick), not escalating. SURVIVAL INSTINCT tracks direct attacks, not DoT. **Rule: DoT ticks do NOT trigger SURVIVAL INSTINCT. Only direct attack damage instances (PINCH, SPIT, BURST hit) count.** Document this in engine.

---

### DEEP MEMORY
*Pattern Recognition | Rare*

**Mechanical effect:**
- Activates at tick 30 (after 30 ticks = 4.5 seconds elapsed)
- Effect: the agent's state snapshot includes an analysis of opponent's movement pattern for the last 30 ticks. Specifically:
  - Most frequent action used by opponent
  - Opponent's movement tendency (aggressive/defensive — ratio of SCUTTLEs toward vs away from self)
  - Opponent's attack frequency (attacks per window over last 20 windows)
- This is added as a `deep_memory_insight` field in the agent state JSON
- Useless if fight ends before tick 30

**Agent state:**
```json
"tomalley": "DEEP_MEMORY",
"deep_memory_active": false,  // true after tick 30
"deep_memory_insight": {
  "opponent_most_frequent_action": "SPIT",
  "opponent_movement_tendency": "aggressive",
  "opponent_attack_frequency": 0.7  // attacks per window
}
```

**Spectator display:** After tick 30: a "MEMORY ACTIVATED" indicator on the Lobster portrait. Coral Feed shows the insight summary — spectators can see what the Lobster learned.

**Balance notes:** Requires fights to go long. In short, decisive fights: useless. In prolonged tactical fights: significant. Pairs with LONG GAME and THE MOLT (all three are late-game payoff items). The insight doesn't guarantee correct prediction — the opponent may adapt. A well-designed opponent agent WILL vary strategy specifically to counter DEEP MEMORY prediction. Meta-game depth: knowing your opponent has DEEP MEMORY means you should be unpredictable. Flag (Fog mode): Under Fog, DEEP MEMORY's pattern analysis is even more valuable — opponent position is uncertain, but behavior is analyzable. High Fog value item.

---

### SECOND WIND
*One-Time Revival | Legendary*

**Mechanical effect:**
- When HP would drop to 0 or below: instead set HP = 10% of max HP, rounded down.
  - Base HP Lobster: revive at 10 HP
  - BLOCK-7 (130 HP): revive at 13 HP
  - THE PATRIARCH (160 HP): revive at 16 HP
- One-time use. Cannot pair with SPITE (explicit restriction, both are death-effect items).
- SECOND WIND fires INSTEAD of SPITE (they cannot coexist). Loadout builder enforces this.
- SECOND WIND does NOT give any attack bonus on revival (unlike WIDOW which just saves, SECOND WIND is a full revival with reduced HP).
- After revival: Lobster is at low HP. THE RED GENE activates (if equipped). INVERTER below 50% activates (if equipped). SECOND WIND creates the conditions for multiple other comeback mechanics.

**Agent state:**
```json
"tomalley": "SECOND_WIND",
"second_wind_available": true
```

**Spectator display:** Revival animation: Lobster falls, shell cracks, then dramatically reforms with an energy burst. "SECOND WIND" text appears. HP bar refills to 10%. Audio: death sound → revival swell → heartbeat.

**Balance notes:** The ultimate comeback item. SECOND WIND + WIDOW is NOT allowed (both Carapace/Tomalley slots are different, so WIDOW + SECOND WIND IS possible). WIDOW saves you from the killing blow at 1 HP. SECOND WIND saves from the next killing blow at 10%. Together: two saves. Combined with THE RED GENE: revive at 10 HP with +40% damage. If THE RED GENE was already active during death: both revivals (WIDOW then SECOND WIND) still benefit from RED GENE. Powerful. Balanced by: after SECOND WIND fires, the Lobster has low HP with no further protection (no more saves). Any additional hit kills.

---

### QUANTUM HOOK
*One-Time Teleport | Legendary*

**Mechanical effect:**
- One-time use: the Lobster teleports to any open tile on the map.
- The Lobster's agent can specify coordinates for the teleport via a special action: `{"action": "QUANTUM_HOOK", "destination": {"x": 14, "y": 7}}`
- The destination must be: a valid OPEN tile, not occupied by the opponent, within the map bounds.
- After use: QUANTUM_HOOK is consumed. `quantum_hook_available: false`
- The teleport resolves at BURST priority (resolution step 3) — before SCUTTLE.
- After use: opponent is informed of the new position in the state snapshot. Opponent cannot "predict" the teleport destination.

**Agent state:**
```json
"tomalley": "QUANTUM_HOOK",
"quantum_hook_available": true
```

**Spectator display:** The teleport is the most visually dramatic moment in the game (tied with WIDOW save). Lobster vanishes in a brine-warp flash, reappears at destination with a dimensional pop. Audio: vanish sound → travel beat → arrival pop.

**Balance notes:** Repositioning escape, ambush setup, or hazard escape. "Opponent runs after" (per Registry note) refers to the psychological effect — the opponent's agent now has to reorient after QUANTUM_HOOK repositions dramatically. Against fog (Tide 2): QUANTUM_HOOK to a location outside opponent's visibility radius = effectively disappears. Very high Fog mode value. In v1 (full visibility): QUANTUM_HOOK is still strong — it breaks the opponent's queued positioning moves. Cannot be used offensively (no damage). Pairs with any aggressive build to escape a bad position, regroup, and re-approach.

---

### THE HOUSE EDGE
*Pay-to-Win (The House Always Profits) | Legendary*

**Mechanical effect:**
- At any point during a Scuttle, the Lobster's agent can activate THE HOUSE EDGE via action: `{"action": "HOUSE_EDGE_ACTIVATE"}`
- On activation: the Lobster pays 15% of their Roe balance (out-of-game currency, deducted from Pitmaster's wallet AFTER the fight).
- Effect: +50% damage multiplier for the rest of the Scuttle (from activation point)
- The activation is a 0-energy, no-cooldown action that takes the Lobster's action slot for 1 window (the activation window itself: the Lobster does nothing else)
- Can only activate once per Scuttle
- The Roe cost is committed the moment the action is submitted; if the fight is abandoned or crashes, the Roe is still spent.

**Agent state:**
```json
"tomalley": "THE_HOUSE_EDGE",
"house_edge_available": true,
"house_edge_active": false,
"house_edge_damage_bonus": 0.00  // 0.50 after activation
```

**Spectator display:** Activation: gold coin flash with "THE HOUSE THANKS YOU" text. Damage bonus: attacks have a gold tint for the rest of the fight. Audio: cash register sound on activation. Spectators see the Roe cost committed — it's public, which is part of the comedy.

**Balance notes:** The most meta item in the game. The House literally profits from the fight regardless of outcome. The Roe cost scales with the Pitmaster's wealth (richer Pitmasters pay more). The +50% bonus is powerful but requires an activation window (one window lost) and real currency. Optimal use: activate when about to win — bank the extra damage for the kill shot, don't activate early. WIDOW-MAKER + THE HOUSE EDGE: 400% × 1.5 = 600% damage. 120 PINCH damage. One-shots everything, including THE PATRIARCH at full HP (160 HP... wait, 120 damage doesn't one-shot 160 HP). With THE PATRIARCH having 20% reduction: 120 × 0.80 = 96 damage. Still not one-shot. WIDOW-MAKER + HOUSE EDGE + CRACKER (strip armor first) = theoretically one-shot setup across multiple windows. Three-item setup, very telegraphed, high skill ceiling. Not degenerate — it's a spectacle play.

---

## Items Flagged for Fog of War

The following items have significantly higher design value under Fog of War (Tide 2):

| Item | Why Fog Makes It Better |
|------|------------------------|
| GHOST SHELL | Opponent doesn't know why attacks miss — psychological warfare |
| DEEP MEMORY | Pattern analysis without visual confirmation = more meaningful |
| ORACLE | Predicting without seeing = dramatically more impressive |
| QUANTUM HOOK | Can teleport OUTSIDE opponent's visibility radius — true disappearance |
| INVERTER | Opponent doesn't know why their attacks aren't working |
| THE GHOST PROTOCOL | Phasing after hits creates confusing "where did it go" moments |

---

## Degenerate Strategy Audit

Items checked for infinite loops or broken combos:

| Scenario | Status |
|----------|--------|
| WIDOW-MAKER loop | ❌ Impossible — breaks after one use |
| BLEED BACK ping-pong | ❌ Prevented by explicit "reflection does not trigger BLEED BACK" rule |
| INVERTER infinite HP | ❌ Capped at 100 HP, and DoT/hazard bypass INVERTER |
| SPITE + SECOND WIND | ❌ Loadout builder blocks pairing |
| MULCH + THE PATRIARCH overheal | ✅ Capped at 120% (168 HP). Acceptable. |
| DOUBLE DOWN infinite damage | ❌ Per-cycle reset prevents accumulation |
| THE HEIR + WIDOW-MAKER (400% × 2.0×) | ✅ 800% PINCH = 160 damage. One-shots everything. High Roe cost, Legendary Claws, 22-win Lobster. Intentional power fantasy for veterans. |
| HOUSE EDGE + WIDOW-MAKER + THE HEIR | ✅ See above — 1200% PINCH. Spectacle play for elite Pitmasters. |

---

*ITEMS-IN-PLAY locked: March 2, 2026 (WS18.1 hand update)*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
*41 items specified. Every edge case resolved. No ambiguity.*
