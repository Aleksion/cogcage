import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
  let playerId = cookies.get('moltpit_pid')?.value;

  if (!playerId) {
    playerId = crypto.randomUUID();
    cookies.set('moltpit_pid', playerId, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // accessible from client-side JS as fallback
    });
  }

  (locals as Record<string, unknown>).playerId = playerId;
  return next();
});
