# TASK: WS2 FFA Multiplayer Lobby

## What to build
Password-protected multiplayer lobby where 3–6 players each configure their own bot,
then watch them fight FFA (round-robin bracket). One browser runs the matches, all others spectate.

Read `docs/ffa-session-architecture.md` — this is the canonical spec. Follow it exactly.

---

## Environment

Upstash Redis env vars are already set in Vercel:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

For local dev, create `web/.env.local` with those values (ask user if missing from `.env.local`).

---

## Step 1 — Install Redis client

```bash
cd web && npm install @upstash/redis
```

---

## Step 2 — Session API routes

Create these files (all with `export const prerender = false`):

### `web/src/pages/api/sessions/index.ts`
- `POST` — create session: body `{ hostName, bot, password? }` → `{ sessionId, code, participantId }`
- Use Upstash Redis. Store `sessions:{id}` with TTL 7200. Store `session-code:{code}` → id with TTL 7200.
- Generate 6-char join code (uppercase alphanum, no ambiguous chars).
- participantId = random 8-char string.

### `web/src/pages/api/sessions/[id].ts`
- `GET` — return full session object
- `DELETE` — delete session (host only)

### `web/src/pages/api/sessions/join-by-code.ts`
- `POST` — body `{ code, name, bot, password? }` → `{ sessionId, participantId }`
- Lookup `session-code:{code}`, load session, validate password if set, add participant, save.

### `web/src/pages/api/sessions/[id]/join.ts`
- `POST` — body `{ name, bot, password? }` → `{ participantId }`

### `web/src/pages/api/sessions/[id]/start.ts`
- `POST` — body `{ hostParticipantId }` → `{ bracket }`
- Generate round-robin bracket (N×(N-1)/2 matchups).
- Set session status → `running`, store bracket, set `currentMatchId` to first match.

### `web/src/pages/api/sessions/[id]/snapshot.ts`
- `POST` — body `{ matchId, botAName, botBName, snapshot }` → `{ ok }`
  Write `sessions:{id}:snapshot` with TTL 60.
- `GET` → return current snapshot

### `web/src/pages/api/sessions/[id]/match/[matchId]/complete.ts`
- `POST` — body `{ winnerId, scoreA, scoreB, hostParticipantId }`
- Mark match done, update leaderboard (3pts win, 0 loss), advance to next match.
- Returns `{ nextMatchId, leaderboard, done }`

---

## Step 3 — Session Room page

### `web/src/pages/play/session/[id].astro`
```astro
---
export const prerender = false;
---
<html>
  <head><title>CogCage — Session</title></head>
  <body>
    <SessionRoom client:only="react" sessionId={Astro.params.id} />
  </body>
</html>
```
Import `SessionRoom` from `../../components/SessionRoom.tsx`.

### `web/src/components/SessionRoom.tsx`

**State machine:** `lobby` → `match` → `done`

**Lobby phase:**
- Shows join code prominently (big Bangers font: "JOIN CODE: ALPHA7")
- Shows participant list with bot names
- Host sees "Start Tournament" button (disabled until ≥2 players)
- Non-host sees "Ready" status
- 2s polling of `GET /api/sessions/:id` to refresh participants
- Bot config panel (same `renderBotConfigPanel` approach from Play.tsx — copy or import it)

**Match phase:**
- Host browser: runs matches using `runMatchAsync` from `../lib/ws2/match-runner`
  - On each snapshot: `POST /api/sessions/:id/snapshot`
  - On match end: `POST /api/sessions/:id/match/:matchId/complete`
  - Then immediately starts next match
- All browsers: poll `GET /api/sessions/:id/snapshot` every 500ms, render arena
- Show current matchup header: "IRON VANGUARD vs NULL PROTOCOL — Match 3 of 10"
- Leaderboard sidebar (poll `GET /api/sessions/:id` every 2s)

**Done phase:**
- Final leaderboard
- "Play Again" button

Use the same CSS vars and Bangers/Kanit fonts as Play.tsx (copy the relevant globalStyles).
Import the PlayCanvas arena from `PlayCanvasScene` when available (same pattern as Play.tsx).

---

## Step 4 — Add FFA entry points to Play.tsx lobby

In the existing `phase === 'lobby'` section of `web/src/components/Play.tsx`,
add two buttons below the existing "Enter Arena" button:

```tsx
<button className="cta-btn" style={{ background: 'var(--c-cyan)', color: '#1A1A1A', marginTop: '0.5rem' }}
  onClick={handleCreateTournament}>
  🏆 Create FFA Tournament
</button>

<button className="action-btn secondary" style={{ marginTop: '0.5rem' }}
  onClick={() => setShowJoinCode(true)}>
  Join by Code
</button>
```

`handleCreateTournament`:
- POST `/api/sessions` with hostName (from botAConfig or prompt user) + botAConfig + optional password
- On success: `window.location.href = '/play/session/' + sessionId`

`handleJoinCode`:
- Show a small inline form: code input + name input + optional password + submit
- POST `/api/sessions/join-by-code`
- On success: redirect to `/play/session/:sessionId`

---

## Step 5 — Wire up & build

```bash
cd web && npm run build
```
Fix any TypeScript errors. The Upstash client instantiation must be inside the request handler
(not module level) for Edge/serverless compatibility.

---

## Done criteria
1. `POST /api/sessions` creates session in Upstash Redis, returns code
2. `POST /api/sessions/join-by-code` finds session by code, validates optional password
3. `/play/session/:id` renders lobby with participant list + join code
4. Host can start tournament → bracket generated
5. Host browser runs matches → POSTs snapshots → spectators poll + see the arena
6. Leaderboard updates after each match
7. `npm --prefix web run build` passes
8. Commit on branch `feat/ws2-ffa-lobby`
9. Push and open PR to main

## Notify when done
```bash
openclaw system event --text "Done: WS2 FFA lobby complete on feat/ws2-ffa-lobby — PR open" --mode now
```
