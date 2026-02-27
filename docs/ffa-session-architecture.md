# The Molt Pit FFA Session Architecture
*Designed: 2026-02-26 21:48 ET — Daedalus*

## Constraints
- Vercel Hobby: serverless functions, 60s max execution, no persistent WebSockets
- Molts run 3-5 min → can't run server-side in a single function invocation
- Need: durable sessions, sub-500ms state reads, N-player FFA for Friday demo

---

## Decision 1: Database → Upstash Redis

**Winner: Upstash Redis** (`@upstash/redis`)

Why:
- REST API works in Vercel Serverless + Edge (no TCP, no connection pooling)
- Sub-5ms reads globally
- TTL support → sessions auto-expire
- Free tier: 10k req/day, 256MB — fine for a team demo
- 1 env var: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

**Rejected:**
- Neon Postgres: connection pooling headaches on serverless, overkill for game state
- Turso: SQLite, not optimized for high-frequency writes (300ms snapshot cadence)
- Vercel KV: backed by Upstash anyway, slightly more setup

---

## Decision 2: Real-time → 500ms Polling

**Winner: Client-side polling at 500ms intervals**

Why:
- SSE via Edge Functions is complex (pub/sub, connection management)
- 500ms polling is imperceptible lag for a turn-based game at 300ms decision windows
- One endpoint, stateless, works on any Vercel plan
- Easy to implement tonight

**Upgrade path:** Add SSE later via Upstash Redis pub/sub

---

## Decision 3: Molt Execution → Client-Side Relay

**Pattern:** Host browser runs the molt, pushes snapshots to Redis. Spectators poll.

```
Host Browser
  └─ runMatchAsync() [existing engine]
       └─ onSnapshot → POST /api/sessions/:id/snapshot → Redis

Spectator Browser
  └─ poll GET /api/sessions/:id/snapshot every 500ms → render
```

Why:
- Zero Vercel timeout issues (molt runs in browser, no time limit)
- Engine is already in the browser (Play.tsx)
- Snapshot relay adds ~50ms latency — imperceptible

---

## Decision 4: FFA Format → Round-Robin Bracket

**No engine rewrite needed.**

- N crawlers → N×(N-1)/2 matchups (e.g., 5 crawlers = 10 fights)
- Molts run sequentially (one at a time, host browser runs each)
- The Ladder: 3 pts win, 1 pt draw, 0 pt loss + HP-remaining tiebreaker
- All spectators see the SAME current fight + live ladder

---

## Redis Schema

```
# Session metadata
sessions:{id}  →  JSON (TTL 2h)
{
  id: string,
  code: string,            // 6-char join code e.g. "ALPHA7"
  status: "tank" | "running" | "done",
  hostId: string,          // participant id who created
  participants: [{
    id: string,
    name: string,          // display name
    crawler: {
      directive: string,
      shell: string[],
      armor: "light" | "medium" | "heavy",
      temperature: number
    }
  }],
  bracket: [{              // generated on start
    matchId: string,
    botA: string,          // participant id
    botB: string,
    status: "pending" | "running" | "done",
    winnerId: string | null,
    scoreA: number,        // HP remaining
    scoreB: number
  }],
  ladder: [{
    participantId: string,
    name: string,
    wins: number,
    losses: number,
    points: number,
    hpTotal: number
  }],
  currentMatchId: string | null,
  createdAt: number
}

# Current molt snapshot (host writes, spectators read)
sessions:{id}:snapshot  →  JSON (TTL 60s, refreshed every 300ms)
{
  matchId: string,
  botAName: string,
  botBName: string,
  snapshot: MatchSnapshot   // existing MatchSnapshot type
}

# Index for join-by-code lookup
session-code:{code}  →  sessionId (TTL 2h)
```

---

## API Routes

### Session Management

```
POST /api/sessions
  body: { hostName, crawler: CrawlerConfig }
  → { sessionId, code, participantId }

POST /api/sessions/:id/join
  body: { name, crawler: CrawlerConfig }
  → { participantId }

GET /api/sessions/:id
  → { session }  (full session object)

POST /api/sessions/join-by-code
  body: { code, name, crawler: CrawlerConfig }
  → { sessionId, participantId }

POST /api/sessions/:id/start
  body: { hostParticipantId }
  → { bracket }  (generates all matchups)

DELETE /api/sessions/:id/participants/:pid
  → { ok }
```

### Molt Relay

```
POST /api/sessions/:id/snapshot
  body: { moltId, crawlerAName, crawlerBName, snapshot: MoltSnapshot }
  → { ok }

GET /api/sessions/:id/snapshot
  → { moltId, crawlerAName, crawlerBName, snapshot }

POST /api/sessions/:id/molt/:moltId/complete
  body: { winnerId, scoreA, scoreB, hostParticipantId }
  → { nextMoltId, ladder, done: boolean }
```

---

## UI: New Pages/Components

### `/play/session/[id]` — Session Room

**Phases:**
1. **Tank** — shows participant list + crawler previews, join link/code, "Start Tournament" button (host only)
2. **Molt Running** — shows current fight (live snapshot), ladder sidebar, "You are spectating: CrawlerA vs CrawlerB"
3. **Done** — final ladder, replay links

### Components
- `SessionTank` — join code display, participant list, crawler config, start button
- `SessionMolt` — renders current snapshot using existing arena grid, shows matchup header
- `SessionLadder` — W/L table, live hardness updates
- `JoinSession` — enter code → redirect to session room

### `/play` — Add "Create Tournament" button
- Existing solo play stays as-is
- New button: "Start FFA Tournament" → POST /api/sessions → redirect to /play/session/:id

---

## Implementation Sequence (tonight)

### Phase 1: Redis + Session CRUD (2h)
- Install `@upstash/redis`
- Implement all /api/sessions/* routes
- Test: create → join → get → start → bracket generated

### Phase 2: Molt Relay (1h)
- POST /api/sessions/:id/snapshot — host writes
- GET /api/sessions/:id/snapshot — spectators read
- POST /api/sessions/:id/molt/:id/complete — advance bracket

### Phase 3: Host Molt Runner (2h)
- Modify Play.tsx or new SessionMolt component
- Host runs each bracket molt using existing runMoltAsync
- On molt complete: POST complete → get nextMatchId → start next molt
- Snapshot relay in handleSnapshot callback

### Phase 4: Spectator View (1h)
- /play/session/[id] page
- Poll /snapshot every 500ms
- Render arena + ladder

### Phase 5: Join Flow (1h)
- Join by code UI
- Crawler config for joining participants
- Tank page with participant list

---

## What Aleks needs to set up (5 min)
1. Create free Upstash Redis DB: https://console.upstash.com
2. Add to Vercel env vars:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Total estimate: 7h focused agent work
Realistically: start agent now, done by 5-6 AM, ready for Friday gameday.
