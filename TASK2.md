# SSE Upgrade — Durable Streams via Redis XADD/XREAD

## Why
Replace 500ms polling with Server-Sent Events (SSE) backed by Redis Streams.
This gives durable, real-time state sync — clients reconnect and catch up from last event.

## Architecture

### Host writes
POST /api/sessions/:id/snapshot  →  redis.xadd(`session-stream:${id}`, '*', {data: JSON.stringify(snapshot)})
                                     ALSO redis.set(`session-snapshot:${id}`, snapshot, {ex: 60})  ← keep for initial load

### Clients subscribe (NEW)
GET /api/sessions/:id/events  →  SSE stream via Vercel Edge Runtime
  - Uses ReadableStream with Redis XREAD polling loop inside
  - Client connects with EventSource, gets real-time pushes
  - On reconnect: client passes Last-Event-ID header → XREAD from that offset (catch-up)

### Client-side change (SessionRoom.tsx)
Replace setInterval polling with:
  const es = new EventSource(`/api/sessions/${id}/events`)
  es.onmessage = (e) => { const snap = JSON.parse(e.data); renderSnapshot(snap) }

---

## Implementation Steps

### Step 1: Update web/src/pages/api/sessions/[id]/snapshot.ts
POST handler: in addition to existing redis.set, also call:
  await redis.xadd(`session-stream:${params.id}`, '*', { data: JSON.stringify(body.snapshot) })
Keep the GET handler for initial load.
Stream key TTL: streams auto-expire via EXPIRE — add: await redis.expire(`session-stream:${params.id}`, 7200)

### Step 2: Create web/src/pages/api/sessions/[id]/events.ts
This is the SSE endpoint. MUST use Vercel Edge Runtime (no 60s timeout).

```typescript
export const prerender = false;
export const config = { runtime: 'edge' };

import { Redis } from '@upstash/redis';

export async function GET({ params, request }: { params: { id: string }, request: Request }) {
  const redis = new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const sessionId = params.id;
  const streamKey = `session-stream:${sessionId}`;
  
  // Last-Event-ID for reconnect/catch-up
  const lastId = request.headers.get('Last-Event-ID') || '0-0';

  const encoder = new TextEncoder();
  let lastSeenId = lastId;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode(': ping\n\n'));

      // Poll loop — XREAD with 2s block timeout
      while (!closed) {
        try {
          const results = await redis.xread(
            [{ key: streamKey, id: lastSeenId }],
            { count: 10, blockMs: 2000 }
          );

          if (results && results.length > 0) {
            for (const [, messages] of results) {
              for (const message of messages) {
                const [id, fields] = message;
                const data = fields.data as string;
                lastSeenId = id;
                // SSE format: id + data
                controller.enqueue(encoder.encode(`id: ${id}\ndata: ${data}\n\n`));
              }
            }
          } else {
            // Keep-alive ping every 2s
            controller.enqueue(encoder.encode(': ping\n\n'));
          }
        } catch (e) {
          // On error, close gracefully
          break;
        }
      }
      controller.close();
    },
    cancel() {
      closed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

Note: Upstash Redis xread API — check @upstash/redis docs for exact call signature. May be:
  redis.xread({ key: streamKey, id: lastSeenId }, { count: 10 })
  Adjust to match the actual @upstash/redis API. Use xread without blockMs if blocking isn't supported via REST.

### Step 3: Update web/src/components/SessionRoom.tsx
Remove all setInterval/fetch polling for snapshots.
Replace with EventSource:

```typescript
useEffect(() => {
  if (phase !== 'match') return;
  
  const es = new EventSource(`/api/sessions/${sessionId}/events`);
  
  es.onmessage = (e) => {
    try {
      const snap = JSON.parse(e.data);
      // Apply snapshot to arena state (same logic as existing handleSnapshot)
      applySnapshot(snap);
    } catch {}
  };
  
  es.onerror = () => {
    // EventSource auto-reconnects with Last-Event-ID — no manual handling needed
  };
  
  return () => es.close();
}, [phase, sessionId]);
```

The applySnapshot function should update: botAHp, botBHp, botAPos, botBPos, feed, tick, etc.
Copy from existing handleSnapshot logic in SessionRoom.tsx or Play.tsx.

### Step 4: Keep polling fallback for session metadata
Session status (lobby/running/done), participant list, leaderboard — these change less frequently.
Keep the existing 3s polling for session metadata (GET /api/sessions/:id).
Only the match snapshot uses SSE.

### Step 5: Build + verify
npm --prefix web run build   ← must pass clean

### Step 6: Commit + push
git add -A
git commit -m "feat(ws2): SSE durable stream sync — Redis XADD/XREAD + EventSource replace polling"
git push origin feat/ws2-ffa-sessions

---

## Notes
- @upstash/redis XREAD: check exact API. It may not support BLOCK via REST — if not, poll with 1s sleep between reads
- Edge Runtime in Astro: `export const config = { runtime: 'edge' }` — verify this works with @astrojs/vercel adapter
- If Edge Runtime causes build issues, use standard serverless but set a long response timeout
- Prioritize getting it working over perfect implementation
