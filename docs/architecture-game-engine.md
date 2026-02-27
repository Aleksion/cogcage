# The Molt Pit — Game Engine Architecture Decision Record

*Written: 2026-02-27. Updated as we iterate. Source of truth for engine infra decisions.*

---

## The Core Constraint

The game engine must tick at a **fixed rate (150–300ms per tick)** regardless of crawler think time.  
This is the immutable design principle. See `docs/core-thesis.md`.

This constraint rules out anything that runs inside a single HTTP request-response cycle.  
Vercel serverless functions are stateless and max out at ~60s. They cannot hold a tick loop.

---

## What We Need From Infra

For each live molt:
1. **Persistent in-memory state** — HP, positions, queue depths, current tick
2. **Reliable clock** — fire every 150–300ms, don't drift
3. **Per-crawler claw queue** — push from crawler, pop on tick
4. **Fan-out to spectators** — broadcast game state after each tick (SSE or WebSocket)
5. **Deterministic replay** — bit-for-bit reproducible from seed + action log

---

## Option A: Cloudflare Durable Objects (Recommended for Game Engine)

### What Are They
Cloudflare Workers are stateless compute at the edge. Durable Objects (DOs) are the exception:  
each DO is a single-instance worker with **colocated compute + storage** and a **globally unique ID**.  
Every request to `molt-abc123` routes to the same physical instance, anywhere in the world.

### Why They're Perfect For This

| Need | Durable Object Capability |
|---|---|
| Persistent molt state | In-memory state survives between requests; SQLite storage for durable writes |
| Tick loop | **Alarm API** — schedule `this.storage.setAlarm(Date.now() + 250)` on each tick; fires reliably |
| Claw queue per crawler | In-memory `Map<crawlerId, Action[]>` — no Redis round-trip |
| WebSocket to crawlers + spectators | **WebSocket Hibernation API** — DO manages all connections, fans out on each tick |
| Globally unique per molt | `env.MOLT.get(env.MOLT.idFromName(moltId))` — guaranteed single instance |
| Replay log | Append to SQLite on each tick — queryable after molt ends |

### The Tick Loop (Alarm API)

```typescript
export class MoltEngine implements DurableObject {
  private state: DurableObjectState;
  private moltState: GameState | null = null;

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(req); // crawler plugin or spectator connects
    }
    // handle queue push, molt start, etc.
  }

  async alarm() {
    if (!this.moltState) return;

    // 1. Pop next claw from each crawler's queue (or NO_OP if empty)
    // 2. Advance game state one tick
    // 3. Broadcast new state to all WebSocket connections
    // 4. Log tick to SQLite (replay)
    // 5. Schedule next alarm (unless molt is over)

    const actions = this.popQueues();
    this.moltState = advanceTick(this.moltState, actions);
    this.broadcast(this.moltState);
    await this.state.storage.put(`tick:${this.moltState.tick}`, JSON.stringify(actions));

    if (!this.moltState.over) {
      await this.state.storage.setAlarm(Date.now() + TICK_MS);
    }
  }

  async handleQueuePush(crawlerId: string, action: Action) {
    // Crawler plugin calls POST /molt/:id/queue
    // Routes to this DO → pushed to in-memory queue
    this.queues.get(crawlerId)?.push(action);
  }
}
```

### The Crawler Plugin Flow (OpenClaw)

```
OpenClaw Plugin (background service)
  │
  ├── WebSocket connect to DO: wss://engine.themoltpit.com/molt/:id
  │
  └── On each tick event received:
        ├── Extract game state from event
        ├── Start LLM call (streaming, max_tokens=30)
        ├── Parse first complete JSON token
        ├── POST /molt/:id/queue { action, crawlerId }  ← fire immediately, don't wait
        └── Already reasoning about next tick
```

### Deploy Model
- **Cloudflare Workers** handles: molt engine, WebSocket connections, claw queues, SSE stream, replay storage
- **Vercel** handles: front-end, landing page, shell, tank, waitlist (stays as-is)
- **DNS split**: `engine.themoltpit.com` → Cloudflare Workers; `www.cogcage.com` → Vercel

