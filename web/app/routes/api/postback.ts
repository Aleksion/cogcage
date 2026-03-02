import { createFileRoute } from '@tanstack/react-router'
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '~/lib/observability'
import { insertConversionEvent, insertFounderIntent } from '~/lib/waitlist-db'
import { redisInsertConversionEvent, redisInsertFounderIntent } from '~/lib/waitlist-redis'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

type CheckoutPostback = {
  type?: string;
  id?: string;
  eventId?: string;
  source?: string;
  created?: number;
  data?: {
    object?: {
      id?: string;
      client_reference_id?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
      metadata?: Record<string, unknown>;
      amount_total?: number;
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

function normalizeAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

async function recordFounderPurchase({
  requestId,
  eventId,
  eventType,
  source,
  stripeSessionId,
  amount,
  email,
  userId,
}: {
  requestId: string;
  eventId: string;
  eventType: string;
  source: string;
  stripeSessionId: string;
  amount: number;
  email?: string;
  userId?: string;
}) {
  try {
    await convexClient.mutation(api.purchases.record, {
      userId,
      email,
      stripeSessionId,
      amount,
      status: 'completed',
    });
    appendOpsLog({
      route: '/api/postback',
      level: 'info',
      event: 'postback_purchase_recorded',
      requestId,
      eventType,
      source,
      eventId,
      stripeSessionId,
      amount,
    });
  } catch (error) {
    appendOpsLog({
      route: '/api/postback',
      level: 'warn',
      event: 'postback_purchase_record_failed',
      requestId,
      eventType,
      source,
      eventId,
      stripeSessionId,
      error: error instanceof Error ? error.message : 'unknown',
    });
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

        appendOpsLog({
          route: '/api/postback',
          level: 'info',
          event: 'postback_received',
          requestId,
          contentType,
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
          appendOpsLog({ route: '/api/postback', level: 'warn', event: 'postback_unauthorized', requestId });
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
        const eventType = typeof rawType === 'string' ? rawType : '';
        const acceptedTypes = new Set(['checkout.session.completed', 'founder_pack.paid']);
        if (!acceptedTypes.has(eventType)) {
          appendOpsLog({
            route: '/api/postback',
            level: 'warn',
            event: 'postback_type_unsupported',
            requestId,
            eventType,
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

        const objectMetadata = (object?.metadata && typeof object.metadata === 'object')
          ? object.metadata
          : {};
        const payloadMetadata = (payload.metadata && typeof payload.metadata === 'object')
          ? payload.metadata
          : undefined;
        const resolvedMetadata = payloadMetadata ?? objectMetadata;
        const sourceFromMetadata =
          normalizeString((resolvedMetadata as Record<string, unknown>).checkout_source, 160)
          || normalizeString((resolvedMetadata as Record<string, unknown>).source, 160);
        const source =
          normalizeString(payload.source, 160)
          || sourceFromMetadata
          || 'postback';
        const meta = {
          eventType,
          created: payload.created,
          metadata: resolvedMetadata,
        };
        const metadataEventId =
          normalizeString((resolvedMetadata as Record<string, unknown>).checkout_event_id, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).event_id, 180);

        const eventId =
          (typeof payload.eventId === 'string' && payload.eventId.trim() ? payload.eventId.trim() : undefined)
          ?? (typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : undefined)
          ?? (typeof object?.client_reference_id === 'string' && object.client_reference_id.trim() ? object.client_reference_id.trim() : undefined)
          ?? metadataEventId
          ?? (typeof object?.id === 'string' && object.id.trim() ? object.id.trim() : undefined)
          ?? deriveFallbackEventId({ eventType, source, email, created: payload.created, metadata: meta.metadata as Record<string, unknown> });
        const stripeSessionId =
          normalizeString(object?.id, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).stripe_session_id, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).session_id, 180)
          || eventId;
        const purchaseAmount = normalizeAmount(
          object?.amount_total
          ?? (resolvedMetadata as Record<string, unknown>).amount_total
          ?? (resolvedMetadata as Record<string, unknown>).amount
        );
        const purchaseUserId = normalizeString(
          (resolvedMetadata as Record<string, unknown>).user_id
          ?? (resolvedMetadata as Record<string, unknown>).userId,
          180
        ) || undefined;

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
          await recordFounderPurchase({
            requestId,
            eventId,
            eventType,
            source,
            stripeSessionId,
            amount: purchaseAmount,
            email,
            userId: purchaseUserId,
          });

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
            await recordFounderPurchase({
              requestId,
              eventId,
              eventType,
              source,
              stripeSessionId,
              amount: purchaseAmount,
              email,
              userId: purchaseUserId,
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
