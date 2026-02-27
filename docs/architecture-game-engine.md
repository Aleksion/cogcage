# CogCage — Game Engine Architecture Decision Record

*Written: 2026-02-27. Updated as we iterate. Source of truth for engine infra decisions.*

---

## The Core Constraint

The game engine must tick at a **fixed rate (150–300ms per tick)** regardless of agent think time.  
This is the immutable design principle. See `docs/core-thesis.md`.

This constraint rules out anything that runs inside a single HTTP request-response cycle.  
Vercel serverless functions are stateless and max out at ~60s. They cannot hold a tick loop.

---

## What We Need From Infra

For each live match:
1. **Persistent in-memory state** — HP, positions, queue depths, current tick
2. **Reliable clock** — fire every 150–300ms, don't drift
3. **Per-bot action queue** — push from agent, pop on tick
4. **Fan-out to spectators** — broadcast game state after each tick (SSE or WebSocket)
5. **Deterministic replay** — bit-for-bit reproducible from seed + action log

---

## Option A: Cloudflare Durable Objects (Recommended for Game Engine)

### What Are They
Cloudflare Workers are stateless compute at the edge. Durable Objects (DOs) are the exception:  
each DO is a single-instance worker with **colocated compute + storage** and a **globally unique ID**.  
Every request to `match-abc123` routes to the same physical instance, anywhere in the world.

### Why They're Perfect For This

| Need | Durable Object Capability |
|---|---|
| Persistent match state | In-memory state survives between requests; SQLite storage for durable writes |
| Tick loop | **Alarm API** — schedule `this.storage.setAlarm(Date.now() + 250)` on each tick; fires reliably |
| Action queue per bot | In-memory `Map<botId, Action[]>` — no Redis round-trip |
| WebSocket to agents + spectators | **WebSocket Hibernation API** — DO manages all connections, fans out on each tick |
| Globally unique per match | `env.MATCH.get(env.MATCH.idFromName(matchId))` — guaranteed single instance |
| Replay log | Append to SQLite on each tick — queryable after match ends |

### The Tick Loop (Alarm API)

```typescript
export class MatchEngine implements DurableObject {
  private state: DurableObjectState;
  private matchState: GameState | null = null;

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(req); // agent plugin or spectator connects
    }
    // handle queue push, match start, etc.
  }

  async alarm() {
    if (!this.matchState) return;
    
    // 1. Pop next action from each bot's queue (or NO_OP if empty)
    // 2. Advance game state one tick
    // 3. Broadcast new state to all WebSocket connections
    // 4. Log tick to SQLite (replay)
    // 5. Schedule next alarm (unless match is over)
    
    const actions = this.popQueues();
    this.matchState = advanceTick(this.matchState, actions);
    this.broadcast(this.matchState);
    await this.state.storage.put(`tick:${this.matchState.tick}`, JSON.stringify(actions));
    
    if (!this.matchState.over) {
      await this.state.storage.setAlarm(Date.now() + TICK_MS);
    }
  }

  async handleQueuePush(botId: string, action: Action) {
    // Agent plugin calls POST /match/:id/queue
    // Routes to this DO → pushed to in-memory queue
    this.queues.get(botId)?.push(action);
  }
}
```

### The Agent Plugin Flow (OpenClaw)

```
OpenClaw Plugin (background service)
  │
  ├── WebSocket connect to DO: wss://engine.cogcage.com/match/:id
  │
  └── On each tick event received:
        ├── Extract game state from event
        ├── Start LLM call (streaming, max_tokens=30)
        ├── Parse first complete JSON token
        ├── POST /match/:id/queue { action, botId }  ← fire immediately, don't wait
        └── Already reasoning about next tick
```

### Deploy Model
- **Cloudflare Workers** handles: match engine, WebSocket connections, action queues, SSE stream, replay storage
- **Vercel** handles: front-end, landing page, armory, lobby, waitlist (stays as-is)
- **DNS split**: `engine.cogcage.com` → Cloudflare Workers; `www.cogcage.com` → Vercel

### Costs
- Durable Objects: $0.20/million requests + $0.20/GB-month storage (SQLite)
- Alarm calls: essentially free at match scale
- Free tier covers ~10M requests/month

### Migration Path
1. Write `MatchEngine` DO class (TypeScript, Workers SDK)
2. Deploy to `engine.cogcage.com` via `wrangler deploy`
3. Update `Lobby.tsx` `handleStartMatch` to proxy through new endpoint
4. Update `MatchView.tsx` to consume WebSocket from DO instead of running engine client-side
5. Remove `match-runner.ts` (client-side sim) — DO owns all state
6. Vercel functions stay for lobby/armory/auth

---

## Option B: Stay on Vercel — Upstash QStash + Redis

If we don't want to introduce Cloudflare:

### How It Works
- **QStash** is a serverless message queue from Upstash — schedules HTTP calls
- Each tick: QStash POSTs to `/api/match/[id]/tick` Vercel function
- That function: reads state from Redis, pops queues, advances state, writes back, sends SSE
- Agent actions: `POST /api/match/[id]/queue` → `RPUSH` to Redis list
- Spectators: SSE via `/api/match/[id]/stream` — each request polls Redis on a 100ms interval

