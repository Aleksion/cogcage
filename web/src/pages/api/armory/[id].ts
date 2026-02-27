import type { APIRoute } from 'astro';
import { deleteLoadout } from '../../../lib/armory.ts';

export const prerender = false;

/** DELETE /api/armory/:id — Remove a saved loadout */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const playerId = cookies.get('moltpit_pid')?.value;
  if (!playerId) {
    return new Response(JSON.stringify({ error: 'No player ID' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const loadoutId = params.id;
  if (!loadoutId) {
    return new Response(JSON.stringify({ error: 'Loadout ID required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const result = await deleteLoadout(playerId, loadoutId);
    return new Response(JSON.stringify({ loadouts: result.loadouts }), {
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
