import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '~/lib/session'

/** GET /api/sessions/:id — Get session object */
export const Route = createFileRoute('/api/sessions/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const sessionId = params.id;
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Missing session id' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        const session = await getSession(sessionId);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(session), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  },
})
