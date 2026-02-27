import type { APIRoute } from 'astro';
import { startSession } from '../../../../lib/session.ts';

export const prerender = false;

/** POST /api/sessions/:id/start — Start tournament (host only) */
export const POST: APIRoute = async ({ params, request }) => {
  const sessionId = params.id;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing session id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const hostParticipantId = body.hostParticipantId;

    if (!hostParticipantId) {
      return new Response(JSON.stringify({ error: 'hostParticipantId required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { bracket } = await startSession(sessionId, hostParticipantId);
    return new Response(JSON.stringify({ bracket }), {
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
};
