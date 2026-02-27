/**
 * Auth helper — extracts userId from the request context.
 *
 * TASK-020 will wire this to Auth.js sessions (session.user.id).
 * Until then, falls back to the moltpit_pid cookie for backward compat.
 */

interface AuthContext {
  cookies: {
    get(name: string): { value: string } | undefined;
  };
}

export function getUserId(context: AuthContext): string | null {
  // TODO(TASK-020): extract from Auth.js session first
  //   const session = await getSession(context.request);
  //   if (session?.user?.id) return session.user.id;

  // Fallback: legacy cookie
  return context.cookies.get('moltpit_pid')?.value ?? null;
}
