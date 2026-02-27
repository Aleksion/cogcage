export const prerender = false;

import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: import.meta.env.UPSTASH_REDIS_REST_URL,
    token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const TTL = 7200;

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json();
    const { winnerId, scoreA, scoreB, hostParticipantId } = body;
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
      return new Response(JSON.stringify({ error: 'Only host can complete matches' }), { status: 403 });
    }

    // Find the match
    const match = session.bracket.find((m: any) => m.matchId === params.matchId);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), { status: 404 });
    }

    // Mark match done
    match.status = 'done';
    match.winnerId = winnerId || null;
    match.scoreA = scoreA ?? 0;
    match.scoreB = scoreB ?? 0;

    // Update leaderboard
    if (winnerId) {
      const loserId = winnerId === match.botA ? match.botB : match.botA;
      const winnerEntry = session.leaderboard.find((e: any) => e.participantId === winnerId);
      const loserEntry = session.leaderboard.find((e: any) => e.participantId === loserId);
      if (winnerEntry) {
        winnerEntry.wins += 1;
        winnerEntry.points += 3;
        winnerEntry.hpTotal += winnerId === match.botA ? (scoreA ?? 0) : (scoreB ?? 0);
      }
      if (loserEntry) {
        loserEntry.losses += 1;
        loserEntry.hpTotal += loserId === match.botA ? (scoreA ?? 0) : (scoreB ?? 0);
      }
    }

    // Sort leaderboard by points desc, then hpTotal desc
    session.leaderboard.sort((a: any, b: any) =>
      b.points - a.points || b.hpTotal - a.hpTotal
    );

    // Find next pending match
    const nextMatch = session.bracket.find((m: any) => m.status === 'pending');
    if (nextMatch) {
      nextMatch.status = 'running';
      session.currentMatchId = nextMatch.matchId;
    } else {
      session.status = 'done';
      session.currentMatchId = null;
    }

    await redis.set(`sessions:${params.id}`, JSON.stringify(session), { ex: TTL });

    return new Response(JSON.stringify({
      nextMatchId: nextMatch?.matchId || null,
      leaderboard: session.leaderboard,
      done: !nextMatch,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 });
  }
};
