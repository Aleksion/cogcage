export interface AuthResult {
  ok: boolean;
  botId?: string;
  error?: string;
}

/**
 * Validate an incoming request's auth token.
 * Phase 1: accept any non-empty Bearer token — we tighten this in Phase 3.
 * The token value is used as the botId for queue routing.
 */
export function validateToken(request: Request): AuthResult {
  const header = request.headers.get('Authorization');
  if (!header) {
    return { ok: false, error: 'Missing Authorization header' };
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { ok: false, error: 'Invalid Authorization format — expected Bearer <token>' };
  }

  const token = parts[1].trim();
  if (!token) {
    return { ok: false, error: 'Empty token' };
  }

  // Phase 1: token IS the botId (e.g. "Bearer alpha" or "Bearer bot_abc123")
  return { ok: true, botId: token };
}

/**
 * Validate a shared secret for Vercel→DO internal calls.
 * Checks Authorization header against COGCAGE_ENGINE_SECRET env var.
 */
export function validateSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return true; // no secret configured = allow (dev mode)
  const header = request.headers.get('Authorization');
  return header === `Bearer ${secret}`;
}
