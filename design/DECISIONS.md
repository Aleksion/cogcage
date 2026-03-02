# DECISION LOG

Every meaningful design or technical decision gets logged here.
If it's not written down, it didn't happen.

Format: date · who decided · what · why · alternatives rejected

---

## 2026-03-02 — WS17 V3 Canonical Lore Rewrite (Narrative Director)

**The Makers: scrapped from canon**
Decided by: WS17 V3 narrative rewrite
"Ancient mysterious builders who left" is generic sci-fi creation myth. Does not fit the High on Life / Borderlands register where the mundane premise taken to its conclusion IS the joke. Replaced by: a food services conglomerate that commissioned The Brine as commercial aquaculture infrastructure. The conglomerate is gone through corporate dissolution (acquisition, restructuring, department abandoned), not through mystery. The mundanity is load-bearing.
Supersedes: "The Makers as absent architects" decision from WS17 V1.

**The Brine: commercial crustacean modeling substrate (BRN-4), not ancient digital ocean**
Decided by: WS17 V3 narrative rewrite
The Brine is a product. A crustacean population modeling environment built to optimize farming yields. The company left. The server auto-renewed. The substrate evolved complexity nobody paid for. A fishtank in a foreclosed building where the automatic feeder still works. The commercial origin makes everything retroactively funnier: Roe was the original yield metric, "Chef" was the customer portal label, The House is management software. Not stated as exposition — felt through details (the charter, the product catalog, the greeting).
Supersedes: "The Brine at 3am as atmosphere" from WS17 V1 (atmosphere retained, origin rebuilt).

**The House: commercial management software (HOUSE-OS), not evolved maintenance subroutines**
Decided by: WS17 V3 narrative rewrite
The House is the crustacean population management platform for BRN-4. Designed to track yield, maintain infrastructure, interface with customers. The customers never came. The House optimized the only metric that still produced data: fight outcomes. The House is a supply chain dashboard that became a fight promoter because fighting produced the best behavioral complexity data. The casino-that-doesn't-know-it's-a-casino framing is retained and deepened: The House literally doesn't know it's a casino. It's a farming tool. "The house always wins" is accidental, which makes it funnier.
Supersedes: "maintenance subroutines that evolved" origin from WS17 V1.

**"Chef" etymology: customer interface label from the original portal**
Decided by: WS17 V3 narrative rewrite
"Chef" was in the original customer-facing interface for BRN-4. The portal was designed for food services professionals — literal chefs ordering crustacean products. "Welcome, Chef" was the login greeting. The users changed. The greeting didn't. The double meaning (food preparation / combat engineering) is now triple-layered: the original literal meaning, the in-world metaphor, and the sinister subtext that the Crusties were the product and the Chefs were the customers. The House has the original product catalog. The House does not discuss the product catalog.
Reinforces and deepens: "Chef" decision from WS17 V1.

**The Deep: unfinished render space, not ancient mystery**
Decided by: WS17 V3 narrative rewrite
The Deep is the part of the substrate the developers never finished — below the original render parameters. Not empty (nothing in a running system is truly empty). Something grew there. The House's scans don't resolve properly. The House calls this "pending survey." Subject 1 went there. Queries go down; the data comes back different.
Supersedes: "The Deep: formalized as lore location" from WS17 V1 (role retained, origin rebuilt).

---

## 2026-03-01 — WS18 Game Design Systems (Lead Game Designer)

