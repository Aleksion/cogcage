import type { APIRoute } from 'astro';
import { addDummy } from '../../../../lib/lobby.ts';

export const prerender = false;

/** POST /api/tank/[id]/dummy — add dummy opponent (mirror match) */
export const POST: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing lobby id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const lobby = await addDummy(id);
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
