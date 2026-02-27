import type { APIRoute } from 'astro';
import { completeMatch, getSession } from '../../../../lib/session.ts';

export const prerender = false;

/** POST /api/sessions/:id/complete — Complete current match */
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
    const { matchId, winnerId, scoreA, scoreB, hostParticipantId } = body;

    if (!matchId || !winnerId) {
      return new Response(JSON.stringify({ error: 'matchId and winnerId required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Verify host
    const session = await getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (session.hostParticipantId !== hostParticipantId) {
      return new Response(JSON.stringify({ error: 'Only host can complete matches' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    const result = await completeMatch(sessionId, matchId, winnerId, scoreA ?? 0, scoreB ?? 0);
    return new Response(JSON.stringify(result), {
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
