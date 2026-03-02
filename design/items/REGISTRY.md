# ITEM REGISTRY

*41 items. Every item has a name, a downside, a sound, and a reason to exist.*

See `BALANCE.md` for legacy constraints. See `SOUND-DESIGN.md` for full SFX specs.

The full item behavior and edge cases live in:
→ `design/systems/ITEMS-IN-PLAY.md`

---

## Quick Reference

### Carapace (14)
| Name | Rarity | HP | Key Effect | Downside |
|------|--------|----|------------|----------|
| BLOCK-7 | Common | +30 | 10% dmg reduction | Speed -15% |
| THE ORIGINAL | Common | +15 | None | No upside spikes |
| HARDCASE | Common | +40 | Heaviest armor | No BURST, move costs energy |
| SILKWORM | Rare | ±0 | Scatters 20% dmg | -10 HP below base |
| THE ROLL | Rare | -10 | Dodge while moving | Stationary = exposed |
| ECHO | Rare | +10 | Auto counter queue on hit | Value depends on timing |
| THE MOLT | Rare | -5 start | +5% resist per 20 ticks | Weak early |
| WIDOW | Rare | -15 | Survive 1 lethal hit | Low base HP |
| BLEED BACK | Rare | -10 | 8% dmg reflect | Fragile |
| THE PATRIARCH | Legendary | +60 | 20% dmg reduction | No BURST, slow |
| GHOST SHELL | Legendary | ±0 | 25% miss chance | No reduction floor |
| INVERTER | Legendary | ±0 | Below 50%: dmg -> HP | No protection above 50% |
| THE SARCOPHAGUS | Legendary | -20 after | First 3 hits deal 0 | Breaks into 80 HP shell |
| PAPER-MACHÉ | Common | -40 | Extreme speed profile | Dies fast |

THE ROLL naming note: yes, The House made a food joke and refuses to explain it.

### Hand Weapons (12)
| Name | Rarity | Tag | Key Effect | Downside |
|------|--------|-----|------------|----------|
| MAXINE | Common | Melee | +80% heavy hits | Cooldown windows |
| SNAPPER | Common | Melee | Reliable baseline | No spike effect |
| THE REACH | Common | Ranged | Longer SPIT range | -20% damage |
| THE FLICKER | Rare | Melee | Bleed stacks (8 max) | Weak direct hits |
| BUZZ | Legendary | Ranged | 25% stun chance | Lower base damage |
| NEEDLE | Rare | Melee | Armor pierce | -50% damage |
| THE APOLOGIST | Rare | Melee | 20% enemy misfire | Inconsistent output |
| TENDERHOOK | Rare | Melee | 1x hold for 2 windows | One-use control |
| VENOM | Rare | Ranged | Unlimited DoT stacks | Near-zero direct damage |
| WIDOW-MAKER | Legendary | Melee | One massive hit | Breaks after use |
| CRACKER | Common | Melee | Strips armor reduction | Weak vs unarmored |
| THE HEIR | Rare | Melee | Scales with wins | Starts below baseline |

### Hand Shields (2)
| Name | Rarity | Key Effect | Downside |
|------|--------|------------|----------|
| REVERSAL | Legendary | SHELL UP reflects 60% of received dmg | Requires guarding, baitable |
| THE ORIGINAL APPENDAGE | Legendary | Status immunity + offensive boost profile | Locks out Legendary Tomalley pairing |

### Tomalley (13)
| Name | Rarity | Key Effect | Downside |
|------|--------|------------|----------|
| THE RED GENE | Common | Below 40% HP: +40% dmg | -10% dmg above 40% |
| STANDARD ISSUE | Common | +2 HP/window | No active swing turn |
| MULCH | Rare | +5 HP/window, overheal to 120% | Opponent reads HP clearly |
| ORACLE | Legendary | Predict opponent, +15% accuracy context | Higher cognitive tax |
| THE GHOST PROTOCOL | Rare | 1-tick phase after hit | Cannot act during phase tick |
| SPITE | Rare | On death: 40% maxHP damage | No living benefit |
| DOUBLE DOWN | Rare | Every 5th attack: 200% | Attacks 1-4 are weaker |
| THE LONG GAME | Rare | +2% dmg per 10 ticks | Slow early payoff |
| SURVIVAL INSTINCT | Common | 1x auto-dodge highest direct hit | Can trigger suboptimally |
| DEEP MEMORY | Rare | Pattern insight after 30 ticks | Useless in short fights |
| SECOND WIND | Legendary | Revive 1x at 10% HP | Cannot pair with SPITE |
| QUANTUM HOOK | Legendary | 1x teleport BURST | One use, then gone |
| THE HOUSE EDGE | Legendary | Pay Roe for +50% dmg | The House always profits |

---

## Balance Constraints

- Combos are intentionally supported.
- There is no universal best item; power is context and matchup driven.
- Every item keeps a downside so counterplay stays live.
