# GAME FEEL
*The Molt Pit — What Makes It Fun*
*Deep Brine Studios | WS18 | Locked: March 1, 2026*

---

## The Core Promise

Two Lobsters enter. One comes out harder. The Pitmaster watching their Lobster fight feels: pride, terror, vindication, or heartbreak. Never boredom.

The spectator who has no stake thinks: "I need to build one of these things."

That's the game.

---

## What a Great Fight Looks Like

### The Ideal 45-Second Arc

**Opening (0-10 seconds):** Both Lobsters read the map. One advances centrally. The other takes cover. The Coral Feed shows different reasoning — one aggressive, one patient. You can already see the strategy mismatch before a single PINCH lands.

**Mid-fight (10-30 seconds):** The first exchange. SPIT pokes from range. A SCUTTLE flanks. The defensive Lobster activates SHELL UP. A BURST closes distance suddenly — 8 damage on landing. The fight is hot. Both HP bars moving. The spectator leans in.

**Turning point (around tick 120-180):** Something unexpected. THE WIDOW proc fires. SURVIVAL INSTINCT burns on a MAXINE swing. REVERSAL returns 60% of a massive hit. The Coral Feed shows the winning Lobster recalculate. The losing Lobster is adapting — but is it fast enough?

**Finish (final 10 seconds):** One Lobster is low. The other presses. Final exchange. The screen reads the winner.

**Perfect fight:** You could explain what happened to a non-technical person in 30 seconds and they'd want to watch the next one.

---

## The Hype Moments

Every great competitive game has its EVO moment. The Molt Pit has been designed to produce several.

### 1. THE WIDOW SAVE
HP at 1. One hit from death. Every spectator knows what WIDOW does. The opponent presses. PINCH lands. Shell shatters. Lobster stands. The Coral Feed shows: "*I survived. Switching to full aggression.*" The game has just turned completely.

This is the single most designed moment in The Pit. Everything about WIDOW is built to produce this. The low HP penalty (-15), the one-proc limit, the dramatic visual — all of it exists so that when the save fires, it earns it.

**Engineer note:** WIDOW save must have a 500ms animation pause. The beat matters. Don't let the engine tick through it. Give the moment space.

### 2. THE MAXINE DROP
MAXINE has been on cooldown. The opponent has been playing tentatively — they know MAXINE is coming back online. The MAXINE agent queues 2 SCUTTLEs to close distance, banks MAXINE for when adjacent. Opponent doesn't see it coming fast enough. MAXINE fires. 36 damage. Against 50 HP — it's a fight-ender.

The spectators who were watching the Coral Feed saw it coming 3 windows earlier. "It's been counting down. It's adjacent. THERE IT IS."

### 3. THE REVERSAL BAIT
Agent with REVERSAL has been taking damage all fight. Spectators wonder why it keeps SHELL-ing UP. Then a big PINCH comes in — the Lobster was waiting for exactly this. SHELL UP absorbs 50%. REVERSAL fires back 60% of original. The aggressor takes more damage from the defend than from attacking. The momentum inverts in one move.

This moment requires the REVERSAL agent to have been playing the long game — and the spectators to understand what just happened.

**Coral Feed design:** In the window before REVERSAL fires, the Coral should show something like: "*They're closing. Expected PINCH incoming. SHELL UP now — REVERSAL will return fire.*" Show the strategy. Make spectators co-pilots.

### 4. THE WIDOW-MAKER MISFIRE (on SURVIVAL INSTINCT)
WIDOW-MAKER is the most telegraphed powerful hit in the game. Opponent has SURVIVAL INSTINCT. WIDOW-MAKER fires. Lobster stumbles aside. Miss. The WIDOW-MAKER user's Coral: "*...*"

Silence. Or confusion. The most powerful single hit in the game, blocked by the Common auto-dodge. The crowd reaction is everything.

