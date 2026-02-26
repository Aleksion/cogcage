import type { APIRoute } from 'astro';
import { appendEventsFallback, appendOpsLog } from '../../lib/observability';
import { insertConversionEvent, insertFounderIntent } from '../../lib/waitlist-db';

export const prerender = false;

type CheckoutPostback = {
  type?: string;
  id?: string;
  eventId?: string;
  source?: string;
  created?: number;
  data?: {
    object?: {
      id?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
      metadata?: Record<string, unknown>;
    };
  };
  email?: string;
  metadata?: Record<string, unknown>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const email = value.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return undefined;
  return email;
}

function authorize(request: Request): boolean {
  const key = process.env.COGCAGE_POSTBACK_KEY?.trim();
  if (!key) return true;
  const provided = request.headers.get('x-postback-key')?.trim() ?? '';
  return provided === key;
}

export const POST: APIRoute = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  if (!authorize(request)) {
    appendOpsLog({ route: '/api/postback', level: 'warn', event: 'postback_unauthorized', requestId });
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized', requestId }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const payload = (await request.json().catch(() => null)) as CheckoutPostback | null;
  if (!payload) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body', requestId }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rawType = payload.type ?? '';
  const eventType = typeof rawType === 'string' ? rawType : '';
  const acceptedTypes = new Set(['checkout.session.completed', 'founder_pack.paid']);
  if (!acceptedTypes.has(eventType)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unsupported postback type', requestId }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  const object = payload.data?.object;
  const eventId =
    (typeof payload.eventId === 'string' && payload.eventId.trim() ? payload.eventId.trim() : undefined)
    ?? (typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : undefined)
    ?? (typeof object?.id === 'string' && object.id.trim() ? object.id.trim() : undefined)
    ?? `postback:${Date.now()}`;

  const email =
    normalizeEmail(payload.email)
    ?? normalizeEmail(object?.customer_email)
    ?? normalizeEmail(object?.customer_details?.email);

  const source = typeof payload.source === 'string' && payload.source.trim() ? payload.source.trim() : 'postback';
  const meta = {
    eventType,
    created: payload.created,
    metadata: payload.metadata ?? object?.metadata ?? {},
  };

  const conversionPayload = {
    eventName: 'paid_conversion_confirmed',
    eventId,
    source,
    tier: 'founder',
    email,
    metaJson: JSON.stringify(meta),
    userAgent: request.headers.get('user-agent') ?? undefined,
  };

  try {
    insertConversionEvent(conversionPayload);

    if (email) {
      insertFounderIntent({
        email,
        source: `${source}-postback`,
        intentId: `paid:${eventId}`,
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
    }

    appendOpsLog({
      route: '/api/postback',
      level: 'info',
      event: 'postback_recorded',
      requestId,
      eventType,
      source,
      eventId,
      hasEmail: Boolean(email),
      durationMs: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({ ok: true, requestId, eventId }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({
      route: '/api/postback',
      level: 'error',
      event: 'postback_record_failed',
      requestId,
      eventType,
      source,
      eventId,
      error: errorMessage,
      durationMs: Date.now() - startedAt,
    });

    try {
      appendEventsFallback({ route: '/api/postback', requestId, ...conversionPayload, reason: errorMessage });
      appendOpsLog({
        route: '/api/postback',
        level: 'warn',
        event: 'postback_saved_to_fallback',
        requestId,
        eventType,
        source,
        eventId,
        durationMs: Date.now() - startedAt,
      });
      return new Response(JSON.stringify({ ok: true, queued: true, requestId, eventId }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    } catch (fallbackError) {
      appendOpsLog({
        route: '/api/postback',
        level: 'error',
        event: 'postback_fallback_write_failed',
        requestId,
        eventType,
        source,
        eventId,
        error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error',
        durationMs: Date.now() - startedAt,
      });

      return new Response(JSON.stringify({ ok: false, error: 'Postback processing failed', requestId }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
};
