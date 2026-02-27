import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/session.ts';

export const prerender = false;

/** GET /api/sessions/:id — Get session object */
export const GET: APIRoute = async ({ params }) => {
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
};
