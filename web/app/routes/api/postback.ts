import { createFileRoute } from '@tanstack/react-router'
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '~/lib/observability'
import {
  insertConversionEvent,
  insertFounderIntent,
  readApiRequestReceipt,
  writeApiRequestReceipt,
} from '~/lib/waitlist-db'
import {
  redisInsertConversionEvent,
  redisInsertFounderIntent,
  redisReadApiRequestReceipt,
  redisWriteApiRequestReceipt,
} from '~/lib/waitlist-redis'

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

function getIdempotencyKey(request: Request) {
  const key = request.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!key) return undefined;
  return key.slice(0, 120);
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

export const Route = createFileRoute('/api/postback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorize(request)) {
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
        return new Response(JSON.stringify({ ok: true, status: 'ready', acceptedTypes: ['checkout.session.completed', 'founder_pack.paid'] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';
        const route = '/api/postback';
        const explicitIdempotencyKey = getIdempotencyKey(request);

        const baseResponse = (body: Record<string, unknown>, status: number, extraHeaders: Record<string, string> = {}) =>
          new Response(JSON.stringify({ ...body, requestId }), {
            status,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
              ...extraHeaders,
            },
          });

        const respond = async (
          body: Record<string, unknown>,
          status: number,
          idempotencyKey?: string,
          extraHeaders: Record<string, string> = {},
        ) => {
          if (idempotencyKey) {
            const receipt = {
              route,
              idempotencyKey,
              responseStatus: status,
              responseBody: JSON.stringify({ ...body, requestId }),
            };
            let persisted = false;
            try {
              await redisWriteApiRequestReceipt(receipt);
              persisted = true;
            } catch (error) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_idempotency_redis_write_failed',
                requestId,
                error: error instanceof Error ? error.message : 'unknown',
              });
            }
            try {
              writeApiRequestReceipt(receipt);
              persisted = true;
            } catch (error) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_idempotency_sqlite_write_failed',
                requestId,
                error: error instanceof Error ? error.message : 'unknown',
              });
            }
            if (!persisted) {
              appendOpsLog({
                route,
                level: 'error',
                event: 'postback_idempotency_write_failed',
                requestId,
              });
            }
          }
          return baseResponse(body, status, extraHeaders);
        };

        appendOpsLog({
          route,
          level: 'info',
          event: 'postback_received',
          requestId,
          contentType,
        });

        // Test mode stub: ?test=1 returns 200 without processing, for deploy verification
        const url = new URL(request.url);
        if (url.searchParams.get('test') === '1') {
          return baseResponse({ ok: true, mode: 'test' }, 200);
        }

        if (!authorize(request)) {
          appendOpsLog({ route, level: 'warn', event: 'postback_unauthorized', requestId });
          return baseResponse({ ok: false, error: 'Unauthorized' }, 401);
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
            route,
            level: 'warn',
            event: 'postback_payload_invalid',
            requestId,
            contentType,
            durationMs: Date.now() - startedAt,
          });
          return baseResponse({ ok: false, error: 'Invalid request payload' }, 400);
        }

        const rawType = payload.type ?? '';
        const eventType = typeof rawType === 'string' ? rawType : '';
        const acceptedTypes = new Set(['checkout.session.completed', 'founder_pack.paid']);
        if (!acceptedTypes.has(eventType)) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_type_unsupported',
            requestId,
            eventType,
            durationMs: Date.now() - startedAt,
          });
          return baseResponse({ ok: false, error: 'Unsupported postback type' }, 422);
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
        const derivedIdempotencyKey = `postback:${eventType}:${eventId}`.slice(0, 120);
        const idempotencyKey = explicitIdempotencyKey ?? derivedIdempotencyKey;

        try {
          const cached = await redisReadApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'postback_idempotency_replay',
              requestId,
              idempotencyStore: 'redis',
              idempotencyKey,
              eventId,
              durationMs: Date.now() - startedAt,
            });
            return new Response(cached.responseBody, {
              status: cached.responseStatus,
              headers: {
                'content-type': 'application/json',
                'x-request-id': requestId,
                'x-idempotent-replay': '1',
              },
            });
          }
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_idempotency_redis_read_failed',
            requestId,
            eventId,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }

        try {
          const cached = readApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'postback_idempotency_replay',
              requestId,
              idempotencyStore: 'sqlite',
              idempotencyKey,
              eventId,
              durationMs: Date.now() - startedAt,
            });
            return new Response(cached.responseBody, {
              status: cached.responseStatus,
              headers: {
                'content-type': 'application/json',
                'x-request-id': requestId,
                'x-idempotent-replay': '1',
              },
            });
          }
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_idempotency_sqlite_read_failed',
            requestId,
            eventId,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }

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
              route,
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
                  route,
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
                route,
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
                  route,
                  level: 'warn',
                  event: 'postback_founder_intent_saved_sqlite_fallback',
                  requestId,
                  eventType,
                  source,
                  eventId,
                });
              } catch (sqliteFounderError) {
                appendOpsLog({
                  route,
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
                    route,
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
            route,
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

          return respond({ ok: true, eventId }, 200, idempotencyKey);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'unknown-error';
          appendOpsLog({
            route,
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
                  route,
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
              route,
              level: 'warn',
              event: 'postback_recorded_sqlite_fallback',
              requestId,
              eventType,
              source,
              eventId,
              hasEmail: Boolean(email),
              durationMs: Date.now() - startedAt,
            });

            return respond({ ok: true, degraded: true, eventId }, 200, idempotencyKey);
          } catch (sqliteError) {
            const sqliteErrorMessage = sqliteError instanceof Error ? sqliteError.message : 'unknown-error';
            appendOpsLog({
              route,
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
              appendEventsFallback({ route, requestId, ...conversionPayload, reason: sqliteErrorMessage });
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_saved_to_fallback',
                requestId,
                eventType,
                source,
                eventId,
                durationMs: Date.now() - startedAt,
              });
              return respond({ ok: true, queued: true, eventId }, 202, idempotencyKey);
            } catch (fallbackError) {
              appendOpsLog({
                route,
                level: 'error',
                event: 'postback_fallback_write_failed',
                requestId,
                eventType,
                source,
                eventId,
                error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error',
                durationMs: Date.now() - startedAt,
              });

              return respond({ ok: false, error: 'Postback processing failed' }, 500, idempotencyKey);
            }
          }
        }
      },
    },
  },
})
