import { createFileRoute } from '@tanstack/react-router'
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '~/lib/observability'
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
const ACCEPTED_POSTBACK_TYPES = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'founder_pack.paid',
  'founder_pack_paid',
] as const;

function normalizePostbackType(value: unknown): string {
  if (typeof value !== 'string') return '';
  const type = value.trim();
  if (type === 'founder_pack_paid') return 'founder_pack.paid';
  return type;
}

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

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const flyIp = request.headers.get('fly-client-ip')?.trim();
  return forwarded || realIp || cfIp || flyIp || undefined;
}

function getProvidedPostbackKey(request: Request): string {
  const fromHeader = request.headers.get('x-postback-key')?.trim();
  if (fromHeader) return fromHeader;

  const auth = request.headers.get('authorization')?.trim() ?? '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

function authorize(request: Request): boolean {
  const key = (process.env.COGCAGE_POSTBACK_KEY ?? process.env.MOLTPIT_POSTBACK_KEY)?.trim();
  if (!key) return true;
  const provided = getProvidedPostbackKey(request);
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

export const Route = createFileRoute('/api/postback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestId = crypto.randomUUID();
        if (!authorize(request)) {
          appendOpsLog({
            route: '/api/postback',
            level: 'warn',
            event: 'postback_unauthorized',
            requestId,
            method: 'GET',
            hasHeaderKey: Boolean(request.headers.get('x-postback-key')),
            hasBearer: Boolean(request.headers.get('authorization')),
          });
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }
        // Health check / test endpoint
        const url = new URL(request.url);
        if (url.searchParams.get('test') === '1') {
          return new Response(JSON.stringify({ ok: true, mode: 'test', method: 'GET' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true, status: 'ready', acceptedTypes: [...ACCEPTED_POSTBACK_TYPES] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';

        appendOpsLog({
          route: '/api/postback',
          level: 'info',
          event: 'postback_received',
          requestId,
          contentType,
          hasHeaderKey: Boolean(request.headers.get('x-postback-key')),
          hasBearer: Boolean(request.headers.get('authorization')),
        });

        // Test mode stub: ?test=1 returns 200 without processing, for deploy verification
        const url = new URL(request.url);
        if (url.searchParams.get('test') === '1') {
          return new Response(JSON.stringify({ ok: true, mode: 'test', requestId }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }

        if (!authorize(request)) {
          appendOpsLog({
            route: '/api/postback',
            level: 'warn',
            event: 'postback_unauthorized',
            requestId,
            method: 'POST',
            hasHeaderKey: Boolean(request.headers.get('x-postback-key')),
            hasBearer: Boolean(request.headers.get('authorization')),
          });
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized', requestId }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }

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
          appendOpsLog({
            route: '/api/postback',
            level: 'warn',
            event: 'postback_payload_invalid',
            requestId,
            contentType,
            durationMs: Date.now() - startedAt,
          });
          return new Response(JSON.stringify({ ok: false, error: 'Invalid request payload', requestId }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        const rawType = payload.type ?? '';
        const eventType = normalizePostbackType(rawType);
        const acceptedTypes = new Set<string>(ACCEPTED_POSTBACK_TYPES);
        if (!acceptedTypes.has(eventType)) {
          appendOpsLog({
            route: '/api/postback',
            level: 'warn',
            event: 'postback_type_unsupported',
            requestId,
            rawType: typeof rawType === 'string' ? rawType : '',
            eventType,
            acceptedTypes: [...acceptedTypes],
            durationMs: Date.now() - startedAt,
          });
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
          tier: 'founder',
          email,
          metaJson: safeMetaJson(meta),
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
        };
        const founderIntentPayload = email ? {
          email,
          source: `${source}-postback`,
          intentId: `paid:${eventId}`,
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
        } : null;

        try {
          await redisInsertConversionEvent(conversionPayload);
          try {
            insertConversionEvent(conversionPayload);
          } catch (sqliteError) {
            appendOpsLog({
              route: '/api/postback',
              level: 'warn',
              event: 'postback_sqlite_conversion_write_failed',
              requestId,
              eventType,
              source,
              eventId,
              error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
            });
          }

          if (founderIntentPayload) {
            try {
              await redisInsertFounderIntent(founderIntentPayload);
              try {
                insertFounderIntent(founderIntentPayload);
              } catch (sqliteError) {
                appendOpsLog({
                  route: '/api/postback',
                  level: 'warn',
                  event: 'postback_sqlite_founder_intent_write_failed',
                  requestId,
                  eventType,
                  source,
                  eventId,
                  error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
                });
              }
            } catch (redisFounderError) {
              appendOpsLog({
                route: '/api/postback',
                level: 'warn',
                event: 'postback_redis_founder_intent_write_failed',
                requestId,
                eventType,
                source,
                eventId,
                error: redisFounderError instanceof Error ? redisFounderError.message : 'unknown',
              });
              try {
                insertFounderIntent(founderIntentPayload);
                appendOpsLog({
                  route: '/api/postback',
                  level: 'warn',
                  event: 'postback_founder_intent_saved_sqlite_fallback',
                  requestId,
                  eventType,
                  source,
                  eventId,
                });
              } catch (sqliteFounderError) {
                appendOpsLog({
                  route: '/api/postback',
                  level: 'error',
                  event: 'postback_founder_intent_sqlite_fallback_failed',
                  requestId,
                  eventType,
                  source,
                  eventId,
                  error: sqliteFounderError instanceof Error ? sqliteFounderError.message : 'unknown',
                });
                try {
                  appendFounderIntentFallback({
                    route: '/api/postback',
                    requestId,
                    ...founderIntentPayload,
                    reason: sqliteFounderError instanceof Error ? sqliteFounderError.message : 'unknown',
                  });
                } catch {
                  // best-effort founder-intent fallback only
                }
              }
            }
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
            storage: 'redis',
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
            event: 'postback_redis_conversion_write_failed',
            requestId,
            eventType,
            source,
            eventId,
            error: errorMessage,
            durationMs: Date.now() - startedAt,
          });

          try {
            insertConversionEvent(conversionPayload);
            if (founderIntentPayload) {
              try {
                insertFounderIntent(founderIntentPayload);
              } catch (sqliteFounderError) {
                appendOpsLog({
                  route: '/api/postback',
                  level: 'warn',
                  event: 'postback_sqlite_founder_intent_write_failed',
                  requestId,
                  eventType,
                  source,
                  eventId,
                  error: sqliteFounderError instanceof Error ? sqliteFounderError.message : 'unknown',
                });
              }
            }
            appendOpsLog({
              route: '/api/postback',
              level: 'warn',
              event: 'postback_recorded_sqlite_fallback',
              requestId,
              eventType,
              source,
              eventId,
              hasEmail: Boolean(email),
              durationMs: Date.now() - startedAt,
            });

            return new Response(JSON.stringify({ ok: true, degraded: true, requestId, eventId }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            });
          } catch (sqliteError) {
            const sqliteErrorMessage = sqliteError instanceof Error ? sqliteError.message : 'unknown-error';
            appendOpsLog({
              route: '/api/postback',
              level: 'error',
              event: 'postback_record_failed',
              requestId,
              eventType,
              source,
              eventId,
              error: sqliteErrorMessage,
              durationMs: Date.now() - startedAt,
            });

            try {
              appendEventsFallback({ route: '/api/postback', requestId, ...conversionPayload, reason: sqliteErrorMessage });
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
      },
    },
  },
})
