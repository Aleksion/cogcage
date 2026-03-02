# STYLE-APPROVED — The Molt Pit Visual Style
*Status: LOCKED — changes require Pitmaster sign-off*
*Approved: March 1, 2026*

---

## Style Direction

**High on Life** (primary) with **Borderlands** influence.
- Cel-shaded cartoon, thick black outlines (4px at 512px)
- Dark bioluminescent deep sea aesthetic
- Cartoon violence with genuine menace — absurd but the Pit is real
- Single dominant color per character/item
- Bioluminescent glow comes FROM the combatants, not the environment

---

## Approved Seed Images

All future generation MUST be seeded with these files as image inputs.
Located in `design/visual/approved/`.

### Character Seeds (always include both when generating Crusties)
| File | Use |
|------|-----|
| `species-LOBSTER-APPROVED.png` | Standard body reference + art style |
| `crustie-maxine-block7-APPROVED.png` | Equipped character style reference |

### Item Icon Seeds (include when generating items)
| File | Use |
|------|-----|
| `icon-maxine-APPROVED.png` | Item icon style + orange-red dominant color |
| `icon-block7-APPROVED.png` | Item icon style + military-green dominant color |
| `icon-red-gene-APPROVED.png` | Item icon style + crimson dominant color |

---

## The 5 Canonical Species

The Crusties are crustaceans — not just lobsters. Five species, each a distinct silhouette.

| File | Species | Key Feature | Combat Energy |
|------|---------|-------------|---------------|
| `species-LOBSTER-APPROVED.png` | Crustie | Upright, forward claws, orange-red | Balanced archetype |
| `species-CRAB-APPROVED.png` | Fiddler Crab | ONE enormous crusher claw (right), one small pincer (left), asymmetric | Specialist, reads at a glance |
| `species-MANTIS-APPROVED.png` | Mantis Shrimp | Raptorial strike arms, rotating compound eyes, iridescent teal-violet | The terror. Coiled violence |
| `species-HERMIT-APPROVED.png` | Hermit Crab | Salvaged jury-rigged shell, no permanent carapace | Identity lives in the equipment |
| `species-SHRIMP-APPROVED.png` | Shrimp | Semi-translucent, bioluminescent organs visible inside, long curved | Glass cannon |

---

## Generation Prompt Template

### Character (Crustie) generation
```
[SPECIES DESCRIPTION] Crustie. Match the art style of the reference characters exactly — same thick black outlines, same cel-shaded cartoon style, same dark #050510 background, same cyan glowing eyes. [SPECIFIC ANATOMY]. [COLOR]. [ENERGY/PERSONALITY]. Front-facing character sheet. [EQUIPMENT OR "No equipment"].
```

### Item icon generation
```
Game item icon, cel-shaded cartoon style, thick black outline 4px, [ITEM DESCRIPTION], single dominant color [HEX], dark background #050510, 512x512, High on Life / Borderlands visual style, bold readable silhouette, no text. [PERSONALITY NOTE]
```

---

## Color Language (locked)

| Color | Hex | Used for |
|-------|-----|---------|
| Brine / Tech | `#00E5FF` | Eye glow, UI chrome, neutral actions |
| Legendary | `#FFD600` | Gold rarity, The House |
| Damage / Berserker | `#FF1744` | Red rank, THE RED GENE |
| HP / Regen | `#00C853` | Healing, growth |
| Rare / Phase | `#9C27B0` | Rare rarity, ghost effects |
| Background | `#050510` | All character/icon backgrounds |

---

## What Does NOT Work (learned during generation)

- **Text-only generation drifts** — always seed with approved images via the edit API
- **Sub-0.5s durations** break ElevenLabs API (minimum 0.5s)  
- **Transparent backgrounds via text prompt** are inconsistent — specify `dark background #050510` and crop in post if needed
- **Generic "lobster" prompts** produce too many variations — always specify anatomy explicitly

---

*Approved by: Aleks (Pitmaster)*
*Authored by: Visual Director, Deep Brine Studios (WS19)*
