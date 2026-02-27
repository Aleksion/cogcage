import type { APIRoute } from 'astro';
import { listOpenLobbies, createLobby } from '../../../lib/lobby.ts';

export const prerender = false;

/** GET /api/lobby — list open lobbies */
export const GET: APIRoute = async () => {
  try {
    const lobbies = await listOpenLobbies();
    return new Response(JSON.stringify({ lobbies }), {
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

/** POST /api/lobby — create a lobby */
export const POST: APIRoute = async ({ request, cookies }) => {
  const playerId = cookies.get('moltpit_pid')?.value;
  if (!playerId) {
    return new Response(JSON.stringify({ error: 'No player ID' }), {
      status: 401,
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

    const lobby = await createLobby(playerId, loadoutId);
    return new Response(JSON.stringify({ lobbyId: lobby.id }), {
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
