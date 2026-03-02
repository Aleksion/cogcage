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
The creature is a Crustie. The House uses it clinically. Pitmasters use it as affectionate slur.
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
