import type { APIRoute } from 'astro';
import { updateBot, getLobby, getRole } from '../../../../lib/lobby.ts';
import { getUserId } from '../../../../lib/auth.ts';

export const prerender = false;

/** PUT /api/lobby/[id]/bot — update your bot config (ownership-enforced) */
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  const userId = getUserId({ cookies });
  if (!id || !userId) {
    return new Response(JSON.stringify({ error: 'Missing id or not authenticated' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const lobby = await getLobby(id);
    if (!lobby) {
      return new Response(JSON.stringify({ error: 'Lobby not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const role = getRole(lobby, userId);
    if (role === 'spectator') {
      return new Response(JSON.stringify({ error: 'Forbidden — you are not a participant in this lobby' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    const body = await request.json();
    const { loadoutId } = body;
    if (!loadoutId) {
      return new Response(JSON.stringify({ error: 'loadoutId required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const updated = await updateBot(id, userId, loadoutId);
    return new Response(JSON.stringify({ ok: true, status: updated.status }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
