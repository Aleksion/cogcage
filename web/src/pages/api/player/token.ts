import type { APIRoute } from 'astro';
import { Auth } from '@auth/core';
import { authConfig } from '../../../lib/auth';
import { redis } from '../../../lib/redis';

export const prerender = false;

/** GET /api/player/token — returns a stable player token for the authenticated user. */
export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;
  const redisKey = `player:token:${userId}`;

  // Return existing token or generate a new one
  let token = await redis.get<string>(redisKey);
  if (!token) {
    token = crypto.randomUUID();
    await redis.set(redisKey, token);

    // Bootstrap player profile if it doesn't exist
    const profileKey = `player:profile:${userId}`;
    const existing = await redis.get(profileKey);
    if (!existing) {
      await redis.set(profileKey, {
        username: session.user.name || session.user.email || 'Anonymous',
        createdAt: Date.now(),
        hardness: 1000,
      });
    }
  }

  return new Response(JSON.stringify({ token, playerId: userId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/** Resolve the Auth.js session from the request by calling the session endpoint internally. */
async function getSession(request: Request) {
  const url = new URL('/api/auth/session', request.url);
  const sessionReq = new Request(url, { headers: request.headers });
  const response = await Auth(sessionReq, authConfig);
  const data: any = await response.json();
  return data?.user ? data : null;
}
