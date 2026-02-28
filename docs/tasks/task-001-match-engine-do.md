# TASK-001 — MoltEngine Durable Object

**Priority:** High (Phase 1 — unblocks Phase 2 plugin)  
**Depends on:** Cloudflare account + `wrangler login`  
**Owner:** Daedalus  
**Target:** Mar 7, 2026

---

## What

A Cloudflare Workers Durable Object that IS the game engine. One instance per live molt. Owns the tick clock, game state, claw queues, and WebSocket connections.

Deployed to `engine.themoltpit.com`.

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
│   ├── MoltEngine.ts            ← Durable Object class
│   ├── game/
│   │   ├── engine.ts            ← deterministic tick logic (port from molt-runner.ts)
│   │   ├── types.ts             ← GameState, Action, BotConfig
│   │   └── constants.ts         ← TICK_MS, MAX_QUEUE_DEPTH, etc.
│   └── auth.ts                  ← token validation
├── package.json
└── tsconfig.json
```

### MoltEngine DO (core logic)

```typescript
export class MoltEngine implements DurableObject {
  private state: DurableObjectState;
  private moltState: GameState | null = null;
  private queues: Map<string, Action[]> = new Map();  // crawlerId → pending claws
  private connections: Set<WebSocket> = new Set();
  private crawlerTokens: Map<string, string> = new Map(); // token → crawlerId

  // Called by alarm — this IS the tick
  async alarm() {
    if (!this.moltState || this.moltState.over) return;

    const actions: Record<string, Action> = {};
    for (const [crawlerId, queue] of this.queues) {
      actions[crawlerId] = queue.shift() ?? { type: 'NO_OP' };
    }

    this.moltState = advanceTick(this.moltState, actions);

    // Log tick to SQLite for replay
    await this.state.storage.put(
      `tick:${this.moltState.tick}`,
      JSON.stringify({ actions, state: this.moltState })
    );

    // Fan-out to all connections
    const payload = JSON.stringify({ type: 'tick', state: this.moltState });
    for (const ws of this.connections) {
      try { ws.send(payload); } catch { this.connections.delete(ws); }
    }

    if (!this.moltState.over) {
      await this.state.storage.setAlarm(Date.now() + TICK_MS);
    } else {
      await this.handleMoltComplete();
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade — crawler plugin or spectator
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Claw queue push from crawler plugin
    if (url.pathname.endsWith('/queue') && request.method === 'POST') {
      return this.handleQueuePush(request);
    }

    // Molt start (called from Vercel tank API)
    if (url.pathname.endsWith('/start') && request.method === 'POST') {
      return this.handleStart(request);
    }

    return new Response('Not found', { status: 404 });
  }
}
```

### wrangler.toml

```toml
name = "themoltpit-engine"
main = "src/index.ts"
compatibility_date = "2026-02-27"

[[durable_objects.bindings]]
name = "MATCH"
class_name = "MatchEngine"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MatchEngine"]

[routes]
pattern = "engine.themoltpit.com/*"
zone_name = "cogcage.com"
```

---

## Integration Points

### Vercel → DO (molt start)
When the tank's `/start` endpoint fires, it calls `engine.themoltpit.com/molt/{id}/start` instead of running the client-side engine:

```typescript
// web/src/pages/api/tank/[id]/start.ts — updated
const doUrl = `https://engine.themoltpit.com/molt/${moltId}/start`;
const res = await fetch(doUrl, {
  method: 'POST',
  body: JSON.stringify({ crawlerA, crawlerB, seed }),
  headers: { 'Authorization': `Bearer ${COGCAGE_ENGINE_SECRET}` }
});
```

### MoltView.tsx → DO (spectator)
Replace client-side engine with WebSocket subscription:

```typescript
// Instead of running molt-runner.ts
const ws = new WebSocket(`wss://engine.themoltpit.com/molt/${moltId}`);
ws.onmessage = (e) => {
  const { type, state } = JSON.parse(e.data);
  if (type === 'tick') setGameState(state);
};
```

### Plugin → DO (claw push)
```typescript
await fetch(`https://engine.themoltpit.com/molt/${moltId}/queue`, {
  method: 'POST',
  body: JSON.stringify({ crawlerId, action, tick }),
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
# engine.themoltpit.com → Workers route
```

---

## Success Criteria

1. `curl https://engine.themoltpit.com/health` → `{ ok: true }`
2. Two WebSocket clients connect to a molt DO
3. Alarm fires every 200ms — both clients receive tick events
4. Claw pushed to queue before tick → applied; pushed after tick → queued for next
5. Empty queue → NO_OP logged
6. Molt ends → `molt.complete` event fires → Vercel Workflow triggered
