import type { APIRoute } from 'astro';
import { startLobbyMatch } from '../../../../lib/lobby.ts';

export const prerender = false;

/** POST /api/lobby/[id]/start — start match */
export const POST: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing lobby id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const { botA, botB, seed } = await startLobbyMatch(id);
    return new Response(JSON.stringify({ botA, botB, seed }), {
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
