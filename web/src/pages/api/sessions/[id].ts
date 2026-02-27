export const prerender = false;

import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const redis = getRedis();
    const raw = await redis.get(`sessions:${params.id}`);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // Strip password from response
    const { password: _, ...safe } = session;
    return new Response(JSON.stringify({ session: safe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const redis = getRedis();
    const raw = await redis.get(`sessions:${params.id}`);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Optional: check host via query param or body
    let hostParticipantId: string | null = null;
    try {
      const body = await request.json();
      hostParticipantId = body.hostParticipantId;
    } catch { /* no body */ }

    if (hostParticipantId && session.hostId !== hostParticipantId) {
      return new Response(JSON.stringify({ error: 'Only host can delete' }), { status: 403 });
    }

    await redis.del(`sessions:${params.id}`);
    if (session.code) await redis.del(`session-code:${session.code}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};
