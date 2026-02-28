import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

export const prerender = false;

const MAX_DURATION_MS = 55_000; // close before Vercel 60s timeout
const POLL_INTERVAL_MS = 800;

/**
 * GET /api/sessions/:id/events — Server-Sent Events stream
 *
 * Backed by Redis Streams (XADD/XREAD). Clients reconnect with
 * Last-Event-ID to catch up from where they left off.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const sessionId = params.id;
  if (!sessionId) {
    return new Response('Missing session id', { status: 400 });
  }

  // Create a per-request Redis instance (safe for long-lived streams)
  const redis = new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const streamKey = `session-stream:${sessionId}`;
  const lastEventId = request.headers.get('Last-Event-ID') || '0-0';

  const encoder = new TextEncoder();
  let closed = false;
  let lastSeenId = lastEventId;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; }
      };

      // Initial keepalive
      enqueue(': connected\n\n');

      const startedAt = Date.now();

      while (!closed && Date.now() - startedAt < MAX_DURATION_MS) {
        try {
          const results = await redis.xread(streamKey, lastSeenId, { count: 20 });

          if (results && Array.isArray(results) && results.length > 0) {
            // Upstash xread returns: [[streamKey, [[id, {field: value}], ...]]]
            for (const streamResult of results) {
              if (!Array.isArray(streamResult) || streamResult.length < 2) continue;
              const messages = streamResult[1];
              if (!Array.isArray(messages)) continue;

              for (const msg of messages) {
                if (!Array.isArray(msg) || msg.length < 2) continue;
                const id = String(msg[0]);
                const fields = msg[1] as Record<string, unknown>;
                const data = typeof fields === 'object' && fields !== null
                  ? (fields.data as string ?? JSON.stringify(fields))
                  : String(fields);

                lastSeenId = id;
                enqueue(`id: ${id}\ndata: ${data}\n\n`);
              }
            }
          } else {
            // No new messages — send keepalive ping
            enqueue(': ping\n\n');
          }
        } catch {
          // Redis error — send ping and continue
          enqueue(': ping\n\n');
        }

        // Sleep between polls (non-blocking XREAD since Upstash REST doesn't support BLOCK)
        if (!closed) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      }

      // Graceful close — EventSource will auto-reconnect with Last-Event-ID
      try { controller.close(); } catch { /* already closed */ }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
