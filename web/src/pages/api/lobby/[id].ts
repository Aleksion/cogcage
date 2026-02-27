import type { APIRoute } from 'astro';
import { getLobby, closeLobby, resolveSnapshot } from '../../../lib/lobby.ts';

export const prerender = false;

/** GET /api/lobby/[id] — get lobby state */
export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing lobby id' }), {
      status: 400,
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

    const host = await resolveSnapshot(lobby.hostPlayerId, lobby.hostLoadoutId);
    let guest = null;
    if (lobby.guestPlayerId && lobby.guestLoadoutId) {
      guest = await resolveSnapshot(lobby.guestPlayerId, lobby.guestLoadoutId);
    }

    return new Response(JSON.stringify({
      id: lobby.id,
      host,
      guest,
      status: lobby.status,
      hostPlayerId: lobby.hostPlayerId,
      createdAt: lobby.createdAt,
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

/** DELETE /api/lobby/[id] — leave/close lobby */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  const playerId = cookies.get('moltpit_pid')?.value;
  if (!id || !playerId) {
    return new Response(JSON.stringify({ error: 'Missing id or player' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    await closeLobby(id, playerId);
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
};
