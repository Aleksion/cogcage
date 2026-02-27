import type { APIRoute } from 'astro';
import { getSessionIdByCode, joinSession } from '../../../lib/session.ts';

export const prerender = false;

/** POST /api/sessions/join-by-code — Join session by 6-char code */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const code = String(body.code || '').toUpperCase().trim();
    const name = body.name || 'Player';
    const bot = body.bot;

    if (!code || code.length !== 6) {
      return new Response(JSON.stringify({ error: 'Invalid join code' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!bot) {
      return new Response(JSON.stringify({ error: 'bot config required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const sessionId = await getSessionIdByCode(code);
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session not found for code' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { participantId } = await joinSession(sessionId, name, bot);
    return new Response(JSON.stringify({ sessionId, participantId }), {
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