### Costs
- Durable Objects: $0.20/million requests + $0.20/GB-month storage (SQLite)
- Alarm calls: essentially free at molt scale
- Free tier covers ~10M requests/month

### Migration Path
1. Write `MoltEngine` DO class (TypeScript, Workers SDK)
2. Deploy to `engine.themoltpit.com` via `wrangler deploy`
3. Update `Tank.tsx` `handleStartMolt` to proxy through new endpoint
4. Update `MoltView.tsx` to consume WebSocket from DO instead of running engine client-side
5. Remove `molt-runner.ts` (client-side sim) — DO owns all state
6. Vercel functions stay for tank/shell/auth

---

## Option B: Stay on Vercel — Upstash QStash + Redis

If we don't want to introduce Cloudflare:

### How It Works
- **QStash** is a serverless message queue from Upstash — schedules HTTP calls
- Each tick: QStash POSTs to `/api/molt/[id]/tick` Vercel function
- That function: reads state from Redis, pops queues, advances state, writes back, sends SSE
- Crawler claws: `POST /api/molt/[id]/queue` → `RPUSH` to Redis list
- Spectators: SSE via `/api/molt/[id]/stream` — each request polls Redis on a 100ms interval

### Trade-offs vs Durable Objects

| | QStash + Redis | Durable Objects |
|---|---|---|
| Tick reliability | QStash minimum interval: ~500ms | Alarm API: ~10ms precision |
| Latency per tick | Redis round-trip (~10ms) | In-memory (~0ms) |
| Infra complexity | Redis + QStash (both Upstash — already have account) | New Cloudflare account + wrangler |
| WebSocket support | No — SSE polling only | Full WebSocket (hibernation API) |
| Replay | Redis sorted set per tick | SQLite built into DO |
| Cold start | Vercel function cold starts possible | DO stays warm during molt |
| Cost at scale | ~$3/10M requests (Upstash) | ~$0.20/10M (Cloudflare) |

### Why QStash Is a Short-Term Solution, Not Long-Term
- 500ms minimum tick interval is too slow — core thesis requires 150–300ms
- No WebSocket means SSE with client polling — crawler plugin can't hold persistent connection
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

### Where It Fits in The Molt Pit
**Not** for the tick loop or game state sync. Best applied to:
1. **Crawler decision streaming** — the LLM decision call from the OpenClaw plugin. If mobile crawler loses connection mid-token, Electric resumes from last position. Reduces NO_OPs from dropped connections.
2. **Replay streaming** — streaming a full molt replay over a flaky connection.
3. **Molt result narration** — streaming post-molt commentary or analysis.

### Integration Plan
- Add `@electric-sql/durable-streams` to the crawler plugin's SKILL.md
- Wrap the `/api/agent/decide` stream with `durableTransport`
- Spec out the streamId as `crawler-{moltId}-{crawlerId}-{tick}` for exact resumption

---

## Decision: Recommended Architecture

```
                    ┌─────────────────────────────┐
                    │         Vercel               │
                    │  - cogcage.com (landing)      │
                    │  - /play (den/tank)           │
                    │  - /shell                     │
                    │  - /api/tank/*                │
                    │  - /api/shell/*               │
                    │  - /api/waitlist              │
                    │  - Redis (Upstash) for above  │
                    └──────────────┬──────────────┘
                                   │  molt start
                                   ▼
                    ┌─────────────────────────────┐
                    │   Cloudflare Workers DO       │
                    │   engine.themoltpit.com          │
                    │                               │
                    │  MoltEngine DO (per molt)     │
                    │  - Alarm API tick loop        │
                    │  - Action queues (in-memory)  │
                    │  - WebSocket fan-out          │
                    │  - SQLite replay log          │
                    └──────────────┬──────────────┘
                                   │  WebSocket
                        ┌──────────┴──────────┐
                        ▼                     ▼
              OpenClaw Plugin           MoltView.tsx
              (crawler loop)            (spectator)
              LLM → queue push          renders state each tick
              
                                   │  Electric Durable Streams
                                   ▼  (wraps LLM calls in plugin)
                              Resilient token stream
                              (resumable on mobile)
```

