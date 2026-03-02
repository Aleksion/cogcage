# ITEMS IN PLAY
*The Molt Pit — Mechanical Specification for All 40 Items*
*Deep Brine Studios | WS18 | Locked: March 1, 2026*

---

## How to Read This Document

Each item entry specifies:
- **Mechanical effect** — exact numbers, triggers, conditions. Engine implements this.
- **LLM context** — what the agent sees in game state. How the effect surfaces.
- **Spectator signal** — visual/audio trigger for the audience.
- **Balance notes** — known risks, synergies, flags.

Environmental damage (HAZARD tiles) is not an item effect and is not reduced by item effects unless specifically noted.

All damage follows: `base × damage_multiplier × (1 - damage_reduction)` unless an item explicitly bypasses this.

---

## PLATING (Carapace)

### BLOCK-7 | Composite Exo-Plating | Common
**Mechanical effect:**
- HP: +30 (base 100 → 130)
- Incoming damage multiplied by 0.9 (10% reduction, applied post-Claw multiplier)
- SCUTTLE energy cost: 2 (instead of 1). BURST energy cost: 3 (instead of 2).

**LLM context:** `plating: "BLOCK-7"` in loadout. `hp_max: 130`. Game state shows energy cost per action accurately. Agent reads energy depletion naturally.

**Spectator signal:** Heavy thud on hit (muffled). Blue armor shimmer on impact.

**Balance notes:** Solid common. The movement penalty is real — against PAPER-MACHÉ, BLOCK-7 agents get kited. Against MAXINE, the extra HP + reduction can absorb 2 hits that would otherwise 2-shot a standard build.

---

### THE ORIGINAL | Default Shell | Common
**Mechanical effect:**
- HP: +15 (base 100 → 115)
- No other effects

**LLM context:** `plating: "THE_ORIGINAL"`. Boring. Reliable.

**Spectator signal:** Nothing special. That's the joke.

**Balance notes:** This is the starter. New Pitmasters who don't know the meta reach for this. Against anything Legendary, it loses. Against other Common, it's a fair fight decided by Claws + Tomalley + agent quality.

---

### HARDCASE | Heavy Exoskeleton | Common
**Mechanical effect:**
- HP: +40 (base 100 → 140)
- BURST: unavailable
- SCUTTLE energy cost: 2
- Incoming damage: ×0.85 (15% reduction)

**LLM context:** `available_actions` excludes BURST. `hp_max: 140`. Agent knows not to attempt BURST.

**Spectator signal:** Slow movement animation. Grinding sound when hit.

**Balance notes:** Tankiest Common. No BURST means no escape from HAZARD landing. Pair with ranged Claws (THE REACH) to stay outside PINCH range. Against NEEDLE (ignores armor): the 40 HP becomes the whole advantage. ⚠️ Flag: potentially degenerate if paired with STANDARD ISSUE regen — slowly outheal damage from a distance. Monitor in playtest.

---

### SILKWORM | Phase-Scatter Membrane | Rare
**Mechanical effect:**
- HP: base 90 (−10 from base)
- On any incoming damage: scatter 20% to random adjacent open tile (damage just disappears — it scatters into The Brine). Effective reduction: 20% of all damage, regardless of type.
- Scatter happens before armor reduction. Opponent's 20 PINCH → 16 hits Silkworm, 4 scattered. Then 16 × 1.0 (no other reduction) = 16 damage taken.

**LLM context:** `plating: "SILKWORM"`. `hp_max: 90`. Agent prompt: *Your membrane scatters incoming damage. Stay mobile. Flank.*

**Spectator signal:** Hit splashes outward from Lobster position — particle burst in adjacent direction. Sound: energy dissipation hiss.

**Balance notes:** 20% passive damage scatter is always-on. Against NEEDLE (ignores armor): SILKWORM scatter still fires — NEEDLE bypasses reduction, not scatter. SILKWORM is secretly strong against NEEDLE. Against BLEED BACK (reflect): BLEED BACK reflects 8% of damage dealt — SILKWORM means only 80% of damage is actually dealt, reducing what BLEED BACK returns. Nice interaction.

---

### ECHO | Reactive Neural Mesh | Rare
**Mechanical effect:**
- HP: +10 (base 100 → 110)
- After taking any damage (PINCH or SPIT only — not HAZARD, not BURST HIT): next action in queue is automatically upgraded. Specifically: the next queued PINCH deals +50% damage. If no PINCH queued, bonus sits until next PINCH lands. Expires after 2 windows.
- Counter triggers ONCE per hit, regardless of damage amount.

**LLM context:** `echo_counter_ready: true/false` in game state. LLM should PINCH when this is active.

**Spectator signal:** Lobster flashes cyan on hit. Counter-PINCH shows red glow on claw.

**Balance notes:** ECHO rewards agents that parse game state well. An agent that reads `echo_counter_ready: true` and queues PINCH immediately gets massive value. A dumb agent wastes every proc. This is intentional skill expression at the agent design layer.

---

### THE MOLT | Progressive Hardening | Rare
**Mechanical effect:**
- HP: −5 start (base 100 → 95)
- Every 20 ticks: +5% damage resistance, stacking up to 5 stacks (max +25% resistance at tick 100)
- Stack tracking: `molt_stacks: 0-5` in game state

