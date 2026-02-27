import type { APIRoute } from 'astro';
import { setReady, getLobby, getRole } from '../../../../lib/lobby.ts';
import { getUserId } from '../../../../lib/auth.ts';

export const prerender = false;

/** POST /api/lobby/[id]/ready — mark yourself as ready (or unready) */
export const POST: APIRoute = async ({ params, request, cookies }) => {
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

    let ready = true;
    try {
      const body = await request.json();
      if (typeof body.ready === 'boolean') ready = body.ready;
    } catch {
      // default to ready=true if no body
    }

    const updated = await setReady(id, userId, ready);
    return new Response(JSON.stringify({
      ok: true,
      status: updated.status,
      ownerReady: updated.ownerReady,
      challengerReady: updated.challengerReady,
    }), {
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
