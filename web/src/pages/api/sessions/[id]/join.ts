export const prerender = false;

import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function genId(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const TTL = 7200;

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json();
    const { name, bot, password } = body;
    if (!name || !bot) {
      return new Response(JSON.stringify({ error: 'name and bot required' }), { status: 400 });
    }

    const redis = getRedis();
    const raw = await redis.get(`sessions:${params.id}`);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (session.status !== 'lobby') {
      return new Response(JSON.stringify({ error: 'Session already started' }), { status: 400 });
    }

    if (session.password && session.password !== password) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 403 });
    }

    if (session.participants.length >= 6) {
      return new Response(JSON.stringify({ error: 'Session full (max 6)' }), { status: 400 });
    }

    const participantId = genId(8);
    session.participants.push({
      id: participantId,
      name,
      bot: {
        systemPrompt: bot.systemPrompt || '',
        loadout: bot.loadout || ['MOVE'],
        armor: bot.armor || 'medium',
        temperature: bot.temperature ?? 0.7,
      },
    });

    await redis.set(`sessions:${params.id}`, JSON.stringify(session), { ex: TTL });

    return new Response(JSON.stringify({ participantId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};
