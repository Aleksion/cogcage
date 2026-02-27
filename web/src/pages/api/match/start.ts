import type { APIRoute } from 'astro';

export const prerender = false;

const ENGINE_URL =
  process.env.ENGINE_URL ?? 'https://themoltpit-engine.aleks-precurion.workers.dev';
const ENGINE_SECRET = process.env.MOLTPIT_ENGINE_SECRET ?? '';

/** POST /api/match/start — start a match on the MatchEngine DO (direct flow, no lobby) */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { botA, botB, seed } = body;
  if (!botA || !botB) {
    return new Response(JSON.stringify({ error: 'botA and botB are required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const doRes = await fetch(`${ENGINE_URL}/match/${matchId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ENGINE_SECRET ? { Authorization: `Bearer ${ENGINE_SECRET}` } : {}),
      },
      body: JSON.stringify({ botA, botB, seed }),
    });

    if (!doRes.ok) {
      const detail = await doRes.text();
      console.error(`[match/start] DO start failed (${doRes.status}): ${detail}`);
      return new Response(JSON.stringify({ error: 'Engine start failed', detail }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ matchId }), {
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
