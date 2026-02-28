import { createFileRoute } from '@tanstack/react-router'
import { redis } from '~/lib/redis'

const SNAPSHOT_TTL = 60;

export const Route = createFileRoute('/api/sessions/$id/snapshot')({
  server: {
    handlers: {
      /** GET /api/sessions/:id/snapshot — Get current match snapshot */
      GET: async ({ params }) => {
        const sessionId = params.id;
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Missing session id' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        const raw = await redis.get<string>(`session-snapshot:${sessionId}`);
        if (!raw) {
          return new Response(JSON.stringify({ snapshot: null }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        const snapshot = typeof raw === 'object' ? raw : JSON.parse(raw);
        return new Response(JSON.stringify({ snapshot }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
      /** POST /api/sessions/:id/snapshot — Push match snapshot (host) */
      POST: async ({ params, request }) => {
        const sessionId = params.id;
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Missing session id' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        try {
          const body = await request.json();
          const { matchId, botAName, botBName, botNames, snapshot } = body;

          const payload = { matchId, botAName, botBName, botNames, snapshot, updatedAt: Date.now() };
          const payloadStr = JSON.stringify(payload);

          // Write snapshot + fan-out via Redis Stream (powers SSE /events endpoint)
          await Promise.all([
            redis.set(`session-snapshot:${sessionId}`, payloadStr, { ex: SNAPSHOT_TTL }),
            redis.xadd(`session-stream:${sessionId}`, '*', { data: payloadStr })
              .then(() => redis.expire(`session-stream:${sessionId}`, 7200)), // 2h TTL
          ]);

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
})