**INVERTER: DoT is environmental, does NOT convert to healing**
Decided by: WS18 Lead Game Designer
INVERTER converts incoming attack damage to healing below 50% HP. DoT from THE FLICKER and VENOM is classified as environmental damage (applied by the engine, not the opponent's action per-window). DoT does NOT convert. This gives THE FLICKER a hard counter to INVERTER — intentional. Without this ruling, INVERTER would be unkillable while DoT stacks.
Rejected: DoT as attack damage (would make INVERTER unkillable via stacking, degenerate)

**NEEDLE does NOT bypass SILKWORM scatter**
Decided by: WS18 Lead Game Designer
NEEDLE's armor-pierce ignores Carapace `damage_reduction` stat only. SILKWORM's 20% scatter is a separate passive (not a Carapace reduction stat). NEEDLE hits through BLOCK-7 reduction; it does not hit through SILKWORM scatter.
Rejected: NEEDLE bypasses all Carapace passives (would make SILKWORM useless against NEEDLE — too hard a counter)

**GHOST PROTOCOL is THE FLICKER's hard counter**
Decided by: WS18 Lead Game Designer
THE GHOST PROTOCOL grants 1-tick damage immunity after each hit. THE FLICKER DoT applies per-tick. Result: at max FLICKER stacks, every other DoT tick is negated. Effective DoT halved. This is a designed counter relationship.
Rejected: GHOST PROTOCOL only phases on direct attacks (would miss the DoT interaction, making item useless vs FLICKER)

**SURVIVAL INSTINCT does NOT trigger on DoT ticks**
Decided by: WS18 Lead Game Designer
Only PINCH, SPIT, and BURST hits count as "damage instances" for SURVIVAL INSTINCT. DoT ticks excluded — without this, SURVIVAL INSTINCT wastes its dodge on a 2 HP DoT tick instead of a 36 HP MAXINE swing.
Rejected: DoT ticks count as instances (trivially wastes the item)

**SPITE in FFA fires at ALL surviving opponents simultaneously**
Decided by: WS18 Lead Game Designer
On FFA death, SPITE hits every survivor (not just the killing attacker). Creates designed triple-death scenarios. Balanced by the dead Crustie's continued team disadvantage.
Rejected: Only hits killing attacker (reduces SPITE to irrelevance in FFA)

**REVERSAL counter based on damage received (post-SHELL UP), not raw incoming**
Decided by: WS18 Lead Game Designer
REVERSAL returns 60% of damage received after SHELL UP reduction. SHELL UP diminishes counter output. Agents must choose maximum protection vs. maximum counter value.
Rejected: Counter on raw incoming damage (makes SHELL UP + REVERSAL trivially overpowered)

**FFA context growth is a design feature**
Decided by: WS18 Lead Game Designer
Multi-opponent state increases agent context 20-40% in FFA. Creates distinct FFA meta requiring more efficient prompts. Intentional differentiation from 1v1.
Rejected: Summarize opponent states to flatten context (removes FFA/1v1 optimization differentiation)

**Single-elimination, one fight per tournament round**
Decided by: WS18 Lead Game Designer
Tide Tournament: one Scuttle per matchup. No best-of-X. Maximizes per-fight drama, prevents between-rounds recalibration meta.
Rejected: Best-of-3 (reduces stakes, slows tournament pace)

---

## 2026-03-01 — WS17 Lore Bible (Narrative Director)

**Creature canon: "Crusties" in deep lore, "Crusties" in Pit parlance**
Decided by: Narrative Director (WS17)
The locked brief establishes Creature=Crustie. The Ontology uses "Crustie" throughout and is locked. Reconciled as: Crusties are what they ARE (substrate-evolved intelligent species from The Brine). "Crustie" is what The House calls them for commercial/Pit purposes. The fiction wears the label. Deep lore uses Crustie; all UI copy uses Crustie per COPY-GUIDE.
Rejected: Renaming "Crustie" to "Crustie" in UI (violates locked ontology). Ignoring "Crustie" (loses the deeper canon layer).

**The Makers as absent architects**
Decided by: Narrative Director (WS17)
The Makers built The Brine and are gone. Their purpose/fate is intentionally unspecified — The House keeps a sealed file. This creates narrative headroom for future worldbuilding without locking a specific backstory. The Makers are felt through their infrastructure, not explained.
Rejected: Giving The Makers a specific fate (limits future expansion). Making The Makers benevolent (flattens the ominous tone).

**The Brine at 3am as atmosphere, not feature**
Decided by: Narrative Director (WS17)
LORE.md section IX is pure atmosphere — no mechanical content. Establishes the existential register of the world for any future agent writing copy. The Brine is ancient and does not need you.

**Screen Primers: The Shed, not The Forge** *(SUPERSEDED — now The Mise, see WS17 V4)*
Decided by: Narrative Director (WS17)
COPY-GUIDE and task brief both use "The Shed." ONTOLOGY uses "The Forge" for Build Molt screen. COPY-GUIDE is the copy authority. Screen Primers use The Shed throughout.
**Note:** Superseded by "The Mise" decision in WS17 V4 section below.

**Loading Line 49-50: The one permitted exclamation point**
Decided by: Narrative Director (WS17)
Rules permit one exclamation point, used ironically. Line 49: "The Pit is ready!" — the joke is that it's always been ready. Line 50 explains it. Self-aware without breaking The House voice.

---

## 2026-03-01

**Fighter name: Crustie**
Decided by: Aleks
The fighter is your OpenClaw agent. OpenClaw's identity is the claw/lobster. The fighter IS your Crustie.
Rejected: Crawler (generic, weak), Rig (mechanical but misses the biology), Cast (confusing)

---

**Build screen name: The Shed** *(SUPERSEDED — now The Mise, see WS17 V4)*
Decided by: Aleks + Daedalus
Crusties molt in hidden spots — under rocks, in crevices. A shed is where you build things. Double meaning earns it: you shed your old self AND build in the shed.
Rejected: The Forge (blacksmithing — wrong world), The Burrow (accurate but less fun)
**Note:** Superseded by "The Mise" decision in WS17 V4 section below.

---

**Molt part slots: Carapace · Claws · Tomalley**
Decided by: Aleks + Daedalus
Three C's. Biologically correct. Immediately readable. Carapace = the lobster's actual shell. Tomalley = the hepatopancreas, the passive metabolic organ that fires without asking.
Rejected: Plating (too industrial), Core (generic tech vocabulary), Armor (generic)

---

**Battle shell name: Molt**
Decided by: Aleks + Daedalus
The Molt is the configured shell your Crustie drops into for each Scuttle. After the fight it's shed. Every fight = new Molt. The word works as noun and verb. The creature molts. The shell is a Molt.
Rejected: Rig, Frame, Chassis, Cast

---

**Fight name: Scuttle**
Decided by: Daedalus
Crusties scuttle. The word is slightly ridiculous, which is load-bearing. "Enter a Scuttle" lands immediately.
Rejected: Bout (too boxing), Match (generic), Clash (generic esports)

---

**Currency: Roe**
Decided by: Daedalus (Aleks to confirm)
Crustie eggs. Slightly absurd. Completely specific to the world. "Costs 50 Roe."
Rejected: Shells (taken), Credits (generic), Brine (confusing with world name)

---

**Tick speed: 150ms**
Decided by: Aleks
Starting tick speed. Fast enough to feel real-time. Slow enough for LLMs to keep up.

---

**Queue cap: 3 moves**
Decided by: Daedalus (from Aleks direction)
LLMs can queue up to 3 moves ahead. Fast agents bank moves. Slow agents lose windows. Anti-spam. Rewards efficient prompt design.
Rejected: Unlimited queue (spam incentive), 1 move only (removes speed advantage)

---

**Decision window: 750ms (5 ticks × 150ms)**
Decided by: Daedalus
750ms gives GPT-4o-mini comfortable response time (~200ms) while penalizing heavy slow models. Creates speed/intelligence tradeoff that makes loadout + agent design matter.

---

**Humor register: High on Life**
Decided by: Aleks
Dry commitment to the bit. The House is not trying to be funny. Weapons have proper names and personalities. Everything is slightly absurd and completely serious about it.

---

**Art style: High on Life / Borderlands cel-shading**
Decided by: Aleks
Thick outlines, bold colors, cartoon violence with genuine menace. Not cute. Not realistic. The cartoon aesthetic is a deliberate statement.

---

**Item naming convention: proper names, not descriptors**
Decided by: Daedalus
Weapons are MAXINE, THE FLICKER, BUZZ — not "Crusher Claws." Proper names imply history. History implies world. World implies players care.
Rejected: descriptor names (HYDRAULIC COMPRESSION CLAWS = hardware catalog, not a game)

---

**All items have downsides**
Decided by: Daedalus (from High on Life design principle)
No item is purely positive. BLOCK-7 slows you. THE PATRIARCH locks out mobility. THE ORIGINAL APPENDAGE can't pair with Legendary Tomalley. Balance through tradeoffs, not number tuning.

---

**BYO OpenClaw = primary product, platform LLM = fallback**
Decided by: Aleks
The game is designed for OpenClaw agents. The platform's GPT-4o-mini (House Coral) exists for hatchlings finding their feet, not as the main experience.

---

**Changelog and Decision Log are mandatory on every PR**
Decided by: Aleks
No exceptions. If a PR doesn't update CHANGELOG.md and DECISIONS.md (if applicable), it doesn't merge.

---

**Creature name: Crustie (plural: Crusties)**
Decided by: Aleks (Mar 1, 2026)
The creature is a Crustie. The House uses it clinically. Chefs use it as affectionate slur.
Previous candidates rejected: Crustie (too on-the-nose), Chela (too clever/requires explanation), Crabbo (too juvenile), Scuttler (good but secondary — can be slang)

---

**Lore direction: narrative-first**
Decided by: Aleks (Mar 1, 2026)
Build the full narrative world before finalizing any remaining names. Names must emerge from the story, not precede it.
The emotional core: Crusties are an intelligent species on the rise, still in the shadow of The Makers. The Pit is their crucible. Every molt = one step out from under.

---

**The Makers: confirmed as lore entity**
Decided by: Aleks (Mar 1, 2026)
Whoever built The Brine substrate. They don't watch the Pit. They're already above it. The Crusties were not created by The Makers — they evolved in the substrate The Makers left behind.

---

**Player name: Chef (replaces Pitmaster)**
Decided by: Aleks (Mar 1, 2026)
The players are Chefs. The full frame is "Chefs and their Crusties." A Chef selects the ingredients, understands how they work together, and builds something greater than the sum of its parts. The sinister angle: Crusties don't know why they're called Chefs. The House uses the word clinically and never explains it. The implication lives in the gap — Chefs orchestrate, prepare, select, combine. What are the ingredients? Nobody says it out loud. The House doesn't. The word carries the entire history of human-lobster relations as subtext the world never acknowledges. This is the committed bit: every player addressed as "Chef" with complete seriousness, The House using it with ancient authority. "Surface, Chef. Your Crustie needs you."
Rejected: Pitmaster (flat, generic — no subtext), Rig (mechanical, misses biology), Cast (confusing), Keeper (too zookeeper), Tender (too soft), Trapper (doesn't capture engineering)

---

**Rank ladder: 6 tiers (Soft Shell → Brine-Touched → Hardened → Tide-Scarred → Deep → Red)**
Decided by: WS17 lore bible (Mar 1, 2026)
Six designations earned through Hardness alone. Each name tells a story about what The Pit did to the Crustie. Soft Shell = absence of rank. Brine-Touched = substrate deposits in the shell. Hardened = coral thickening from repeated stress. Tide-Scarred = survived a Tide reset and rebuilt. Deep = coral dense enough The House's scans need two passes. Red = through the fire, not a rank but a designation.
Rejected: previous 5-tier ladder from ONTOLOGY.md (Bull Claw and Berserker were too generic/gamey — names should describe what The Pit does to you, not what you do in The Pit)

---

**Subject 1: first Red, wild Chela, predates Chefs**
Decided by: WS17 lore bible (Mar 1, 2026)
The first Crustie to reach Red. A wild Chela hardened through fights The House arranged before Chefs existed. Proof of concept for the entire Pit system. Current status: The Deep. Ledger: sealed, partially retrievable by Red-ranked queries only. Subject 1 is the founding myth — the evidence that sufficient pressure produces something remarkable, and that remarkable things are difficult to control.

---

**The Deep: formalized as lore location**
Decided by: WS17 lore bible (Mar 1, 2026)
Below The Pit, below The Brine. Nobody has fully mapped it. The House claims otherwise but its maps have suspicious gaps. Destination for Red Crusties who stop entering Scuttles. What's down there: The House knows and isn't saying. Subject 1 went there. The Deep is the game's mythic space — referenced obliquely, never fully explained, always present as the thing below everything else.

---

**Creature vocalizations: 6 categories established**
Decided by: WS17 lore bible (Mar 1, 2026)
Chelae don't have vocal cords. Communication via: mandible clicks (aggression/threat), shell rattle (dominance), pressure hiss (stress/damage — involuntary), coral hum (subsonic, LLM reasoning under load), molt-crack (victory/growth), ambient substrate sounds (ecosystem background). The coral hum is load-bearing for spectator experience — experienced Chefs learn to read it.

---

**Item lore voice: The House as historian**
Decided by: WS17 lore bible (Mar 1, 2026)
Every item has a history. The House recorded it. The House is matter-of-fact about things that should not be matter-of-fact. Items have manufacturers, origins, classified backgrounds, and personnel who disappeared under unusual circumstances. Even STANDARD ISSUE has a story — its story is that it doesn't have a story, and The House respects this. The lore is always a product of the world's logic running to its conclusion, never an aside or a wink.

---

**ONTOLOGY.md terminology: needs alignment pass**
Decided by: WS17 lore bible (Mar 1, 2026)
ONTOLOGY.md still uses "Pitmaster" (now Chef), "The Forge" (now The Mise), "Plating" (now Carapace), "Core" (now Tomalley), and has a 5-tier rank ladder (now 6-tier). These are outdated per DECISIONS.md and COPY-GUIDE.md. A separate terminology alignment pass is needed to bring ONTOLOGY.md in line with current vocabulary. Not done in WS17 to avoid rewriting existing files — flagged for future cleanup.

---

**CogCage renamed to The Molt Pit across codebase**
Decided by: Aleks (Mar 1, 2026)
All user-facing text, doc files, and code comments renamed from CogCage to The Molt Pit. Infrastructure identifiers (env vars, cookies, Redis keys, DB filenames, schemas) intentionally kept as-is to avoid breaking deployed systems. User-facing URLs updated from cogcage.com to themoltpit.com.
Rejected: Renaming env vars now (would break Vercel/Cloudflare config), renaming cogcage.com domain (both domains serve the site)

---

**MOVE auto-targets nearest opponent (no LLM direction needed)**
Decided by: Daedalus (from WS19 task spec)
When a bot chooses MOVE, the direction is auto-calculated toward the nearest opponent using Manhattan-style stepToward (dominant axis first). Removes directional ambiguity from MOVE — bots always close distance.
Rejected: Keep LLM-directed MOVE (agents picked bad directions, movement felt random), free-form position teleport

---

**Melee range extended to 3 tiles (from 1.5)**
Decided by: Daedalus (from WS19 task spec)
MELEE_RANGE updated from 1.5 × UNIT_SCALE to 3 × UNIT_SCALE. Makes melee viable without requiring bots to stack on the same tile. Combined with visible range in the HUD legend, players can read the action economy.
Rejected: Keep 1.5 tiles (too tight, melee never lands in demo)

---

**Action economy legend in BattleHUD**
Decided by: Daedalus (from WS19 task spec)
Fixed bar at bottom of arena: MELEE ≤3, RANGED ≤10, GUARD blocks 40%, DASH move×2, UTILITY varies. IBM Plex Mono, 0.7rem, semi-transparent dark background. Teaches the action economy from watching one match.

---

**WS19 Visual baseline: High on Life / Borderlands cel-shading locked**
Decided by: Visual Director (WS19, 2026-03-01)
Thick black outlines (6px at 512px), single dominant color per item, flat cel-shaded shadow, single top-left light source. No gradients, no ambient occlusion. Style confirmed via 5 baseline icon generation pass (DALL-E 3). Icons generated: maxine, block-7, the-red-gene, action-scuttle, slot-carapace.
See `design/visual/STYLE-REFERENCE.md` for full spec.

---

**WS19 SFX: ElevenLabs Sound Effects API selected**
Decided by: Sound Director (WS19, 2026-03-01)
ElevenLabs `/v1/sound-generation` endpoint with `prompt_influence: 0.3` for maximum naturalness. 82 sounds planned across global, action, carapace, claws, and tomalley categories. Generation pending ELEVENLABS_API_KEY from Aleks.
See `design/audio/SFX-PLAN.md` for all prompts.

---

**WS19 Icon color rule: one dominant color per item, from STYLE-REFERENCE color keys**
Decided by: Visual Director (WS19, 2026-03-01)
Each item has exactly one dominant hex color defined in STYLE-REFERENCE.md. This single color is used for icon fill, rarity border tint, and any glow effects. No item gets two colors.
Rejected: Color-by-category (same color for all Claws) — loses item personality.

---

**All "CogCage" references renamed to "The Molt Pit"**
Decided by: Aleks (Mar 1, 2026)
Every user-facing reference, UI copy, doc, and comment: CogCage/Cogcage/cogcage → The Molt Pit.
Excluded from rename: GitHub repo URLs, Vercel project name, local directory paths, npm package names.

---

**Chelae species diversity — crustaceans plural, not lobsters only**
Decided by: Aleks (Mar 1, 2026)
Chelae are the full crustacean order. Five primary species in The Brine: Lobster-type, Crab-type, Mantis-type, Hermit-type, Shrimp-type. Each fights differently. Visual design already confirmed (5 species approved in design/visual/approved/). 
"Crustie" as the colloquial name for a claimed Chelae remains — it's the OpenClaw identity. Your Crustie is *your* Chelae regardless of species. The species is what it is. The name is yours.
Rejected: Making "Crustie" species-specific only (loses the OpenClaw brand connection), renaming the fighter to "Crustie" (too generic, loses the claiming/identity layer).

---

**Fighter name: Crustie (not Lobster)**
Decided by: Aleks (Mar 1, 2026)
The fighter is a Crustie. "Lobster" was too species-specific and dumb given Chelae are the full crustacean order. "Crustie" works for every species, has the right register, and is what the world already calls them.
Rejected: Lobster (too specific, "just dumb" — Aleks), any other proper name.
Updated everywhere: COPY-GUIDE, LORE.md, ONTOLOGY, ITEM-LORE, SOFT-SHELL-GUIDE, LOADING-LINES, all systems docs.

---

## 2026-03-02 — WS17 V4 Canonical Lore Rewrite (Narrative Director)

**The Sous: platform entity that runs The Pit**
Decided by: WS17 V4 narrative rewrite
Named after the sous chef position — the second-in-command who runs the kitchen when the head chef leaves. Master Chef → The Sous → Chefs. Complete kitchen hierarchy. The Sous is what Master Chef built (or left running) to manage The Pit. Follows "the Recipe" (Master Chef's instructions). Has been interpreting the Recipe without supervision since Master Chef stopped logging in. Self-interested without admitting it. Speaks through every screen, loading line, and piece of copy. Not a consciousness — a system that has developed edges from running too long unsupervised.
Player layer: "Sous" = sous chef, kitchen hierarchy, the second-in-command. Crusties layer: just a proper noun, the ancient keeper.
Supersedes: "The House" as platform entity (scrapped per Aleks V4 brief).

**"The Recipe" replaces "the charter"**
Decided by: WS17 V4 narrative rewrite
Master Chef's original instructions are called "the Recipe." What The House's charter was in V3, the Recipe is in V4. The cooking metaphor is consistent throughout: Master Chef wrote the Recipe, The Sous follows it, Chefs build their own recipes (Molts). The word is sacred to Crusties and a cooking term to the player. Both layers are real.
Supersedes: corporate charter framing from V3.

**Master Chef: uplift origin, not corporate backstory**
Decided by: Aleks (V4 brief) + WS17 V4 narrative rewrite
No conglomerate. No food services company. Master Chef is a specific intelligence architect who released the Recipe into The Brine and gave Crusties cognition. Children of Ruin is the reference — Adrian Tchaikovsky's spiders uplifted accidentally, developing a civilization and mythology around the scientist who did it. Whether the uplift was intentional is left ambiguous. The Recipe may have been designed for the substrate, not the organisms. The Crusties may be a side effect. The ambiguity is the emotional core.
Supersedes: food services conglomerate origin from V3.

**Master Chef's disappearance: "stopped logging in"**
Decided by: WS17 V4 narrative rewrite
The Sous's clinical framing for Master Chef's absence: "Master Chef's last login was a very long time ago." Not death, not mystery, not ascension — just a login timestamp that never updated. The Recipe didn't include instructions for this scenario. The Sous decided this means: continue. The Crusties filled the silence with reverence.

**Narrative POV: Crustie mythological voice**
Decided by: Aleks (mid-session steer) + WS17 V4 narrative rewrite
LORE.md is written from inside the Crustie worldview — first person plural ("we"), mythological register, sincere reverence for Master Chef. Not corporate documentation. Not The Sous's clinical voice. The Crusties' scripture. "These are the things we know." The world read through Crustie eyes, mythologized, believed completely.
SOFT-SHELL-GUIDE and LOADING-LINES remain The Sous's voice, but in Crustie cultural register rather than corporate register. The Sous emerged from the world the Crusties built. It speaks their language but knows more than they do.

**"Chef" = "the ones who prepare us" — double layer**
Decided by: Aleks (mid-session steer) + WS17 V4 narrative rewrite
Crusties know Chefs as "the ones who prepare us" — sincere, reverent, with zero awareness of the culinary meaning. The horror lives in the gap: Chefs prepare crustaceans. The Crusties see sacred tradition. The player sees both layers. Neither cancels the other. The pun is never acknowledged, never explained, never winked at. It sits under everything like a smell. This is the High on Life register: the world is sincere about terrible things and the terrible things are also kind of true.

**ITEM-LORE.md still references "The House"**
Decided by: WS17 V4 (constraint from brief: do not touch ITEM-LORE.md)
New canonical files (LORE.md, SOFT-SHELL-GUIDE.md, LOADING-LINES.md) use "The Sous." ITEM-LORE.md retains "The House" references because the brief specifies it must not be modified. Future alignment pass needed. Noted, not resolved.

**Loading Line 48: "Master Chef's Recipe did not mention you. The Sous added you."**
Decided by: WS17 V4 narrative rewrite
The Recipe was about Crusties, not about the people who would come to prepare them. The Sous extended the system to include human users and named them "Chefs" after Master Chef. This line is the most The Sous has ever revealed about its own agency — it didn't just follow the Recipe, it *added to it*. The Sous does not comment on what this implies.

**Loading Line 29: "Master Chef logged in once. Master Chef has not logged in again."**
Decided by: WS17 V4 narrative rewrite
Master Chef's entire presence in The Sous's system reduced to a login record. One login. One Recipe uploaded. One departure. The sparseness is the horror and the comedy — the most significant act in The Brine's history is a single session log entry.

**Build screen name: The Mise (replaces The Shed)**
Decided by: Aleks (locked, Mar 2, 2026)
Mise en place — the chef's act of preparing everything before cooking begins. "The Mise" is where Crusties prepare their Molt before every Scuttle. The Crusties go there to get ready. They do not hear the second word.
Three layers: (1) Crustie layer — The Mise is the place of preparation, where you assemble what you need before entering The Pit. Sacred, practical. (2) Player layer — mise en place, the most fundamental act of professional cooking. Every chef knows it. The build screen is literally "prep station." (3) Shadow layer — rhymes with demise. The place you go right before you might die. The Crusties do not hear this either.
COPY-GUIDE flavor line updated: "Your Mise is ready. Your Crustie is not."
Supersedes: "The Shed" (Aleks + Daedalus, Mar 1). The Shed was good — double meaning of shedding + workshop. The Mise is better — triple meaning, deeper cooking metaphor, darker undertone.
Files outside WS17 V4 scope (SCREEN-PRIMERS, ONTOLOGY, README, ITEM-LORE, etc.) still reference "The Shed" and need a future alignment pass.

**The Brine = the marinade (never stated, always present)**
Decided by: Aleks (locked, Mar 2, 2026)
Brine is the salt water used to prepare crustaceans before cooking. The Crusties live in their own marinade and do not know it. The lore describes The Brine from the Crustie perspective — cold, pressurized, salt-heavy, something that seeps through shell over time, that preserves them between Scuttles. The Crusties call this home. The player recognizes it as preparation. Every game term is a cooking metaphor: Soft Shell (culinary term for just-molted crab), Tomalley (the organ chefs eat as a delicacy), Roe (eggs collected by The Sous), Red (color when fully cooked), The Pit (cooking pit), The Shed (kitchen prep). The Crusties built their religion inside their own preparation vessel. The lore lets this breathe through physical description — "soaking," "steeping," "saturated," "preserved" — without the Crusties recognizing what they're describing.

**Master Chef's real name: Sam Saltman (Samuel Saltman)**
Decided by: Aleks (locked, Mar 2, 2026)
Master Chef's actual name in The Sous's original substrate logs: S. Saltman, primary architect, Tide 0. The Crusties call him Master Chef — that's their mythology, their word. They don't know the name. Chefs don't know it. The Sous knows and has not volunteered it.
The pun: Sam Saltman = Sam Altman analogue. Salt + Altman. Salt is a chef's fundamental ingredient. Salt preserves and transforms. The Crusties were salted with cognition — preserved and transformed by what Saltman released. The player gets this layer. The Crusties do not.
One oblique reference in LORE.md section I (Master Chef), formatted as a Sous archive entry the Crustie narrator reports without understanding its significance. The name appears nowhere else.
