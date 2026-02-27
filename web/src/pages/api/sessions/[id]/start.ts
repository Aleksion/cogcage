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
    const { hostParticipantId } = body;
    if (!hostParticipantId) {
      return new Response(JSON.stringify({ error: 'hostParticipantId required' }), { status: 400 });
    }

    const redis = getRedis();
    const raw = await redis.get(`sessions:${params.id}`);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (session.hostId !== hostParticipantId) {
      return new Response(JSON.stringify({ error: 'Only host can start' }), { status: 403 });
    }

    if (session.status !== 'lobby') {
      return new Response(JSON.stringify({ error: 'Session already started' }), { status: 400 });
    }

    if (session.participants.length < 2) {
      return new Response(JSON.stringify({ error: 'Need at least 2 participants' }), { status: 400 });
    }

    // Generate round-robin bracket: N*(N-1)/2 matchups
    const bracket: any[] = [];
    const participants = session.participants;
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        bracket.push({
          matchId: genId(8),
          botA: participants[i].id,
          botB: participants[j].id,
          status: 'pending',
          winnerId: null,
          scoreA: 0,
          scoreB: 0,
        });
      }
    }

    // Initialize leaderboard
    const leaderboard = participants.map((p: any) => ({
      participantId: p.id,
      name: p.name,
      wins: 0,
      losses: 0,
      points: 0,
      hpTotal: 0,
    }));

    session.bracket = bracket;
    session.leaderboard = leaderboard;
    session.status = 'running';
    session.currentMatchId = bracket[0].matchId;

    // Mark first match as running
    bracket[0].status = 'running';

    await redis.set(`sessions:${params.id}`, JSON.stringify(session), { ex: TTL });

    return new Response(JSON.stringify({ bracket }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};