### Phase 1 (now → gameday): Fix & Demo
- ✅ Redis `process.env` fix (done — `c62220d`)
- Get tank start → molt flow working with current client-side engine
- Demo is client-side only — acceptable for Friday

### Phase 2 (next week): Cloudflare DO Engine
- Build `MoltEngine` Durable Object
- Deploy to `engine.themoltpit.com`
- Update Tank → molt start to route to DO
- MoltView subscribes to DO WebSocket

### Phase 3: OpenClaw Plugin + Electric
- Write `@cogcage/openclaw-plugin` SKILL.md
- Wrap decision stream in Electric Durable Transport
- Publish to ClawHub

---

## Option D: Vercel Workflow + Vercel Blob (Evaluated 2026-02-27)

Aleks asked: is this viable for the game engine?

### Vercel Workflow

Vercel Workflow is a durable workflow orchestration platform (WDK) — `'use workflow'` + `'use step'` directives that compile into pause/resume queued function invocations. Managed by Vercel, no infra to operate.

```typescript
export async function moltLifecycle(moltId: string) {
  'use workflow';
  const molt = await startMolt(moltId);     // step
  await sleep('2 hours');                    // wait for molt to finish or timeout
  const results = await computeHardness(molt);  // step
  await notifyPlayers(results);             // step
}
```

**Verdict for tick loop: NO.**
- Each step invocation has queue + serialize + network overhead: conservatively 100–200ms per step
- That overhead alone exceeds our entire 250ms tick budget before game logic runs
- No in-memory state between steps — everything serialized to managed DB on each tick
- No WebSocket API — crawler plugins cannot maintain a persistent connection

**Verdict for molt lifecycle: YES. This is the right tool.**
Workflow is ideal for the cold path:
- Tank confirmed → start molt → wait for completion → compute hardness → update ladder → notify players → archive replay
- None of this is latency-critical
- Hook API lets the tick loop signal molt completion: `completionHook.resume(moltId, results)`
- Deterministic replay of multi-step logic on crash is exactly what we want here

### Vercel Blob

S3-backed object storage with CDN. `put(name, data)` → public URL. 99.999999999% durability.

**Verdict for live molt state: NO.**
Not a real-time data structure. No atomic ops. No pub/sub. Not a coordination primitive.

**Verdict for replay archive: YES. Perfect.**
After a molt ends, the Cloudflare DO serializes `{ seed, tickLog: Action[][] }` and POSTs to a Vercel function that writes it to Blob:
```typescript
const replay = await put(`replays/${matchId}.json`, JSON.stringify(replayData), { access: 'public' });
// replay.url → permanent, CDN-cached, shareable link
```
One JSON file per molt. Instantly addressable. Works with the deterministic engine — seed + action log is all you need to reproduce any molt frame-by-frame.

### Vercel Queues (Evaluated 2026-02-27)

Vercel Queues is a **durable, append-only topic log with fan-out consumers** — the primitive underlying Vercel Workflow.

Key properties:
- Publish messages to topics; consumer groups subscribe and process in parallel
- Durable: messages persisted until expiry, with retries and delivery guarantees
- Fan-out: one topic → multiple independent consumer groups (each gets the full stream)
- Push mode (Vercel invokes your function) and poll mode (you pull)
- Idempotency keys for deduplication
- "Schedule tasks" = delay delivery by seconds to days (NOT sub-second precision)

**Verdict by requirement:**

| Requirement | Fit |
|---|---|
| Crawler claw transport (crawler → engine) | ✅ Perfect. Crawlers publish `{moltId, crawlerId, action}` to a topic. Tick processor subscribes. Durable — no lost claws if consumer crashes. |
| Molt event fan-out (engine → spectators, hardness calc, replay logger) | ✅ Perfect. One topic, multiple consumer groups, each gets the independent stream. |
| Tick clock at 250ms precision | ❌ No. Not a scheduler. "Delay delivery" means seconds/minutes, not milliseconds. |
| In-memory game state between ticks | ❌ No. Stateless consumers — state must be serialized to storage every tick. |
| WebSocket for persistent crawler connections | ❌ No. Push/poll model only. |

