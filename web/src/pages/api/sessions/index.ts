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

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const TTL = 7200;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { hostName, bot, password } = body;
    if (!hostName || !bot) {
      return new Response(JSON.stringify({ error: 'hostName and bot required' }), { status: 400 });
    }

    const redis = getRedis();
    const sessionId = genId(12);
    const code = genCode();
    const participantId = genId(8);

    const session = {
      id: sessionId,
      code,
      status: 'lobby' as const,
      hostId: participantId,
      password: password || null,
      participants: [
        {
          id: participantId,
          name: hostName,
          bot: {
            systemPrompt: bot.systemPrompt || '',
            loadout: bot.loadout || ['MOVE'],
            armor: bot.armor || 'medium',
            temperature: bot.temperature ?? 0.7,
          },
        },
      ],
      bracket: [],
      leaderboard: [],
      currentMatchId: null,
      createdAt: Date.now(),
    };

    await redis.set(`sessions:${sessionId}`, JSON.stringify(session), { ex: TTL });
    await redis.set(`session-code:${code}`, sessionId, { ex: TTL });

    return new Response(JSON.stringify({ sessionId, code, participantId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};
