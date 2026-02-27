import { defineMiddleware } from 'astro:middleware';
import { Auth } from '@auth/core';
import { authConfig } from './lib/auth';

/** Routes that require an authenticated session — redirects to /sign-in if none. */
const PROTECTED_PREFIXES = ['/armory', '/play', '/shell', '/tank'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, url, request } = context;

  // ── Anonymous player ID cookie (legacy, still used by API routes) ──────────
  let playerId = cookies.get('moltpit_pid')?.value;
  if (!playerId) {
    playerId = crypto.randomUUID();
    cookies.set('moltpit_pid', playerId, {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });
  }
  (locals as Record<string, unknown>).playerId = playerId;

  // ── Auth protection for game routes ────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (isProtected) {
    const sessionUrl = new URL('/api/auth/session', url.origin);
    const sessionReq = new Request(sessionUrl, { headers: request.headers });
    const res = await Auth(sessionReq, authConfig);
    const session: any = await res.json();

    if (!session?.user) {
      return context.redirect('/sign-in');
    }

    (locals as Record<string, unknown>).session = session;
  }

  return next();
});