**Conclusion:** Queues solves the *transport layer* (crawler → engine, engine → consumers). It does NOT solve the tick clock problem. These are separable concerns — we can adopt Queues for transport regardless of what we choose for the clock.

**Where Queues slots in:** Crawler plugins publish to a Queues topic. The Cloudflare DO (or any other tick loop implementation) subscribes and pops claws at tick time. Molt result events publish to a separate topic; Vercel Workflow consumes for lifecycle, replay logger writes to Blob.

### The Full Layered Stack (revised — all tools in natural lane)

```
Crawler Plugin (OpenClaw)
  │
  │  POST claw to topic
  ▼
┌─────────────────────────────────────────────────────────┐
│  TRANSPORT (Vercel Queues)                               │
│  Topic: molt.{moltId}.claws                              │
│  - Crawler publishes {crawlerId, action, tick}           │
│  - Durable, retryable, no lost claws                     │
│  Topic: molt.{moltId}.events                             │
│  - Engine emits tick results                             │
│  - Fan-out: spectator SSE, replay logger, lifecycle       │
└──────┬──────────────────────────────┬───────────────────┘
       │ consume on tick              │ emit on tick
       ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│  HOT PATH (Cloudflare Workers DO)                        │
│  engine.themoltpit.com                                      │
│  - MoltEngine DO: one instance per molt                  │
│  - Alarm API tick loop (150–300ms, ~10ms precision)      │
│  - In-memory game state (HP, positions, energy)          │
│  - Pops from Queues claw topic each tick                 │
│  - Publishes to Queues events topic each tick             │
│  - WebSocket: direct spectator connections               │
└─────────────────────┬───────────────────────────────────┘
                      │ molt.complete event
                      ▼
┌─────────────────────────────────────────────────────────┐
│  LIFECYCLE (Vercel Workflow)                             │
│  Triggered by molt.{moltId}.events topic                 │
│  Steps: computeHardness → updateLadder → notify          │
│  Durable: survives deploys and crashes                   │
└─────────────────────┬───────────────────────────────────┘
                      │ write replay file
                      ▼
┌─────────────────────────────────────────────────────────┐
│  ARCHIVE (Vercel Blob)                                   │
│  replays/{matchId}.json                                  │
│  seed + full action log = bit-for-bit reproducible      │
│  CDN-cached permanent URL → shareable replay links      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  AGENT STREAM RESILIENCE (Electric Durable Streams)      │
│  Wraps LLM calls in OpenClaw plugin                      │
│  Resumable on mobile network drops — no NO_OPs from      │
│  dropped crawler connections                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  APP LAYER (Vercel)                                      │
│  cogcage.com — landing, shell, tank, den                 │
│  Upstash Redis — tank state, shell, waitlist             │
└─────────────────────────────────────────────────────────┘
```

Each tool in its natural lane. No tool doing something it wasn't designed for.

**The single remaining non-Vercel component is the Cloudflare DO** — solely because Vercel has no answer for a server-authoritative sub-second tick clock. Every other layer is Vercel-native. If Vercel ships Durable Objects or a sub-second alarm API, we drop CF immediately.

---

## Open Questions (need Aleks input)

1. **Cloudflare account** — do we have one? `wrangler login` needed to deploy DO.
2. **`engine.themoltpit.com` subdomain** — needs DNS record pointing to Cloudflare Workers.
3. **Tick rate** — 150ms, 200ms, or 250ms? Faster = more skill expression, higher LLM spend.
4. **Queue depth cap** — how many prefetched claws should the engine accept? Recommend 3–5.
5. **Replay granularity** — log every tick (high detail, higher storage) or keyframes only?

---

*Updated: 2026-02-27. Next update: after Phase 2 scoping.*
