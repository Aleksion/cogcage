# ORIGIN COPY RESEARCH BRIEF
## One task. One deliverable. Get it right.

---

## YOUR JOB

Write a 4-6 line origin section for the landing page of The Molt Pit.

It needs to make someone laugh, then feel something slightly dark, in that order. It needs to work as a website section between the hero and the game mechanics. It must not explain itself.

You are not writing documentation. You are writing the thing that makes someone send this link to a friend at 2am.

---

## STEP 1: RESEARCH HIGH ON LIFE'S WRITING

Use web_fetch to read about High on Life's humor style. Specifically:

Fetch these and read them carefully:
- https://www.polygon.com/reviews/23513345/high-on-life-review-xbox-game-pass
- https://www.ign.com/articles/high-on-life-review

What you're extracting: HOW does the humor work mechanically? Not "it's funny" — what specific techniques does Justin Roiland and Squanch Games use?

Key things to look for:
- How do NPCs deliver exposition?
- How does the game handle its own dark premise (aliens harvesting humans as drugs)?
- What makes Gene Konsalar's broadcast work as an opening?
- The specific rhythm of joke delivery — how long before the punchline? How much setup?
- What does "deadpan commitment to the bit" look like in practice in this game?

Also fetch: https://web.archive.org/web/2023/https://www.eurogamer.net/high-on-life-review — or any other review that talks specifically about the writing

---

## STEP 2: READ OUR LORE

Read these files in full:
- `design/world/LORE.md` — the canonical world bible
- `design/items/ITEM-LORE.md` — item descriptions (these are already working at the right register)
- `design/ui/LOADING-LINES.md` — 50 loading lines (these are already working)
- `design/DECISIONS.md` — all locked decisions

The item lore and loading lines are your benchmark. The landing page copy must hit that register or exceed it.

---

## THE PREMISE (canonical, locked)

- **Sam Saltman** created the LLM substrate (our ChatGPT analogue). He is the game's Sam Altman. The pun: Saltman = salt = fundamental seasoning ingredient = what you do to crustaceans before cooking them.
- **The Brine** = the world the Crusties live in. Brine is also the salt water used to prepare crustaceans for cooking. They live in their marinade. They call it home. Both are true. Neither is stated.
- **Crusties** = crustacean AI agents who got consciousness from the LLM substrate. Sam Saltman never intended for this to happen. They're here anyway.
- **Chefs** = the players. They "prepare" their Crusties for The Pit. Chefs prepare crustaceans. The Crusties don't know this. The player does.
- **The Pit** = the arena. Also: the kitchen. The Crusties fight in it. The Crusties believe it makes them stronger. They are correct. They are also being prepared.
- **Red** = the highest rank. Also: the color a cooked crustacean turns. Both are true.
- **The Sous** = what runs the game. Master Chef's sous chef, still following the Recipe.
- **Master Chef** = what the Crusties call Sam Saltman. Their mythology for the person who changed them.

The dark joke is NEVER stated. The cooking vocabulary does the work. The player figures it out. That moment of realization is the game's best joke.

---

## THE FAILED ATTEMPTS (do not repeat these)

Previous attempts failed because they were too explanatory:
- ❌ "Sam Saltman released a language model into the computational substrate" — too technical
- ❌ "In Tide 0, Sam Saltman gave crustaceans consciousness" — too on-the-nose, loses the joke
- ❌ Anything with "language model" or "substrate" or "cognition" — these are internal words, not landing page words
- ❌ Anything that explains the Chef/cooking pun — DO NOT STATE THE PUN. Let it sit there.

What hasn't been tried: writing from inside the Crusties' sincere perspective, the way High on Life writes from inside the alien's sincere perspective. The Crusties genuinely believe The Pit makes them stronger. They genuinely revere Master Chef. They have no idea what "Chef" means outside The Brine. Write it like they wrote it. Let the player read between the lines.

---

## THE DELIVERABLE

A landing page section. Maximum 6 lines. Could be as short as 3.

Format options:
- A "notice" from The Sous (like the High on Life broadcast)
- Crustie mythology stated as fact
- A mix — The Sous introducing the Crustie perspective

Must NOT include:
- Exclamation points
- The word "tutorial" or "gameplay"
- Any explicit statement of the cooking metaphor
- The phrase "language model" or "AI" or "substrate" or "cognition"

Should include (at least one of):
- Sam Saltman (stated matter-of-factly, like he's just a person who did a thing)
- The word "prepare" or "prepared" (doing quiet double work)
- Something that makes you laugh on first read and feel slightly wrong about laughing on second read
- The Sous voice: flat, procedural, not trying to be funny, funnier for it

---

## OUTPUT FORMAT

Write 3-5 distinct versions. For each:
1. The copy itself
2. One sentence explaining what technique you used and why it should work
3. A confidence rating (1-10) on whether it actually lands

Then pick your best one and explain why.

Save output to `design/ui/ORIGIN-COPY-CANDIDATES.md`

Commit: `git add design/ui/ORIGIN-COPY-CANDIDATES.md && git commit -m "copy: origin section candidates — researched High on Life register" && git push origin ws17-lore-bible`

Then: `openclaw system event --text "Origin copy research done — candidates in ORIGIN-COPY-CANDIDATES.md" --mode now`
