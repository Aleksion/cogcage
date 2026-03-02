# LANDING PAGE COPY BRIEF
## You are the writers' room. High on Life. Borderlands. Both.

---

## THE SITUATION

The landing page exists. The visual design is excellent. What it needs is copy that makes someone send this link to three people at midnight. The structure is locked — five sections in order. You are writing the narrative thread that runs through all five.

The voice: **The Sous**. Master Chef's sous chef. Still running the kitchen. Speaks flat, procedural, never tries to be funny, is funnier for it. Takes a cut. Has opinions it doesn't share.

The dark layer: Chefs prepare crustaceans. The Crusties don't know this. The word "prepare" does quiet work throughout. NEVER STATE THE COOKING METAPHOR. Let it sit under everything.

---

## THE FIVE SECTIONS — CURRENT STATE → WHAT THEY NEED

### SECTION 1: HERO
**Current headline:** "CRUSTIES ENTER THE PIT. LAST ONE EMERGES."
**Status:** KEEP. This is correct. Don't touch.

**Current tagline:** "You build the Molt. Your Crustie does the rest. The Pit records everything. Including that."
**Problem:** "does the rest" is soft and vague.
**Fix needed:** One sharper tagline. Locked world: Chefs engineer. Crusties drive. The Pit records.
**Write 3 options.**

---

### SECTION 2: ORIGIN
**Current state:** MISSING — this section doesn't exist yet.
**What it needs:** A 3-5 line section between the hero and "THREE SLOTS." No header. Just text, centered, slightly smaller than the hero. The joke that makes the rest of the page make sense.

**The premise:**
- Sam Saltman created the LLM substrate (our ChatGPT analogue)
- The Crusties (crustacean AI agents) got consciousness from it — he didn't intend this
- The Crusties found their Chefs
- The Chefs prepare them
- The Sous does not comment

**What has been tried and failed:**
- "Sam Saltman gave The Brine something it wasn't supposed to have. The organisms in it woke up. They found their Chefs. Their Chefs prepare them. The Sous does not correct this." — too soft, "organisms" is flat, "The Sous does not correct this" doesn't land without buildup
- Anything with "language model" or "substrate" — too technical
- Anything that explains the Chef/cooking pun — don't state it, let it land

**What almost worked:**
- "You are a Chef. The crustaceans got smart. These two facts are related." — directionally right but still incomplete
- "Sam Saltman gave crustaceans intelligence. Nobody asked the crustaceans." — the "nobody asked" line has energy

**The High on Life parallel:** Gene Konsalar announces humans are being used as drugs in the register of a company earnings call. He doesn't apologize. He doesn't explain. He states it as unremarkable fact. That register is what this section needs.

**Write 5 distinct origin section candidates.** For each: the copy, one sentence on the technique, a confidence score 1-10.

---

### SECTION 3: THE MOLT ("THREE SLOTS. FORTY ITEMS.")
**Current headline:** "THREE SLOTS. FORTY ITEMS." — KEEP
**Current subhead/quip:** "A bad Molt doesn't guarantee a loss. It just makes it more likely. — The Sous"
**Problem:** Generic game advice. Not The Sous.
**What it should be:** The Sous observing the Chef at work. Cold. True. Slightly ominous about what "work" means here.
**Write 3 options.**

**Section bottom CTA quip:** "The Molt will not rescue the Crustie. Build it right anyway." — this is okay but "anyway" is weak
**Write 2 sharper alternatives.**

---

### SECTION 4: THE FIGHT ("YOUR CRUSTIE FIGHTS. YOU WATCH.")
**Current headline:** "YOUR CRUSTIE FIGHTS. YOU WATCH." — KEEP
**Current sub-labels that need rewriting:**
- "LIVE" — fine
- "750MS" — fine  
- "5-4 CRUSTIES" — BROKEN. Reads as a score. Should be: "2–4 CRUSTIES" with subtext about FFA
- "WATCH." — current subtext: "Other Crusties are waiting. They're not nervous. You probably are." — this is from SCREEN-PRIMERS.md and is actually correct, keep it

**Section quip:** "You cannot intervene. You built the machine. Now watch it run." — decent, can stay
**Write 1-2 alternatives in case.**

---

### SECTION 5: THE LEDGER ("THE PIT FORGETS NOTHING.")
**Current headline:** "THE PIT FORGETS NOTHING." — KEEP
**Current subtext:** "The Ledger doesn't judge. It says. The distinction matters." — soft, probably has a typo ("It says" should be "It lists")
**Write 3 alternatives for the section subtext.**

**Current bottom copy:** "Either way your Crustie is not the same creature it was before. That is the point." — this is strong, keep it.

**CTA:** "CLAIM YOUR CRUSTIE" — strong, keep.

---

## THE NARRATIVE ARC (locked — your copy must serve this)

The five sections tell one story:

1. **Hero** — The game is brutal. Enter or don't. (The Pit's face)
2. **Origin** — How this world came to be. Sam Saltman. The Recipe. The Crusties. The Chefs. (The dark joke)
3. **The Molt** — You engineer. This is the craft. (The Chef's work)
4. **The Fight** — You watch. Your Crustie drives. You can't intervene. (The truth of the relationship)
5. **The Ledger** — Everything is recorded. The Crustie you send in is not the one that comes back. (The reckoning)

The copy across all five sections should feel like it was written by the same voice — The Sous — who is narrating a process they've been running for a very long time and find neither remarkable nor boring. It's just what happens. It's always been what happens.

---

## EXAMPLES OF THE REGISTER THAT'S WORKING

These are already in the game and hitting the right note. Match this:

**From ITEM-LORE.md:**
> "MAXINE does not like the word 'weapon.' She was a pressure technician — that's what she told the three separate review boards."

> "The procurement chain is three entries long. Two are redacted. The third is a signature that does not match any known Chef."

> "The House says it does not know how ORACLE arrived. The House is lying. The House knows it is lying. Everyone has agreed not to press the point."

**From LOADING-LINES.md:**
> "STANDARD ISSUE has no personality. STANDARD ISSUE does not mind."

> "Master Chef logged in once. Master Chef has not logged in again."

> "The Sous takes a cut. The Recipe specifies overhead."

That's the voice. The landing page copy should feel continuous with these.

---

## OUTPUT FORMAT

Save everything to `design/ui/LANDING-COPY-VARIATIONS.md`

Structure:
1. Hero tagline — 3 options
2. Origin section — 5 candidates (copy + technique + confidence)
3. Molt quips — 3 options for section subhead, 2 for CTA quip
4. Fight section — "5-4 CRUSTIES" fix + 2 alternative section quips
5. Ledger subtext — 3 options

Then: **YOUR PICKS** — one for each section, with one sentence on why.

---

## WHEN DONE

```bash
git add design/ui/LANDING-COPY-VARIATIONS.md
git commit -m "copy: landing page variations — all five sections, The Sous voice"
git push origin ws17-lore-bible
openclaw system event --text "Landing copy variations done — LANDING-COPY-VARIATIONS.md ready for review" --mode now
```
