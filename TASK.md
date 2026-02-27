# FFA Session System — Build Task

Read `docs/ffa-session-architecture.md` for the full spec first.

## Credentials (already in web/.env.local)
UPSTASH_REDIS_REST_URL=https://dear-titmouse-61773.upstash.io
UPSTASH_REDIS_REST_TOKEN=AfFNAAIncDEzOGUxMDFlOGE1NzY0OTMyOWIyYWNiNTFkODkwNzJlZnAxNjE3NzM

## Phase 1: Upstash Redis + Session CRUD

### Step 1: Install package
cd web && npm install @upstash/redis

### Step 2: Create web/src/lib/redis.ts
Upstash client init. Read UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
Export a single `redis` instance.
Throw a clear error if env vars are missing.

### Step 3: Create web/src/lib/session.ts
All session helpers:
- createSession(hostName, bot) → {sessionId, code, participantId}
- joinSession(sessionId, name, bot) → {participantId}
- getSession(sessionId) → Session | null
- startSession(sessionId, hostParticipantId) → {bracket}
- generateBracket(participants) → BracketMatch[]
- completeMatch(sessionId, matchId, winnerId, scoreA, scoreB) → {nextMatchId, leaderboard, done}
- updateLeaderboard(session) → Leaderboard[]

Session type as defined in architecture doc.
Use redis.set with EX: 7200 (2h TTL).
Join code: 6 uppercase chars, store in key "session-code:CODE" → sessionId.

### Step 4: API routes

Create these files (use dynamic param names in square brackets for Astro):

a) web/src/pages/api/sessions/index.ts
   POST: create session → {sessionId, code, participantId}
   GET: not needed

b) web/src/pages/api/sessions/join-by-code.ts
   POST body: {code, name, bot} → {sessionId, participantId}

c) web/src/pages/api/sessions/[id].ts   (id = session id)
   GET: return session object

d) web/src/pages/api/sessions/[id]/join.ts
   POST body: {name, bot} → {participantId}

e) web/src/pages/api/sessions/[id]/start.ts
   POST body: {hostParticipantId} → {bracket}

f) web/src/pages/api/sessions/[id]/snapshot.ts
   GET: return current snapshot
   POST body: {matchId, botAName, botBName, snapshot} → {ok}
   Use key "session-snapshot:ID" with EX: 60

g) web/src/pages/api/sessions/[id]/complete.ts
   POST body: {matchId, winnerId, scoreA, scoreB, hostParticipantId} → {nextMatchId, leaderboard, done}

All routes: export const prerender = false

### Step 5: Verify Phase 1
npm --prefix web run build — must pass clean.

---

## Phase 2: Session Room UI

### Create web/src/pages/play/session/[id].astro
SSR page. Fetch session on server, pass to React component.
If session not found → redirect to /play.

### Create web/src/components/SessionRoom.tsx
React component. Props: {session, participantId}.

Three phases based on session.status:

#### Lobby phase (status = "lobby")
- Show session join code prominently (big, copyable)
- Show join URL: window.location.origin + "/join/" + code
- List of participants with their bot names
- Each participant can edit their bot: name, system prompt textarea, loadout checkboxes, armor radio
- Host sees "Start Tournament" button — POST /api/sessions/ID/start
- Poll /api/sessions/ID every 3s to update participant list

#### Match phase (status = "running")  
- Header: "Match X of Y: BotAName vs BotBName"
- Arena grid: render current snapshot (same CSS grid as Play.tsx, copy the renderArena logic)
- Leaderboard sidebar: rank, name, W/L/pts
- Host: runs current match via runMatchAsync, pushes snapshots via POST /api/sessions/ID/snapshot
  - On match end: POST /api/sessions/ID/complete → get nextMatchId
  - If nextMatchId: start next match
  - If done: session over
- Spectators: poll /api/sessions/ID/snapshot every 500ms, render arena

#### Done phase (status = "done")
- Final leaderboard
- "Play Again" button

### Create web/src/pages/join/[code].astro  
Page where people join a session by code.
Show bot config form (name, prompt, loadout, armor).
Submit → POST /api/sessions/join-by-code → redirect to /play/session/ID?pid=PARTICIPANT_ID

---

## Phase 3: Entry Points

### Modify web/src/components/Play.tsx
Add "Start FFA Tournament" button in lobby phase (next to "Start Battle").
onClick: POST /api/sessions with {hostName: botAConfig.name, bot: botAConfig} → redirect to /play/session/ID?pid=PARTICIPANT_ID

### Add nav link on landing page (optional, low priority)

---

## Build & Ship
After all phases:
npm --prefix web run build   ← must pass
git add -A
git commit -m "feat(ws2): FFA session system — Upstash Redis + round-robin bracket + live relay"
git push origin feat/ws2-ffa-sessions

Do NOT open a PR — just push the branch.
