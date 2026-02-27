import type { APIRoute } from 'astro';
import { getLoadouts, saveLoadout } from '../../../lib/armory.ts';

export const prerender = false;

/** GET /api/shell — Fetch player shells */
export const GET: APIRoute = async ({ cookies }) => {
  const playerId = cookies.get('moltpit_pid')?.value;
  if (!playerId) {
    return new Response(JSON.stringify({ loadouts: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const loadouts = await getLoadouts(playerId);
    return new Response(JSON.stringify({ loadouts }), {
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

/** POST /api/shell — Save a new shell */
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
    const { name, cards, brainPrompt, skills } = body;

    if (!name || !Array.isArray(cards)) {
      return new Response(JSON.stringify({ error: 'name and cards[] required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const result = await saveLoadout(playerId, name, cards, brainPrompt || '', Array.isArray(skills) ? skills : []);
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error, loadouts: result.loadouts }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

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
