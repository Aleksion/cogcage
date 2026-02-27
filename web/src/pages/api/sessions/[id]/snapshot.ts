export const prerender = false;

import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json();
    const { matchId, botAName, botBName, snapshot } = body;
    if (!matchId || !snapshot) {
      return new Response(JSON.stringify({ error: 'matchId and snapshot required' }), { status: 400 });
    }

    const redis = getRedis();
    await redis.set(
      `sessions:${params.id}:snapshot`,
      JSON.stringify({ matchId, botAName, botBName, snapshot }),
      { ex: 60 },
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const redis = getRedis();
    const raw = await redis.get(`sessions:${params.id}:snapshot`);
    if (!raw) {
      return new Response(JSON.stringify({ snapshot: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};
