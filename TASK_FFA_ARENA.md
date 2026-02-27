# FFA Arena — N-Player Simultaneous Combat

## Context
The engine already supports N actors natively (`actors: Record<string, ActorState>`).
The FFA sessions branch has Phase 1 fully built (Redis, session CRUD, all API routes, join-by-code).
SessionRoom.tsx has the UI shell.

The only critical gap: `match-runner.ts` is hardcoded for exactly 2 bots (`botA`, `botB`).

## Goal
Make a real multi-player FFA work: N players (target: 5) each configure their own LLM bot,
join a session via code, host starts → all N bots fight simultaneously in one arena.
Last bot standing wins.

## Tasks (in order)

### 1. Generalize match-runner.ts

Current signature:
```ts
export async function runMatchAsync(
  botA: BotConfig,
  botB: BotConfig,
  options: RunMatchOptions
): Promise<MatchResult>
```

New signature:
```ts
export async function runMatchAsync(
  bots: BotConfig[],   // N bots, minimum 2
  options: RunMatchOptions
): Promise<MatchResult>
```

Changes needed:
- Build `actors` record from `bots` array (each bot gets a starting position, spread around the arena)
  - 2 bots: positions (1,4) and (6,3) — existing defaults
  - 3 bots: triangle spread — (1,4), (6,3), (4,1)
  - 4 bots: corners — (1,1), (6,1), (1,6), (6,6)
  - 5 bots: pentagon spread — (3,0), (6,2), (5,6), (1,6), (0,2)
  - N bots: evenly distribute on a circle inscribed in the 8x8 grid
- Each tick: `Promise.all(bots.map(bot => fetchDecision(snap, bot.id, otherIds, ...)))` 
- `fetchDecision` already takes `actorId` and `opponentId` — generalize to `enemyIds: string[]` (nearest enemy or first alive enemy)
- Win condition: already handled by engine (`alive.length === 1` or `alive.length === 0`)
- `MatchResult` should include `winnerId: string | null` and per-bot stats

### 2. Update fetchDecision for N-player awareness
Currently: `fetchDecision(snap, myId, opponentId, prompt, loadout, ...)`
Change: pass nearest alive enemy as the primary target (by grid distance)
The game state context sent to LLM should mention all visible actors, not just one opponent.
Check `web/src/pages/api/agent/decide.ts` — the formatGameState function should already handle this since it uses `snap.state.actors` (all actors). Verify and fix if needed.

### 3. Update SessionRoom.tsx for N actors
Currently hardcoded to show botA/botB HP bars.
Change to show N HP bars (one per participant, labeled with their bot name).
On the arena view: show N bot positions (already handled by PlayCanvas since it uses `snap.state.actors`).
The `runHostMatch` function needs to call the new `runMatchAsync(bots, options)` signature.
Build the `bots` array from the session's bracket match participants:
```ts
const match = session.bracket.find(m => m.id === session.currentMatchId);
// match has participantA and participantB (for bracket)
// For FFA: all participants fight at once — skip bracket, just use all session.participants
```

**FFA vs Bracket decision:**
- Current code generates a round-robin bracket (1v1 pairs)
- Aleks wants ALL players in ONE arena simultaneously
- Change: when host clicks "Start", ALL participants fight in one FFA match
- No bracket needed for MVP — just one match, N bots, last standing wins
- Keep bracket generation for future ranked mode

### 4. Entry point — wire /play to FFA sessions
In Play.tsx, the existing lobby phase has a "Multiplayer Rooms" toggle.
Add a prominent "Create Tournament" button that:
1. Takes the current bot config (just YOUR bot — botAConfig)
2. POSTs to `/api/sessions` to create a session
3. Redirects to `/play/session/[id]?participantId=xxx`

The join flow already exists via `/join/[code]` — verify it works and the code entry form is clear.

### 5. Verify build passes
```bash
npm --prefix web run build
```
Fix all TypeScript errors. Do not introduce `any` types.

### 6. Commit and push
```bash
git add -A
git commit -m "feat(ffa): N-player simultaneous arena — generalize match-runner + SessionRoom"
git push origin feat/ws2-ffa-sessions
```

Then open a PR to main.

## Key Files
- `web/src/lib/ws2/match-runner.ts` — generalize from 2 to N bots
- `web/src/pages/api/agent/decide.ts` — verify N-actor game state formatting
- `web/src/components/SessionRoom.tsx` — N HP bars, FFA match run
- `web/src/components/Play.tsx` — add "Create Tournament" CTA
- `web/src/lib/session.ts` — session CRUD (already built, may need minor tweaks)

## What NOT to change
- `web/src/lib/ws2/engine.ts` — already N-actor native, do not touch
- `web/src/lib/ws2/PlayCanvasScene.ts` — already renders N actors from snap.state.actors
- All API routes in `/api/sessions/` — Phase 1 already done

## Success criteria
1. `npm --prefix web run build` passes clean
2. Host goes to `/play`, configures bot, clicks "Create Tournament", gets a code
3. Others enter the code at `/join/[code]`, configure their bot, join
4. Host clicks "Start" → all bots enter the arena simultaneously
5. Match runs, LLM decisions fire for each bot each tick, HP bars show for all N bots
6. Game ends when 1 bot remains, winner shown

## When done
Run:
```bash
openclaw system event --text "Done: FFA N-player arena built — match-runner generalized, SessionRoom updated, PR ready. Build: PASS/FAIL" --mode now
```