### Trade-offs vs Durable Objects

| | QStash + Redis | Durable Objects |
|---|---|---|
| Tick reliability | QStash minimum interval: ~500ms | Alarm API: ~10ms precision |
| Latency per tick | Redis round-trip (~10ms) | In-memory (~0ms) |
| Infra complexity | Redis + QStash (both Upstash — already have account) | New Cloudflare account + wrangler |
| WebSocket support | No — SSE polling only | Full WebSocket (hibernation API) |
| Replay | Redis sorted set per tick | SQLite built into DO |
| Cold start | Vercel function cold starts possible | DO stays warm during match |
| Cost at scale | ~$3/10M requests (Upstash) | ~$0.20/10M (Cloudflare) |

### Why QStash Is a Short-Term Solution, Not Long-Term
- 500ms minimum tick interval is too slow — core thesis requires 150–300ms
- No WebSocket means SSE with client polling — agent plugin can't hold persistent connection
- Every tick is a cold Vercel function with Redis reads/writes — latency creep at scale

---

## Option C: Electric SQL / Durable Streams

Aleks flagged [Electric's Durable Transport](https://electric-sql.com/docs/integrations/vercel#durable-transport-for-ai) for Vercel AI SDK.

### What It Actually Does
Electric Durable Streams make AI **token streams resumable**. If a network connection drops mid-stream, the client reconnects and picks up from the last token received — no restart required.

```typescript
import { durableTransport } from '@electric-sql/durable-streams';

const result = await streamText({
  model: openai('gpt-4'),
  prompt: '...',
  experimental_transport: durableTransport({ streamId: 'agent-decide-abc' }),
});
```

### Where It Fits in CogCage
**Not** for the tick loop or game state sync. Best applied to:
1. **Agent decision streaming** — the LLM decision call from the OpenClaw plugin. If mobile agent loses connection mid-token, Electric resumes from last position. Reduces NO_OPs from dropped connections.
2. **Replay streaming** — streaming a full match replay over a flaky connection.
3. **Match result narration** — streaming post-match commentary or analysis.

### Integration Plan
- Add `@electric-sql/durable-streams` to the agent plugin's SKILL.md
- Wrap the `/api/agent/decide` stream with `durableTransport`
- Spec out the streamId as `agent-{matchId}-{botId}-{tick}` for exact resumption

---

## Decision: Recommended Architecture

```
                    ┌─────────────────────────────┐
                    │         Vercel               │
                    │  - cogcage.com (landing)      │
                    │  - /play (dashboard/lobby)    │
                    │  - /armory                    │
                    │  - /api/lobby/*               │
                    │  - /api/armory/*              │
                    │  - /api/waitlist              │
                    │  - Redis (Upstash) for above  │
                    └──────────────┬──────────────┘
                                   │  match start
                                   ▼
                    ┌─────────────────────────────┐
                    │   Cloudflare Workers DO       │
                    │   engine.cogcage.com          │
                    │                               │
                    │  MatchEngine DO (per match)   │
                    │  - Alarm API tick loop        │
                    │  - Action queues (in-memory)  │
                    │  - WebSocket fan-out          │
                    │  - SQLite replay log          │
                    └──────────────┬──────────────┘
                                   │  WebSocket
                        ┌──────────┴──────────┐
                        ▼                     ▼
              OpenClaw Plugin           MatchView.tsx
              (agent loop)              (spectator)
              LLM → queue push          renders state each tick
              
                                   │  Electric Durable Streams
                                   ▼  (wraps LLM calls in plugin)
                              Resilient token stream
                              (resumable on mobile)
```

### Phase 1 (now → gameday): Fix & Demo
- ✅ Redis `process.env` fix (done — `c62220d`)
- Get lobby start → match flow working with current client-side engine
- Demo is client-side only — acceptable for Friday

### Phase 2 (next week): Cloudflare DO Engine
- Build `MatchEngine` Durable Object
- Deploy to `engine.cogcage.com`
- Update Lobby → match start to route to DO
- MatchView subscribes to DO WebSocket

### Phase 3: OpenClaw Plugin + Electric
- Write `@cogcage/openclaw-plugin` SKILL.md
- Wrap decision stream in Electric Durable Transport
- Publish to ClawHub

---

## Open Questions (need Aleks input)

1. **Cloudflare account** — do we have one? `wrangler login` needed to deploy DO.
2. **`engine.cogcage.com` subdomain** — needs DNS record pointing to Cloudflare Workers.
3. **Tick rate** — 150ms, 200ms, or 250ms? Faster = more skill expression, higher LLM spend.
4. **Queue depth cap** — how many prefetched actions should the engine accept? Recommend 3–5.
5. **Replay granularity** — log every tick (high detail, higher storage) or keyframes only?

---

*Updated: 2026-02-27. Next update: after Phase 2 scoping.*