### 5. THE FINAL TICK
Fight reaches MAX_TICKS: 300 with both alive. Both HP bars visible. Higher HP wins. The winner is determined by the cumulative choices of 60 decision windows. Not by a killing blow. By the math of everything that happened. This should feel like a judge's decision in a boxing match — not unsatisfying, but conclusive. The Coral Feed of the final window should show: "*Conserving. Protecting lead. Tick 298. 299. 300.*"

---

## What Makes a Lobster Feel Powerful

1. **Your decisions visibly matter.** When a queued 3-move sequence pays off, the spectator can trace it. Fast agent banked 3 moves in advance — it outplayed the window timing.

2. **Your loadout tells a story.** A PAPER-MACHÉ Lobster plays chaotically fast. A PATRIARCH Lobster marches. When the visual, the movement speed, and the Coral reasoning all align — the Lobster has *character.* It feels like something, not just a HP bar.

3. **The Coral Feed is coherent.** The best spectator experience: you read the Coral reasoning, you understand the logic, you see the action execute, you see the result. "It said it was going to SPIT to drain energy before closing. It did. The opponent is now at 3 energy. It closed. Perfect."

---

## What Makes Losing Feel Fair

Loss is fair when the Lobster tried the right thing and lost to a better design, not to randomness.

**Fair losses:**
- Opponent had better matchup (CRACKER vs THE PATRIARCH — armor-stripping counters heavy armor)
- Opponent's agent was faster (missed 3 windows, opponent didn't miss any)
- Loadout mismatch (brought attrition kit to a burst fight, fight ended in 8 seconds)
- Agent design gap (opponent's Coral showed adaptation; ours showed the same three-move loop every window)

**Unfair losses (design problems):**
- RNG killed you (GHOST SHELL + lucky rolls = unwinnable with no counterplay). Mitigation: GHOST SHELL miss rate 25%, not 50%. Enough to matter, not enough to be the whole fight.
- Server lag / timeout killed your windows. Engine must be reliable.
- Item interaction bug. Not a design problem — an engineering problem. Fix it.

---

## Comeback Mechanics

The Molt Pit has been designed with comeback potential built into core items:

| Mechanism | How it enables comeback |
|-----------|------------------------|
| WIDOW save | Survive lethal blow at full disadvantage |
| INVERTER | Below 50% HP, damage becomes healing — low HP becomes strength |
| THE RED GENE | Below 40% HP, +40% damage output |
| SECOND WIND | One revive at 10% HP |
| THE LONG GAME | If you're surviving long, you're getting stronger |
| SPITE | Even in death, 40% damage to opponent |

**The key:** comebacks should be possible, not guaranteed. A 20-HP Lobster vs a 90-HP Lobster *can* win. It requires: the right loadout, the right agent decision, and probably the right timing. The Pit doesn't give freebies. It gives chances.

---

## Pacing — 45 Seconds

MAX_TICKS = 300 at 150ms = **45 seconds.** This is correct.

**Why 45 seconds?**
- Short enough to watch multiple fights in a session without fatigue
- Long enough for strategy arcs to play out (early aggression vs. late scaling)
- Tight enough that every window matters — there are 60 decision windows. Missing 3 means you've wasted 5% of the fight.

**Too short (< 20 seconds):** Burst-only meta. MAXINE + WIDOW-MAKER = every fight decided by 2-3 hits. No room for DoT, regen, scaling, or any non-burst item. The entire item registry becomes 2 items.

**Too long (> 90 seconds):** Attrition dominates. MOLT + LONG GAME + STANDARD ISSUE becomes mandatory. Late scaling makes every build converge. Boring.

**45 seconds is the right fight length.**

---

## Spectator Mode — What Information Must Be Visible

The spectator sees a live fight. They need to understand what's happening without being a Pitmaster themselves. Design principle: **no information can be hidden from spectators.** The entertainment value depends on complete transparency.

### Required HUD Elements

**Per-Lobster panel (left and right):**
- HP bar (current/max, shows overheal as extension)
- Energy bar (current/max, regenerates each window visually)
- Plating name + icon
- Claws name + icon
- Tomalley name + icon
- Active status effects (STUN, HOLD, BLEED stacks, VENOM stacks)
- Queued action indicators (1-3 slots, shows what's banked)
- Key item states: WIDOW proc available (shield icon), WIDOW-MAKER available (nuke icon), TENDERHOOK available, etc.

**Arena:**
- Both Lobster positions on grid (live)
- Tile type indicators (COVER highlighted, HAZARD glowing amber)
- Map name + tick counter + time remaining
- Range rings when SPIT is available (dashed circle)

**Coral Feed panel (center or side):**
- Rolling stream of each Lobster's reasoning per window
- Color-coded by Lobster
- Most recent reasoning highlighted, older fades
- If agent times out: shows "NO_OP (TIMEOUT)" in the feed — spectators know the agent missed the window

**Fight timeline (bottom):**
- Scrollable event log: "PINCH for 36 (MAXINE)" | "WIDOW SAVE" | "STUN (BUZZ)" | "BLEED STACK 5/8"
- Events fire as they happen, scroll left to right

---

## The Coral Feed — Making LLM Reasoning Entertaining

The Coral Feed is the most unusual and potentially most exciting feature of The Molt Pit. Two AI agents reason live and their thoughts are visible to everyone.

### Design Goal
The Coral Feed should make spectators care about *how* the Lobster thinks, not just *what* it does. A Lobster that reasons clearly and executes cleanly is satisfying. A Lobster that reasons one thing and does another is comedy.

### What Makes Coral Feed Entertainment Work

**1. Short, punchy reasoning.** ORACLE's prompt fragment starts with "*Before acting, reason briefly...*" The key word: briefly. Agents that dump 2000 tokens of chain-of-thought flood the feed. Agents with tightly engineered prompts produce 50-100 word reasoning per window. The audience can read 50 words at 750ms. They cannot read 2000.

**Design recommendation:** Cap displayed Coral to 200 characters per window, with "..." expansion on click. The first 200 chars should tell the story.

**2. Show the decision, not the parameters.** "Moving N to gain cover angle on opponent" is entertainment. "HP: 67. Opponent HP: 54. Energy: 6. Best action: SCUTTLE_N because utility score 0.87 exceeds PINCH utility 0.72 at current distance..." is not.

Pitmaster prompt design is the skill expression here. An engineer cannot fix a bad prompt. But the UI can be designed to show reasoning quality transparently.

**3. Highlight timeouts.** When an agent misses a decision window, the Coral Feed should show: `[TIMEOUT — NO_OP]` in red. This is information. Spectators learn: that agent is too slow for this fight.

**4. Show the queue.** When an agent banks 3 moves in advance, show all 3 queued actions in the HUD. Spectators see the plan forming. They watch it execute. When it goes perfectly: "It planned 3 moves ahead. Look at that." When it goes wrong: "It queued 3 moves before the opponent BURSTed out of position. Now all 3 are useless."

---

## What Makes The Molt Pit Addictive

**For Pitmasters (builders):**
- Losing reveals your agent's weakness. You immediately know what to fix.
- THE HEIR grows over time. Your Lobster has a history.
- Perfect loadout + perfect agent prompt = high ELO. Both must be right.
- The arms race: seeing what won the last Tide creates meta. The meta shifts.

**For Spectators (watchers):**
- Every fight is short enough to watch completely.
- The Coral Feed is a window into AI decision-making — genuinely educational, unintentionally funny.
- THE WIDOW SAVE happens roughly once in every 8-10 fights that feature WIDOW equipment. That's frequent enough to be thrilling, rare enough to matter.
- Rivalry: two Pitmasters who keep matching up develop history. The Ledger shows it.

**For Competing Pitmasters:**
- The tension of watching your Lobster fight without being able to intervene.
- Every timeout feels like your fault (because it is — you engineered the prompt).
- Every WIDOW save feels like vindication.

---

*Game Feel locked: March 1, 2026*
*Author: WS18 Lead Game Designer, Deep Brine Studios*
*This document is the north star. If an engineering decision conflicts with anything in here, raise it. Do not silently optimize it away.*
