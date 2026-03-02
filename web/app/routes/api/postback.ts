import { createFileRoute } from '@tanstack/react-router'
import { appendEventsFallback, appendOpsLog } from '~/lib/observability'
import { insertConversionEvent, insertFounderIntent } from '~/lib/waitlist-db'
import { redisInsertConversionEvent, redisInsertFounderIntent } from '~/lib/waitlist-redis'

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
const ACCEPTED_POSTBACK_TYPES = new Set(['checkout.session.completed', 'founder_pack.paid']);

function normalizeString(value: unknown, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const email = value.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return undefined;
  return email;
}

function authorize(request: Request): boolean {
  const key = (process.env.COGCAGE_POSTBACK_KEY ?? process.env.MOLTPIT_POSTBACK_KEY)?.trim();
  if (!key) return true;
  const provided = request.headers.get('x-postback-key')?.trim() ?? '';
  return provided === key;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function deriveFallbackEventId({ eventType, source, email, created, metadata }: { eventType: string; source: string; email?: string; created?: number; metadata?: Record<string, unknown> }) {
  const day = new Date().toISOString().slice(0, 10);
  const metadataPreview = JSON.stringify(metadata ?? {}).slice(0, 512);
  const fingerprint = `${eventType}|${source}|${email || 'anon'}|${created || ''}|${metadataPreview}|${day}`;
  return `postback:${day}:${hashString(fingerprint)}`;
}

function safeMetaJson(meta: Record<string, unknown>) {
  try {
    const serialized = JSON.stringify(meta);
    return serialized.length > 4000
      ? JSON.stringify({ truncated: true, preview: serialized.slice(0, 3800) })
      : serialized;
  } catch {
    return JSON.stringify({ invalidMeta: true });
  }
}

function parseGetPayload(url: URL): CheckoutPostback | null {
  const type = normalizeString(url.searchParams.get('type'), 120);
  if (!type) return null;

  const eventId = normalizeString(url.searchParams.get('eventId') ?? url.searchParams.get('id'), 180);
  const source = normalizeString(url.searchParams.get('source'), 160);
  const email = normalizeString(url.searchParams.get('email'), 180);
  const sessionId = normalizeString(url.searchParams.get('session_id') ?? url.searchParams.get('sessionId'), 180);
  const tier = normalizeString(url.searchParams.get('tier'), 80);

  const metadata: Record<string, unknown> = {};
  if (sessionId) metadata.sessionId = sessionId;
  if (tier) metadata.tier = tier;

  return {
    type,
    eventId: eventId || undefined,
    source: source || undefined,
    email: email || undefined,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}

async function processPostbackPayload({
  request,
  payload,
  requestId,
  startedAt,
}: {
  request: Request;
  payload: CheckoutPostback;
  requestId: string;
  startedAt: number;
}) {
  const eventType = typeof payload.type === 'string' ? payload.type : '';
  if (!ACCEPTED_POSTBACK_TYPES.has(eventType)) {
    return new Response(JSON.stringify({ ok: false, error: 'Unsupported postback type', requestId }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  const object = payload.data?.object;
  const email =
    normalizeEmail(payload.email)
    ?? normalizeEmail(object?.customer_email)
    ?? normalizeEmail(object?.customer_details?.email);

  const source = typeof payload.source === 'string' && payload.source.trim() ? payload.source.trim() : 'postback';
  const tier = 'founder';
  const meta = {
    eventType,
    created: payload.created,
    metadata: payload.metadata ?? object?.metadata ?? {},
  };

  const eventId =
    (typeof payload.eventId === 'string' && payload.eventId.trim() ? payload.eventId.trim() : undefined)
    ?? (typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : undefined)
    ?? (typeof object?.id === 'string' && object.id.trim() ? object.id.trim() : undefined)
    ?? deriveFallbackEventId({ eventType, source, email, created: payload.created, metadata: meta.metadata as Record<string, unknown> });

  const conversionPayload = {
    eventName: 'paid_conversion_confirmed',
    eventId,
    source,
    tier,
    email,
    metaJson: safeMetaJson(meta),
    userAgent: request.headers.get('user-agent') ?? undefined,
  };

  appendOpsLog({
    route: '/api/postback',
    level: 'info',
    event: 'postback_received',
    requestId,
    source,
    email: email ?? null,
    tier,
    eventId,
  });

  try {
    insertConversionEvent(conversionPayload);

    // Fire-and-forget Redis writes — durable across Lambda invocations
    void redisInsertConversionEvent(conversionPayload).catch((e: unknown) => {
      appendOpsLog({ route: '/api/postback', level: 'warn', event: 'postback_redis_conversion_write_failed', requestId, error: e instanceof Error ? e.message : 'unknown' });
    });

    if (email) {
      const founderIntentPayload = {
        email,
        source: `${source}-postback`,
        intentId: `paid:${eventId}`,
        userAgent: request.headers.get('user-agent') ?? undefined,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      };
      insertFounderIntent(founderIntentPayload);
      void redisInsertFounderIntent(founderIntentPayload).catch((e: unknown) => {
        appendOpsLog({ route: '/api/postback', level: 'warn', event: 'postback_redis_founder_intent_write_failed', requestId, error: e instanceof Error ? e.message : 'unknown' });
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
}

export const Route = createFileRoute('/api/postback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();

        if (!authorize(request)) {
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }

        const url = new URL(request.url);

        // Health check / test endpoint
        if (url.searchParams.get('test') === '1') {
          return new Response(JSON.stringify({ ok: true, mode: 'test', method: 'GET' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        const payload = parseGetPayload(url);
        if (payload) {
          return processPostbackPayload({ request, payload, requestId, startedAt });
        }

        return new Response(JSON.stringify({ ok: true, status: 'ready', acceptedTypes: Array.from(ACCEPTED_POSTBACK_TYPES) }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();

        // Test mode stub: ?test=1 returns 200 without processing, for deploy verification
        const url = new URL(request.url);
        if (url.searchParams.get('test') === '1') {
          return new Response(JSON.stringify({ ok: true, mode: 'test', requestId }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (!authorize(request)) {
          appendOpsLog({ route: '/api/postback', level: 'warn', event: 'postback_unauthorized', requestId });
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized', requestId }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }

        const contentType = request.headers.get('content-type') ?? '';
        let payload: CheckoutPostback | null = null;

        try {
          if (contentType.includes('application/json')) {
            payload = (await request.json().catch(() => null)) as CheckoutPostback | null;
          } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const eventType = normalizeString(formData.get('type'), 120);
            const eventId = normalizeString(formData.get('eventId') ?? formData.get('id'), 180);
            const source = normalizeString(formData.get('source'), 160);
            const email = normalizeString(formData.get('email'), 180);
            payload = {
              type: eventType || undefined,
              eventId: eventId || undefined,
              source: source || undefined,
              email: email || undefined,
            };
          } else {
            const rawBody = await request.text();
            if (rawBody.trim().startsWith('{')) {
              payload = JSON.parse(rawBody) as CheckoutPostback;
            } else {
              const params = new URLSearchParams(rawBody);
              payload = {
                type: normalizeString(params.get('type'), 120) || undefined,
                eventId: normalizeString(params.get('eventId') ?? params.get('id'), 180) || undefined,
                source: normalizeString(params.get('source'), 160) || undefined,
                email: normalizeString(params.get('email'), 180) || undefined,
              };
            }
          }
        } catch {
          payload = null;
        }

        if (!payload) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid request payload', requestId }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        return processPostbackPayload({ request, payload, requestId, startedAt });
      },
    },
  },
})
