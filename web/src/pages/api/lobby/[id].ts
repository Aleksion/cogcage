import type { APIRoute } from 'astro';
import { getLobby, getRole, closeLobby } from '../../../lib/lobby.ts';
import { getUserId } from '../../../lib/auth.ts';

export const prerender = false;

/** GET /api/lobby/[id] — get lobby state with viewer role */
export const GET: APIRoute = async ({ params, cookies }) => {
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

    const userId = getUserId({ cookies });
    const role = getRole(lobby, userId);

    return new Response(JSON.stringify({
      id: lobby.id,
      ownerId: lobby.ownerId,
      challengerId: lobby.challengerId,
      ownerBot: lobby.ownerBot,
      challengerBot: lobby.challengerBot ?? null,
      ownerReady: lobby.ownerReady,
      challengerReady: lobby.challengerReady,
      status: lobby.status,
      createdAt: lobby.createdAt,
      role,
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
  const userId = getUserId({ cookies });
  if (!id || !userId) {
    return new Response(JSON.stringify({ error: 'Missing id or not authenticated' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    await closeLobby(id, userId);
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
