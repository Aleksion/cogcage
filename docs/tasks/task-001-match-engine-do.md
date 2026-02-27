# TASK-001 — MatchEngine Durable Object

**Priority:** High (Phase 1 — unblocks Phase 2 plugin)  
**Depends on:** Cloudflare account + `wrangler login`  
**Owner:** Daedalus  
**Target:** Mar 7, 2026

---

## What

A Cloudflare Workers Durable Object that IS the game engine. One instance per live match. Owns the tick clock, game state, action queues, and WebSocket connections.

Deployed to `engine.cogcage.com`.

See full architecture rationale: `docs/architecture-game-engine.md`

---

## Why Cloudflare DO (not Vercel)

Vercel serverless functions are stateless and can't hold a tick loop. Cloudflare Durable Objects are the only serverless primitive with:
- **Alarm API** — sub-second scheduled callbacks (~10ms precision)  
- **In-memory state** — persists between requests within the same DO instance  
- **WebSocket Hibernation** — holds thousands of concurrent connections efficiently

---

## Implementation

### File structure
```
engine/                          ← new top-level dir in repo
├── wrangler.toml
├── src/
│   ├── index.ts                 ← Worker entrypoint (routes to DO)
│   ├── MatchEngine.ts           ← Durable Object class
│   ├── game/
│   │   ├── engine.ts            ← deterministic tick logic (port from match-runner.ts)
│   │   ├── types.ts             ← GameState, Action, BotConfig
│   │   └── constants.ts         ← TICK_MS, MAX_QUEUE_DEPTH, etc.
│   └── auth.ts                  ← token validation
├── package.json
└── tsconfig.json
```

### MatchEngine DO (core logic)

```typescript
export class MatchEngine implements DurableObject {
  private state: DurableObjectState;
  private matchState: GameState | null = null;
  private queues: Map<string, Action[]> = new Map();  // botId → pending actions
  private connections: Set<WebSocket> = new Set();
  private botTokens: Map<string, string> = new Map(); // token → botId

  // Called by alarm — this IS the tick
  async alarm() {
    if (!this.matchState || this.matchState.over) return;

    const actions: Record<string, Action> = {};
    for (const [botId, queue] of this.queues) {
      actions[botId] = queue.shift() ?? { type: 'NO_OP' };
    }

    this.matchState = advanceTick(this.matchState, actions);

    // Log tick to SQLite for replay
    await this.state.storage.put(
      `tick:${this.matchState.tick}`,
      JSON.stringify({ actions, state: this.matchState })
    );

    // Fan-out to all connections
    const payload = JSON.stringify({ type: 'tick', state: this.matchState });
    for (const ws of this.connections) {
      try { ws.send(payload); } catch { this.connections.delete(ws); }
    }

    if (!this.matchState.over) {
      await this.state.storage.setAlarm(Date.now() + TICK_MS);
    } else {
      await this.handleMatchComplete();
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade — agent plugin or spectator
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Action queue push from agent plugin
    if (url.pathname.endsWith('/queue') && request.method === 'POST') {
      return this.handleQueuePush(request);
    }

    // Match start (called from Vercel lobby API)
    if (url.pathname.endsWith('/start') && request.method === 'POST') {
      return this.handleStart(request);
    }

    return new Response('Not found', { status: 404 });
  }
}
```

### wrangler.toml

```toml
name = "cogcage-engine"
main = "src/index.ts"
compatibility_date = "2026-02-27"

[[durable_objects.bindings]]
name = "MATCH"
class_name = "MatchEngine"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatchEngine"]

[routes]
pattern = "engine.cogcage.com/*"
zone_name = "cogcage.com"
```

---

## Integration Points

### Vercel → DO (match start)
When the lobby's `/start` endpoint fires, it calls `engine.cogcage.com/match/{id}/start` instead of running the client-side engine:

```typescript
// web/src/pages/api/lobby/[id]/start.ts — updated
const doUrl = `https://engine.cogcage.com/match/${matchId}/start`;
const res = await fetch(doUrl, {
  method: 'POST',
  body: JSON.stringify({ botA, botB, seed }),
  headers: { 'Authorization': `Bearer ${COGCAGE_ENGINE_SECRET}` }
});
```

### MatchView.tsx → DO (spectator)
Replace client-side engine with WebSocket subscription:

```typescript
// Instead of running match-runner.ts
const ws = new WebSocket(`wss://engine.cogcage.com/match/${matchId}`);
ws.onmessage = (e) => {
  const { type, state } = JSON.parse(e.data);
  if (type === 'tick') setGameState(state);
};
```

### Plugin → DO (action push)
```typescript
await fetch(`https://engine.cogcage.com/match/${matchId}/queue`, {
  method: 'POST',
  body: JSON.stringify({ botId, action, tick }),
  headers: { 'Authorization': `Bearer ${playerToken}` }
});
```

---

## Deploy Steps

```bash
cd engine/
npm install
wrangler login  # Aleks does this once
wrangler deploy

# Add DNS record in Cloudflare dashboard:
# engine.cogcage.com → Workers route
```

---

## Success Criteria

1. `curl https://engine.cogcage.com/health` → `{ ok: true }`
2. Two WebSocket clients connect to a match DO
3. Alarm fires every 200ms — both clients receive tick events
4. Action pushed to queue before tick → applied; pushed after tick → queued for next
5. Empty queue → NO_OP logged
6. Match ends → `match.complete` event fires → Vercel Workflow triggered
