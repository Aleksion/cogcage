import { createFileRoute } from '@tanstack/react-router'
import { createSession } from '~/lib/session'

/** POST /api/sessions — Create a new FFA session */
export const Route = createFileRoute('/api/sessions')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const hostName = body.hostName || 'Host';
          const bot = body.bot;

          if (!bot) {
            return new Response(JSON.stringify({ error: 'bot config required' }), {
              status: 400,
              headers: { 'content-type': 'application/json' },
            });
          }

          const result = await createSession(hostName, bot);
          return new Response(JSON.stringify(result), {
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
