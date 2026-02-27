import type { APIRoute } from 'astro';
import { joinLobby } from '../../../../lib/lobby.ts';

export const prerender = false;

/** POST /api/lobby/[id]/join — join as guest */
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  const playerId = cookies.get('cogcage_pid')?.value;
  if (!id || !playerId) {
    return new Response(JSON.stringify({ error: 'Missing id or player' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { loadoutId } = body;
    if (!loadoutId) {
      return new Response(JSON.stringify({ error: 'loadoutId required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const lobby = await joinLobby(id, playerId, loadoutId);
    return new Response(JSON.stringify({ ok: true, status: lobby.status }), {
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