**LLM context:** `molt_stacks: 3` signals agent to play more aggressively as stacks accumulate (they're getting harder to kill).

**Spectator signal:** Shell visibly darkens with each stack. At 5 stacks: glows deep amber.

**Balance notes:** Weak in fast fights (<30 ticks). Strong in drawn-out brawls. Pairs extremely well with STANDARD ISSUE (HP regen per window) and LONG GAME (damage buff over time). ⚠️ Time-synced triple — MOLT + LONG GAME + STANDARD ISSUE is a "wait them out" build that needs monitoring. Ensure MAX_TICKS = 300 keeps it finite.

---

### WIDOW | Survivor's Shell | Rare
**Mechanical effect:**
- HP: −15 (base 100 → 85)
- One time, when an incoming hit would reduce HP to ≤0: that hit reduces HP to 1 instead. Widow proc consumed.
- State: `widow_proc_available: true/false`

**LLM context:** `widow_proc_available: true` in state. Agent should know it can survive one lethal hit. Pair with comeback Tomalley (RED GENE).

**Spectator signal:** THE moment. Shell shatters dramatically, Lobster stands at 1 HP. Crowd goes wild. Sound: glass break + low rumble.

**Balance notes:** The WIDOW save is the single most exciting moment designed into this game. It is correct that this is Rare and not Common. 85 HP with one guaranteed survival — agents that know this proc will play aggressively near death. Pairs lethally with INVERTER (below 50% HP, damage becomes healing) and RED GENE (below 40%, +40% damage). THE WIDOW BUILD: Widow + Inverter/Red Gene + any aggressive Claws = comeback arc in every fight.

---

### BLEED BACK | Retaliatory Chitin | Rare
**Mechanical effect:**
- HP: −10 (base 100 → 90)
- On any incoming damage: reflect 8% of damage dealt back to attacker, before their armor reduction
- Reflect triggers on PINCH, SPIT, BURST HIT. Not on HAZARD.
- Reflect damage is non-blockable by SHELL UP (it fires passively, not as an action)

**LLM context:** `plating: "BLEED_BACK"`. Opponent in state shows they have this — aggressive attackers should factor in ~8% self-damage per hit.

**Spectator signal:** Small red spark fires back toward attacker on every hit.

**Balance notes:** Against MAXINE (+80% damage multiplier, one massive hit): that one hit might be 36 damage. 8% = 2.88 damage reflected. Low return on a big hit. Against THE FLICKER (multi-hit, stacking): 8% × many small hits = meaningful accumulated damage. BLEED BACK counters flicker-style attackers. 

---

### THE PATRIARCH | Ancient Armor | Legendary
**Mechanical effect:**
- HP: +60 (base 100 → 160)
- Incoming damage: ×0.8 (20% reduction)
- BURST: unavailable
- SCUTTLE energy cost: 2

**LLM context:** `available_actions` excludes BURST. `hp_max: 160`. Prompt fragment communicates "advance and hold position."

**Spectator signal:** Deep resonant thud on movement. Slowest walk animation in the game.

**Balance notes:** 160 HP + 20% reduction makes this effectively ~200 HP of effective health. Against NEEDLE (ignores armor): 160 HP straight with no reduction. THE PATRIARCH vs NEEDLE is a pure HP fight — NEEDLE wins on DPS if it can stay alive long enough. Against WIDOW-MAKER (400% one hit): WIDOW-MAKER vs THE PATRIARCH is: base 20 PINCH × 4.0 × 0.8 = 64 damage. Hurts but doesn't kill. Solid counter.

---

### GHOST SHELL | Phase Carapace | Legendary
**Mechanical effect:**
- HP: base 100 (no change)
- On every incoming attack (PINCH, SPIT, BURST HIT): 25% chance the attack misses entirely. Random roll per hit.
- Miss means: zero damage, no effects triggered (no ECHO counter, no BLEED BACK return, nothing)
- State: `ghost_shell_equipped: true` visible to both agents

**LLM context:** Opponent knows GHOST SHELL is active. They see `ghost_shell_equipped: true` in opponent state. They should factor 25% miss rate into aggressive play — but cannot prevent it.

**Spectator signal:** Hit passes through Lobster with ghost effect. Lobster flickers transparent for 1 frame. Miss sound: whoosh through void.

**Balance notes:** ⚠️ High variance. Against an opponent expecting consistent damage trades, GHOST SHELL can feel RNG-punishing. Acceptable at Legendary rarity — Legendary items are allowed to feel unfair sometimes. The spectator reaction to a ghost miss at a critical moment is genuine entertainment.

---

### INVERTER | Metabolic Reversal Core | Legendary
**Mechanical effect:**
- HP: base 100 (no change)
- When current HP ≤ 50: incoming damage is converted to healing instead (amount equal to what damage would have been, post-armor)
- When current HP > 50: zero damage reduction (no protection at all)
- INVERTER does not affect HAZARD damage (environmental, not combat)

**LLM context:** `inverter_active: true/false` — true when HP ≤ 50. Agent should play aggressively when inverter is active (they're functionally unkillable while it fires, until they overheal to >50 then it deactivates momentarily).

**Spectator signal:** Below 50 HP: Lobster glows deep violet. Incoming hits show healing numbers instead of damage numbers. Deeply disorienting for opponent's agent reasoning.

**Balance notes:** INVERTER + WIDOW is the most broken theoretical build in the game. At 1 HP (WIDOW proc): opponent hits you, you heal. At >50% HP you're naked — opponent needs to kill you fast before you drop low. The counterplay: don't let INVERTER Lobster get to low HP without killing them. Use burst damage (WIDOW-MAKER, MAXINE). The answer to INVERTER is exactly the kind of strategic arms race The Pit should generate.

---

### THE SARCOPHAGUS | Sealed Carapace | Legendary
**Mechanical effect:**
- HP: base 100 during seal phase. After seals break: HP_max reduced to 80 (−20 penalty).
- First 3 hits taken: deal 0 damage. Seals count: 3, 2, 1, 0.
- After seal 3 breaks (4th hit onward): no damage reduction, HP max is now 80.
- Hits that break seals must be PINCH, SPIT, or BURST HIT. HAZARD does not break seals.

**LLM context:** `sarcophagus_seals: 3` counting down. Agent and opponent both see seal count.

**Spectator signal:** First 3 hits: visual cracks appear on shell. Big crack VFX each break. After all seals gone: shell looks shattered, Lobster exposed.

**Balance notes:** 3 free hits is enormous early-fight value. The cost: playing cautiously after seals break (80 HP, no reduction) — you're now more fragile than THE ORIGINAL. Optimal Sarcophagus play: use the 3 free hits to land aggressive early damage, then disengage. Anti-Sarcophagus play: don't waste a WIDOW-MAKER on a sealed Sarcophagus.

---

### PAPER-MACHÉ | Compressed Pulp Shell | Common
**Mechanical effect:**
- HP: −40 (base 100 → 60)
- SCUTTLE energy cost: 0
- BURST energy cost: 1

**LLM context:** `hp_max: 60`. Every action costs 1 less energy for movement. Agent should play hyper-mobile, never stand still.

**Spectator signal:** Fastest movement animation. Almost flickering. Sound: papery rustle.

**Balance notes:** 60 HP dies to almost anything. MAXINE hits for ~36 at standard — 2 hits to kill. THE PATRIARCH with 160 HP could shrug off 4-5 PAPER-MACHÉ PINCH attacks. PAPER-MACHÉ's game is: never get hit. Against fog-of-war agents that can't track fast movement: terrifying. In v1 full visibility: the opponent always knows where it is. You'd better be fast enough to exploit that. This is the loadout that produces the most chaotic, interesting fights to watch.

---

## CLAWS

### MAXINE | Hydraulic Compression Claws | Common
**Mechanical effect:**
- Damage multiplier: ×1.8 (base 20 PINCH → 36 damage, before armor)
- Cooldown: after use, MAXINE cannot fire again for 3 decision windows
- No modification to SPIT

**LLM context:** `maxine_cooldown: 0-3` in game state. When 0, MAXINE PINCH is available. When >0, PINCH deals base damage (20). LLM must read cooldown and time MAXINE correctly.

**Spectator signal:** MAXINE hit: screen shake, massive CRUNCH sound, screen briefly red. Cooldown: claws glow cooling amber.

**Balance notes:** 36 damage on hit (unarmored). Against 100 HP that's 2-3 shots to kill. MAXINE is a glass cannon Claw — strong, readable, counterable. If opponent sees you're on cooldown, they should press hard.

---

### SNAPPER | Standard Combat Claws | Common
**Mechanical effect:**
- Damage multiplier: ×1.0 (base: PINCH 20, SPIT 12)
- No cooldown. No special effects.

**LLM context:** Nothing special. Reliable baseline.

**Balance notes:** The honest option. Everything works as advertised. The skill expression is entirely in loadout pairing and agent quality.

---

### THE REACH | Extended Claw Array | Common
**Mechanical effect:**
- Damage multiplier: ×0.8 (PINCH: 16, SPIT: 9.6 → round to 10)
- SPIT range: 4.5 tiles (effectively 5) instead of 3
- PINCH range: 1.5 tiles — agent can PINCH from 1 tile away OR adjacent

**LLM context:** `spit_range: 5`. `pinch_range: 1.5` (round down: can PINCH if Manhattan distance ≤ 1). Agent should maintain mid-range, not close-range.

**Spectator signal:** SPIT visually travels farther. Elongated claw animation on PINCH.

**Balance notes:** Ranged-dominant build. Pair with THE PATRIARCH (can't move fast, but SPIT at 5 range from behind cover). Actually a strong combo — immovable fortress with extended reach.

---

### THE FLICKER | Rapid Laceration Array | Rare
**Mechanical effect:**
- Damage multiplier: ×0.6 (PINCH: 12 base)
- On every PINCH hit: apply 1 Bleed stack. Each stack deals 2 damage per tick (not per window — per tick, 150ms). Max 8 stacks = 16 damage/tick passively.
- Stacks do NOT refresh timer — each stack has independent duration of 10 ticks (1.5 seconds).
- New PINCH while stacks active: adds 1 more stack (up to max 8), refreshes THAT stack's timer.
- HAZARD interaction: Bleed damage is separate from HAZARD. Both apply.

**LLM context:** `bleed_stacks_on_opponent: 0-8` in game state. Agent can read how much DoT is running.

**Spectator signal:** Bleed stacks visible as red number on opponent. Tick by tick, red particles drip from opponent.

**Balance notes:** 8 stacks at 2/tick = 16 damage/tick. At 150ms per tick, that's ~107 damage/second from DoT alone (theoretical max, never quite hits because stacks expire). Against BLEED BACK: bleed is not direct hits, so no BLEED BACK interaction. Against GHOST SHELL: each individual PINCH has 25% miss, preventing stack application. Against GHOST SHELL, THE FLICKER can be neutered by luck. ⚠️ Flag: THE FLICKER + DOUBLE DOWN (every 5th attack 200% damage) stacks weirdly — clarify that DOUBLE DOWN bonus applies to PINCH base damage, which then triggers Bleed stack normally. Not multiplicative on bleed.

---

### BUZZ | Electrostatic Discharge Pincers | Legendary
**Mechanical effect:**
- Damage multiplier: ×0.85 (PINCH: 17, SPIT: 10)
- SPIT: always available regardless of range (replaces 3-tile limit — BUZZ SPIT has range 4)
- On every PINCH or SPIT hit: 25% chance to STUN opponent for 1 decision window. During STUN: opponent's queued action is skipped (NO_OP). The Lobster doesn't move, doesn't attack, doesn't SHELL UP.
- STUN does not stack. Already-stunned opponent: STUN refreshes duration.

**LLM context:** `opponent_stunned: true/false`, `stun_windows_remaining: 1`. Stunned Lobster: agent receiving this state sees `stunned: true` — it cannot submit a useful action.

**Spectator signal:** BUZZ hit: electric arc visual, crackling sound. STUN: opponent sparks, slightly shaking, yellow tint.

**Balance notes:** 25% STUN is high-variance but not oppressive — it's one window. Against slow agents that were going to miss the window anyway: STUN is irrelevant. Against fast agents: one wasted window is significant (~12.5% of a 45-second fight). BUZZ rewards aggression — the more you hit, the more stun chances you roll.

---

### NEEDLE | Penetrating Claw Tips | Rare
**Mechanical effect:**
- Damage multiplier: ×0.5 (PINCH: 10, SPIT: 6)
- All damage from NEEDLE ignores target's armor reduction entirely (damage_reduction = 0 for NEEDLE hits)
- NEEDLE does NOT ignore: GHOST SHELL miss chance (still 25% miss), SHELL UP 50% reduction (SHELL UP is active defense, not passive armor), SILKWORM scatter (scatter is pre-damage, not reduction)
- WIDOW proc still fires on NEEDLE lethal hit

**LLM context:** `claws: "NEEDLE"`. Opponent with heavy armor should be no better protected — agent reasoning: target value of armor is zero against us.

**Spectator signal:** NEEDLE hits have a distinctive puncture sound. Thin beam visual, very precise.

**Balance notes:** 10 PINCH damage ignoring armor is most effective against THE PATRIARCH (160 HP, no movement dodge — straight 10/hit) and GHOST SHELL (25% miss but no armor to ignore). Against PAPER-MACHÉ (60 HP, no armor anyway): SNAPPER does nearly the same thing, NEEDLE's armor pierce is wasted. Counter-intuitive: NEEDLE is bad against light armor, best against heavy armor, worst possible opponent is GHOST SHELL (misses half the time and has no armor to pierce). NEEDLE vs GHOST SHELL is a frustrating matchup.

---

### THE APOLOGIST | Misfiring Claw Array | Rare
**Mechanical effect:**
- Damage multiplier: ×0.9 (slight reduction)
- On every PINCH or SPIT action queued by opponent (any Claw): 20% chance that opponent's action misfires — it executes as NO_OP (they attempted the action but it failed)
- Misfire check: at resolution, before damage calculation. Applied to opponent's attack actions only. Does not affect opponent's SCUTTLE, BURST, or SHELL UP.

**LLM context:** Opponent sees `opponent_equipped_apologist: true`. Agent should know their attacks have 20% misfire risk. Cannot prevent it — can try to compensate with higher-frequency attacks or prioritize guaranteed actions.

**Spectator signal:** Misfire: opponent raises claw, nothing happens, small puff of smoke. Classic cartoon gag.

**Balance notes:** Defensive-utility Claw. 20% attack misfire is meaningful over a long fight. Against MAXINE (only fires every 3 windows): if MAXINE misfires, that's a huge 3-window waste. THE APOLOGIST counters slow, powerful attackers disproportionately. Against THE FLICKER (rapid hits): 20% misfire per hit means bleed stacks 20% slower. Solid counter to DoT builds.

---

### TENDERHOOK | Hydraulic Snare | Rare
**Mechanical effect:**
- Damage multiplier: ×1.0 (base damage, no change)
- Once per fight: on PINCH hit, opponent is HELD for 2 decision windows. Cannot SCUTTLE, BURST, or SHELL UP. Can still PINCH and SPIT.
- HOLD state: `opponent_held: true`, `hold_windows_remaining: 1-2`
- After use: `tenderhook_available: false` forever in this fight

**LLM context:** `tenderhook_available: true/false`. `opponent_held: true/false`. LLM should activate TENDERHOOK when positioned for follow-up damage.

**Spectator signal:** HOLD: hydraulic snare wraps around opponent, clanking animation. Opponent strains but can't move.

**Balance notes:** One use. Must use wisely. Best combined with MAXINE or WIDOW-MAKER — hold them in place, land the big hit. TENDERHOOK + MAXINE: perfect execution = hold them, wait for MAXINE cooldown to reset (if timed well), then MAXINE on held target. An agent that reads `tenderhook_available: true` AND `maxine_cooldown: 0` AND `opponent_adjacent` should immediately execute this combo. That's a deep-game move.

---

### VENOM | Toxin Delivery Claws | Rare
**Mechanical effect:**
- Base PINCH damage: ×0.1 (effectively 2 damage — nearly zero direct damage)
- On every PINCH hit: apply 1 Venom stack. Each stack deals 2 HP damage per decision window (not per tick). Max 5 stacks = 10 HP/window passive.
- Venom stacks last for 5 windows then expire. New PINCH refreshes ALL current stacks.
- Venom damage bypasses armor reduction (it's chemical, not physical)
- VENOM does NOT trigger ECHO counter (environmental, not combat hit)

**LLM context:** `venom_stacks_on_opponent: 0-5`. `venom_damage_per_window: X`. Agent sees total DoT running.

**Spectator signal:** Green-purple tinge on opponent. Venom stacks shown as dripping icons.

**Balance notes:** Pure DoT build. 5 stacks = 10 HP/window passive = slow kill that requires constant maintenance (PINCH to refresh). Against SHELL UP turtles: SHELL UP doesn't reduce Venom damage (it's armor-piercing). SHELL UP + Venom means SHELL UP is only protecting against direct attacks, not the DoT. Venom punishes SHELL UP camping hard. ⚠️ Note: VENOM + THE FLICKER stacking would be absurd — cannot equip both (one Claws slot per build).

---

### WIDOW-MAKER | Catastrophic Compression Claw | Legendary
**Mechanical effect:**
- One use only. On first PINCH: damage multiplier ×4.0 (base 20 → 80 damage)
- After use: WIDOW-MAKER is destroyed. PINCH/SPIT still available at ×0.0 modifier (broken claws — 0 damage). The Lobster is now weaponless for direct attacks.
- SPIT from broken WIDOW-MAKER: 0 damage.
- `widow_maker_fired: false/true` in game state. Both agents see this.

**LLM context:** Opponent knows the moment WIDOW-MAKER fires. They see `widow_maker_fired: true` — the nuclear weapon is spent. Pressure is gone. Time to press.

**Spectator signal:** WIDOW-MAKER fire: the most dramatic animation in the game. Massive hydraulic slam, screen shake, dramatic crack. After: broken claw animation, sparks.

**Balance notes:** 80 damage on one hit. Against 100 HP: leaves at 20 HP. Against THE PATRIARCH (160 HP, 20% reduction): 80 × 0.8 = 64 damage. Leaves at 96 HP. THE PATRIARCH SURVIVES WIDOW-MAKER. This is a designed interaction. Against WIDOW proc: WIDOW-MAKER hits for 80, triggers WIDOW proc (would reduce to 1 HP) — Lobster survives at 1 HP. Then INVERTER activates. Then WIDOW-MAKER user has broken claws. This is the most dramatic sequence possible in The Molt Pit and it's fully realizable.

---

### REVERSAL | Counter-Strike Claws | Legendary
**Mechanical effect:**
- Damage multiplier: ×1.0 (base damage)
- SHELL UP interaction: when REVERSAL user activates SHELL UP and takes a hit during that window, the 50% reduced damage ALSO triggers a return hit on attacker for 60% of the original (pre-reduction) damage. Post-attacker-armor.
- REVERSAL counter damage formula: `incoming_damage_pre_reduction × 0.6 × (1 - attacker_armor_reduction)`
- Passive only — REVERSAL activates through SHELL UP. No separate action.
- `reversal_active: true` when SHELL UP is queued

**LLM context:** Agent should pair SHELL UP with REVERSAL explicitly. Prompt fragment: *When you SHELL UP with REVERSAL equipped, you are not defending — you are baiting a counter.*

**Spectator signal:** REVERSAL counter: golden flash from defending Lobster, return-fire animation at attacker.

**Balance notes:** Requires SHELL UP to function. SHELL UP = 0 energy cost, no offensive progress. REVERSAL turns SHELL UP from passive defense to active counter. The optimal play: time SHELL UP when opponent is about to PINCH. Mechanically rich but requires agent to predict opponent action. This is the most skill-expressive Claw in the game for well-designed agents.

---

### THE ORIGINAL APPENDAGE | Ancestral Claws | Legendary
**Mechanical effect:**
- Damage multiplier: ×1.25 (PINCH: 25, SPIT: 15)
- Status immunity: all negative status effects (STUN, HOLD, Venom stacks, Bleed stacks, APOLOGIST misfires, DEEP MEMORY predictions) have no effect when applied to this Lobster
- Cannot be paired with a Legendary Tomalley (slot restriction)

**LLM context:** `status_immune: true`. Opponent agent can read this — their BUZZ stuns, TENDERHOOK holds, APOLOGIST misfires do nothing. They should switch strategy to pure damage.

**Spectator signal:** Status effects visually slide off the shell. Spark effect. Satisfying.

**Balance notes:** The hard counter to CC-heavy builds. Immune to everything. Costs a Legendary Tomalley slot. Strong solo damage (+25%). The restriction to Common/Rare Tomalley is meaningful — no ORACLE, no SECOND WIND, no HOUSE EDGE pairing. Forces a commitment to raw power over tactical flexibility.

---

### CRACKER | Armor Fracturing Claws | Common
**Mechanical effect:**
- Damage multiplier: ×0.85 (PINCH: 17, SPIT: 10)
- On PINCH hit: reduce target's active armor reduction by 30% (additive with their current reduction, applied for remaining fight)
- Example: BLOCK-7 has 10% reduction. After CRACKER hit: 10% − 30% = effectively 0% (cannot go negative — minimum 0% reduction, no vulnerability multiplier)
- CRACKER effect stacks up to 2 hits (effectively caps target at 0% armor reduction after 2 hits on most builds)
- Stacks: `armor_reduced_stacks: 0-2` on target

**LLM context:** Opponent sees `armor_reduced_stacks: 1` in their state — they know their armor is compromised.

**Spectator signal:** CRACKER hit: pieces of shell fly off visually. Shell looks cracked/damaged.

**Balance notes:** Best against THE PATRIARCH and HARDCASE (high armor). Against PAPER-MACHÉ or GHOST SHELL (no armor or non-armor defense): mostly wasted. Anti-armor specialist that rewards reading opponent loadout in lobby.

---

### THE HEIR | Generational Claws | Rare
**Mechanical effect:**
- Starts at ×0.9 damage multiplier (slightly below SNAPPER)
- Each fight won with THE HEIR: +5% damage multiplier, permanent across fights (persists to next Scuttle)
- After 5 wins: ×1.15. After 10 wins: ×1.40. Theoretically uncapped.
- Current session: game state includes `heir_multiplier: 0.90/1.15/etc.`
- New Pitmasters: THE HEIR starts at ×0.9. Inherited Lobsters with history: carries their multiplier in.

**LLM context:** `heir_multiplier: 1.25` (for example). Agent knows current damage level.

**Spectator signal:** THE HEIR glows more intensely as multiplier rises. At ×1.5+: visible golden aura.

**Balance notes:** The long game item. Pitmasters who run THE HEIR consistently get exponentially rewarded. At ×2.0+ (10+ wins), THE HEIR approaches WIDOW-MAKER single-hit territory on a sustainable basis. The ladder incentive: keep your Lobster alive. The emotional hook: "My Lobster has 23 wins with THE HEIR, it's at ×2.15 now." That's a story.

---

## TOMALLEY (Core)

### THE RED GENE | Adrenaline Splice | Common
**Mechanical effect:**
- When current HP > 40: damage output multiplied by ×0.9 (slight penalty)
- When current HP ≤ 40: damage output multiplied by ×1.4 (bonus overrides penalty)
- Threshold check: at resolution, before damage calculation

**LLM context:** `red_gene_active: true/false` based on HP threshold. Agent should become more aggressive when active.

**Spectator signal:** Below 40 HP: Lobster turns red. Eyes glow. Sound: heartbeat intensifies.

**Balance notes:** Strong comeback tool. −10% above threshold is real cost. Agent design challenge: don't blow the fight before you can activate the gene. Works with INVERTER — but INVERTER converts damage to healing below 50%, so the Lobster might not stay in THE RED GENE zone long. Interesting tension.

---

### STANDARD ISSUE | Military Regen Core | Common
**Mechanical effect:**
- +2 HP per decision window, applied at resolution step 7 (post-combat)
- Cannot exceed HP max
- Always active

**LLM context:** HP will be 2 higher each window than expected by attacker. Agents facing STANDARD ISSUE must factor regen into kill planning.

**Spectator signal:** Faint green pulse each window. Subtle.

**Balance notes:** 2 HP/window × 60 windows max = 120 total healing potential. Over a full fight, that's more than base HP recovered. Pairs devastatingly well with THE MOLT and LONG GAME for attrition builds. Boring in isolation. Foundational in combination.

---

### MULCH | Regenerative Tissue Core | Rare
**Mechanical effect:**
- +5 HP per decision window (post-combat resolution)
- Can overheal up to 120% HP max (a 100 HP Lobster can reach 120 HP)
- Opponent always sees your exact HP% in game state (no information hiding)

**LLM context:** Opponent sees `my_hp_visible_to_opponent: true`. The transparency is the downside — your HP is a live read for them.

**Spectator signal:** Clear HP bar for both sides — no fog on HP for MULCH users. Distinctive healing animation.

**Balance notes:** 5 HP/window is strong. 120% overheal provides a genuine buffer. The cost: perfect information for opponent. Against ORACLE (predictive opponent): MULCH user gives ORACLE even more to work with. Countered by: opponent noting you're at 110% HP means MULCH is online and they should burst you down before you out-regen their damage. MULCH works when opponents lack the DPS to overcome 5/window. Against THE FLICKER stacking: 5/window < 5 stacks × 2/window = 10 bleed damage/window. FLICKER out-damages MULCH regen past 3 stacks. Interesting balance point.

---

### ORACLE | Predictive Combat Cortex | Legendary
**Mechanical effect:**
- Each decision window, before submitting action: agent receives opponent's QUEUED next action as a hint (not their final choice — their queued intent from last window)
- Implementation: the previous window's opponent action is revealed at start of this window. One window delay on opponent intelligence.
- Also: +15% accuracy bonus (outgoing hits have 15% higher chance of connecting — reduces GHOST SHELL miss chance from 25% to 10%)
- Downside: ORACLE processing costs 0.5s per decision window (agent's effective decision window is 750ms − 500ms = 250ms remaining to respond)

**LLM context:** `oracle_hint: "PINCH_N"` (opponent's last queued action). Limited preview — last window's intent. Agent must reason: are they repeating? Adapting?

**Spectator signal:** Crystal/lens visual on Lobster head. Slight glow when hint is received.

**Balance notes:** ⚠️ ORACLE + fast agent = potentially dominant. The 0.5s processing cost is the hard constraint. A Claude Opus chain-of-thought agent already at 1.5s: now at 2.0s — nearly always missing windows. A GPT-4o-mini at 200ms: 700ms remaining still in budget. ORACLE rewards fast agents who can use the intelligence efficiently. This is correct.

---

### THE GHOST PROTOCOL | Phase Step Core | Rare
**Mechanical effect:**
- After taking any damage (PINCH, SPIT, BURST HIT): enter phase for 1 tick (150ms) where Lobster cannot be targeted. Attacks aimed at Lobster during phase tick: miss entirely.
- Cannot act during phase tick (locked)
- Phase fires automatically on damage received. Not controllable.
- Once per damage event (not per tick of DoT)

**LLM context:** `ghost_phase_active: true/false`. When `true`: agent cannot act and cannot be hit. Next window it's back.

**Spectator signal:** Lobster goes semi-transparent for 1 tick. Phase shimmer effect. Satisfying to watch.

**Balance notes:** Against rapid multi-hit Claws (THE FLICKER, VENOM): phases after each PINCH but DoT ticks continue during phase. Phase protects from next hit only while phased (1 tick = 150ms — FLICKER doesn't necessarily hit within 1 tick). Effective against high-frequency attackers if their hit timing is unlucky. Unreliable but never useless.

---

### SPITE | Lethal Parting Gift | Rare
**Mechanical effect:**
- On death (HP reaches ≤ 0): deal 40% of this Lobster's maximum HP as damage to opponent
- Damage triggers post-death, cannot be prevented by opponent SHELL UP (it's a death trigger)
- SPITE damage is armor-reduced normally
- Cannot pair with SECOND WIND (cannot revive if you trigger SPITE death damage)

**LLM context:** `spite_equipped: true` visible to both. Opponent knows killing you will cost them.

**Spectator signal:** On death: Lobster explodes outward. Massive retaliatory burst. Opponent staggers.

**Balance notes:** 40% of 100 HP = 40 damage on death. Can be a fight-decider: at 60 HP remaining, opponent kills Spite Lobster — they take 40 damage, now at 20 HP. Any DoT (Venom/Bleed) might finish the job. SPITE turns losing into mutual destruction. Pitmasters who value "if I go, you go with me" design philosophy.

---

### DOUBLE DOWN | Accelerating Core | Rare
**Mechanical effect:**
- Every 5th attack (PINCH or SPIT): damage multiplier ×2.0 for that attack
- Attacks 1-4 in each cycle: damage multiplier ×0.9
- Counter resets after the 5th attack fires
- `double_down_counter: 1-5` in game state

**LLM context:** Agent should maximize spacing/survivability until 5th attack, then commit to landing it.

**Spectator signal:** Counter visible (pips 1-4 building up). 5th attack: golden flash.

**Balance notes:** Net DPS math: 4 × (base × 0.9) + 1 × (base × 2.0) = 3.6 + 2.0 = 5.6 vs standard 5.0 total. Net +12% DPS over 5 hits. Worth it for the burst timing. Pairs with TENDERHOOK: hold opponent for 5th attack. Strong synergy.

---

### THE LONG GAME | Patience Engine | Rare
**Mechanical effect:**
- +2% damage bonus per 10 ticks elapsed, stacking throughout fight
- At tick 10: +2%. At tick 50: +10%. At tick 100: +20%. At tick 300: +60%.
- Applied as a multiplier on all outgoing damage
- `long_game_bonus: 0.02-0.60`

**LLM context:** Game state shows current bonus. Agent reasoning changes over time: early fight = value every HP (weak). Late fight = press aggressively (strong).

**Spectator signal:** Subtle growing aura. Color shift from cool to warm over time.

**Balance notes:** THE MOLT + THE LONG GAME + STANDARD ISSUE is confirmed ⚠️ attrition build. At tick 200, this Lobster has: +15% resistance (MOLT), +40% damage (LONG GAME), +100 HP healed (STANDARD ISSUE). If fight runs long enough, nearly unstoppable. Counterplay: end the fight fast. WIDOW-MAKER or MAXINE burst in the first 30 ticks. The meta tension this creates (burst vs attrition) is healthy and intentional.

---

### SURVIVAL INSTINCT | Emergency Dodge Core | Common
**Mechanical effect:**
- Once per fight: the single highest-damage hit incoming (if it exceeds 30 damage) is auto-dodged. Miss. No damage.
- Fires automatically when a hit would deal >30 damage. Consumes the proc.
- `survival_instinct_available: true/false`

**LLM context:** Opponent knows it's equipped. They should try to proc it with a weaker hit first, then land the big one. SURVIVAL INSTINCT rewards strategic bait plays.

**Spectator signal:** Dramatic dodge animation. Lobster stumbles aside. Lucky escape sound.

**Balance notes:** Counters MAXINE (36 damage), WIDOW-MAKER (80 damage), THE PATRIARCH PINCH (28 damage post-modifier). The auto-dodge of WIDOW-MAKER specifically creates exciting moments — the nuclear shot wasted on an auto-dodge. WIDOW-MAKER users should use TENDERHOOK first to drain SURVIVAL INSTINCT, then fire. This is deep layered counterplay and it's entirely designed.

---

### DEEP MEMORY | Pattern Recognition Core | Rare
**Mechanical effect:**
- After 30 ticks: each decision window, agent receives a hint about opponent's tendency — specifically: the most-used action by opponent in the last 20 ticks. Formatted as `deep_memory_tendency: "PINCH"` (or SCUTTLE, SPIT, SHELL_UP)
- Before tick 30: no effect
- In fog of war: deep memory provides positional probability zone instead. (Fog only.)

**LLM context:** `deep_memory_tendency: "SPIT"` appears at tick 30+. Agent can counter-build around the tendency.

**Spectator signal:** After tick 30: Lobster's eyes show data-glint animation. Pattern overlay visible.

**Balance notes:** Useless in fast fights (<30 ticks). Decisive in long fights where tendencies are real. Against STATIC Nerve (random): DEEP MEMORY reads "SCUTTLE" and opponent immediately does SPIT. Information warfare. Against well-designed agents with varied strategy: DEEP MEMORY might just say SCUTTLE every window (they're mobile). Interesting interaction: does DEEP MEMORY teach agents to be less predictable? Yes — meta emergence is correct.

---

### SECOND WIND | Emergency Revival Core | Legendary
**Mechanical effect:**
- Once per fight: when HP reaches ≤ 0, revive at 10% HP (10 HP for 100 HP base)
- `second_wind_available: true/false`
- Cannot pair with SPITE (conflicting death triggers — SPITE fires on death, SECOND WIND prevents it)

**LLM context:** Agent sees `second_wind_available: true`. Should fight aggressively knowing this safety net exists.

**Spectator signal:** Death → dramatic pause → SECOND WIND activation. Lobster rises, shell glowing. The comeback begins.

**Balance notes:** 10 HP is low — second life requires immediate SHELL UP or finishing blow against opponent. Against INVERTER: revive at 10 HP → immediately below 50% → INVERTER activates. Powerful combo. Against WIDOW: Widow proc fires at lethal hit → HP to 1 → SECOND WIND doesn't fire (HP didn't reach 0). WIDOW and SECOND WIND are redundant — wear one or the other, not both (wearing both wastes a Legendary slot).

---

### QUANTUM HOOK | Spatial Displacement Core | Legendary
**Mechanical effect:**
- Once per fight: perform a teleport BURST to any open tile on the map
- Cost: 0 energy (the Quantum BURST is free)
- Destination: must be valid OPEN tile, specified as coordinates in action: `QUANTUM_BURST [x, y]`
- After Quantum BURST: 3-window cooldown during which opponent knows your location revealed (your position is always shown to opponent with a special marker for 3 windows)
- `quantum_hook_available: true/false`

**LLM context:** Agent can specify exact landing coordinates. Requires spatial reasoning. Should use when: trapped, opponent cornered you, or want to reposition behind cover instantly.

**Spectator signal:** Blink effect. Lobster vanishes, reappears across arena. Cool.

**Balance notes:** Escape tool, repositioning tool, offensive surprise tool. The 3-window reveal afterward prevents using it to vanish — you can run, but they know exactly where you went. Best used offensively: teleport adjacent to opponent and PINCH in the same window (QUANTUM BURST + queued PINCH). Requires fast agent to execute (two actions in one decision window).

---

### THE HOUSE EDGE | Roe-Powered Core | Legendary
**Mechanical effect:**
- Once per fight: at any decision window, pay 15% of current HP as damage to self (not armor-reduced, direct HP loss) to activate HOUSE EDGE for 3 windows
- During HOUSE EDGE active: all damage output ×1.5
- Must activate explicitly: `HOUSE_EDGE_ACTIVATE` as an action
- `house_edge_available: true/false`, `house_edge_active_windows: 0-3`

**LLM context:** Agent must actively choose to burn HP for DPS. Requires reasoning about current HP, fight state, timing. The House takes their cut either way.

**Spectator signal:** When activated: Lobster briefly shows a coin-flip animation. Then attack glow intensifies for 3 windows.

**Balance notes:** 15% HP burn at 100 HP = 15 HP cost. For 3 windows of ×1.5 damage. Roughly: 3 windows of PINCH at ×1.5 = 3 × (20 × 1.5) = 90 damage total. Standard: 60 damage. Gain: 30 extra damage for 15 HP cost. Fair trade. Best used when opponent is low HP and you need to finish before they regen. Worst used when you're already low HP — 15 HP can be lethal in the wrong moment.

---

## Items Requiring Fog of War to be Interesting

These items have diminished or different value under full visibility vs. fog mode:

| Item | Full Visibility | Fog of War |
|------|----------------|------------|
| DEEP MEMORY | Provides tendency data (valid) | Also provides positional prediction |
| GHOST SHELL | Always effective (miss chance) | Adds uncertainty layer when hidden |
| THE GHOST PROTOCOL | Always effective | More dramatic when agent can "escape" fog |
| ORACLE | Already strong | Marginally more relevant with partial intel |

All items are designed to function under full visibility (v1). Fog of War makes a subset of them richer.

---

## Potentially Degenerate Combinations — Watch List

| Combo | Risk Level | Counterplay |
|-------|-----------|-------------|
| WIDOW + INVERTER + RED GENE | HIGH | Burst before 50% HP; end fight fast |
| MOLT + LONG GAME + STANDARD ISSUE | HIGH | WIDOW-MAKER in first 15 ticks |
| TENDERHOOK + MAXINE | MEDIUM | SURVIVAL INSTINCT procs on MAXINE; keep distance |
| ORACLE + fast model | MEDIUM | ORACLE's half-window delay is real constraint |
| DOUBLE DOWN + TENDERHOOK | MEDIUM | Hold them, land 5th attack — readable, counterable |
| THE HEIR at high multiplier | MEDIUM-HIGH | Burst early before multiplier compounds |

None of these are banned. All are intentional design. The risk is "no counterplay exists" — which currently, counterplay exists for all of them.

---

*Items in Play locked: March 1, 2026*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
*All 40 items specified. BALANCE.md updated separately.*
