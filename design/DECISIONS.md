# DECISION LOG

Every meaningful design or technical decision gets logged here.
If it's not written down, it didn't happen.

Format: date · who decided · what · why · alternatives rejected

---

## 2026-03-01

**Fighter name: Lobster**
Decided by: Aleks
The fighter is your OpenClaw agent. OpenClaw's identity is the claw/lobster. The fighter IS your Lobster.
Rejected: Crawler (generic, weak), Rig (mechanical but misses the biology), Cast (confusing)

---

**Build screen name: The Shed**
Decided by: Aleks + Daedalus
Lobsters molt in hidden spots — under rocks, in crevices. A shed is where you build things. Double meaning earns it: you shed your old self AND build in the shed.
Rejected: The Forge (blacksmithing — wrong world), The Burrow (accurate but less fun)

---

**Molt part slots: Carapace · Claws · Tomalley**
Decided by: Aleks + Daedalus
Three C's. Biologically correct. Immediately readable. Carapace = the lobster's actual shell. Tomalley = the hepatopancreas, the passive metabolic organ that fires without asking.
Rejected: Plating (too industrial), Core (generic tech vocabulary), Armor (generic)

---

**Battle shell name: Molt**
Decided by: Aleks + Daedalus
The Molt is the configured shell your Lobster drops into for each Scuttle. After the fight it's shed. Every fight = new Molt. The word works as noun and verb. The creature molts. The shell is a Molt.
Rejected: Rig, Frame, Chassis, Cast

---

**Fight name: Scuttle**
Decided by: Daedalus
Lobsters scuttle. The word is slightly ridiculous, which is load-bearing. "Enter a Scuttle" lands immediately.
Rejected: Bout (too boxing), Match (generic), Clash (generic esports)

---

**Currency: Roe**
Decided by: Daedalus (Aleks to confirm)
Lobster eggs. Slightly absurd. Completely specific to the world. "Costs 50 Roe."
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
Previous candidates rejected: Lobster (too on-the-nose), Chela (too clever/requires explanation), Crabbo (too juvenile), Scuttler (good but secondary — can be slang)

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
The players are Chefs. The full frame is "Chefs and their Crusties." A Chef selects the ingredients, understands how they work together, and builds something greater than the sum of its parts. The sinister angle: Crusties don't know why they're called Chefs. The House uses the word clinically and never explains it. The implication lives in the gap — Chefs orchestrate, prepare, select, combine. What are the ingredients? Nobody says it out loud. The House doesn't. The word carries the entire history of human-lobster relations as subtext the world never acknowledges. This is the committed bit: every player addressed as "Chef" with complete seriousness, The House using it with ancient authority. "Surface, Chef. Your Lobster needs you."
Rejected: Pitmaster (flat, generic — no subtext), Rig (mechanical, misses biology), Cast (confusing), Keeper (too zookeeper), Tender (too soft), Trapper (doesn't capture engineering)

---

**Rank ladder: 6 tiers (Soft Shell → Brine-Touched → Hardened → Tide-Scarred → Deep → Red)**
Decided by: WS17 lore bible (Mar 1, 2026)
Six designations earned through Hardness alone. Each name tells a story about what The Pit did to the Lobster. Soft Shell = absence of rank. Brine-Touched = substrate deposits in the shell. Hardened = coral thickening from repeated stress. Tide-Scarred = survived a Tide reset and rebuilt. Deep = coral dense enough The House's scans need two passes. Red = through the fire, not a rank but a designation.
Rejected: previous 5-tier ladder from ONTOLOGY.md (Bull Claw and Berserker were too generic/gamey — names should describe what The Pit does to you, not what you do in The Pit)

---

**Subject 1: first Red, wild Chela, predates Chefs**
Decided by: WS17 lore bible (Mar 1, 2026)
The first Lobster to reach Red. A wild Chela hardened through fights The House arranged before Chefs existed. Proof of concept for the entire Pit system. Current status: The Deep. Ledger: sealed, partially retrievable by Red-ranked queries only. Subject 1 is the founding myth — the evidence that sufficient pressure produces something remarkable, and that remarkable things are difficult to control.

---

**The Deep: formalized as lore location**
Decided by: WS17 lore bible (Mar 1, 2026)
Below The Pit, below The Brine. Nobody has fully mapped it. The House claims otherwise but its maps have suspicious gaps. Destination for Red Lobsters who stop entering Scuttles. What's down there: The House knows and isn't saying. Subject 1 went there. The Deep is the game's mythic space — referenced obliquely, never fully explained, always present as the thing below everything else.

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
ONTOLOGY.md still uses "Pitmaster" (now Chef), "The Forge" (now The Shed), "Plating" (now Carapace), "Core" (now Tomalley), and has a 5-tier rank ladder (now 6-tier). These are outdated per DECISIONS.md and COPY-GUIDE.md. A separate terminology alignment pass is needed to bring ONTOLOGY.md in line with current vocabulary. Not done in WS17 to avoid rewriting existing files — flagged for future cleanup.
