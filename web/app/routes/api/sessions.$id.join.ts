import { createFileRoute } from '@tanstack/react-router'
import { joinSession } from '~/lib/session'

/** POST /api/sessions/:id/join — Join a session by ID */
export const Route = createFileRoute('/api/sessions/$id/join')({
  server: {
    handlers: {
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
          const name = body.name || 'Player';
          const bot = body.bot;

          if (!bot) {
            return new Response(JSON.stringify({ error: 'bot config required' }), {
              status: 400,
              headers: { 'content-type': 'application/json' },
            });
          }

          const { participantId } = await joinSession(sessionId, name, bot);
          return new Response(JSON.stringify({ participantId }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          const status = err.message.includes('not found') ? 404 : 400;
          return new Response(JSON.stringify({ error: err.message }), {
            status,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
})
