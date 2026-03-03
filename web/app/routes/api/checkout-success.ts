import { createFileRoute } from '@tanstack/react-router'
import { insertConversionEvent, readApiRequestReceipt, writeApiRequestReceipt } from '~/lib/waitlist-db'
import { appendEventsFallback, appendOpsLog } from '~/lib/observability'
import { redisInsertConversionEvent, redisReadApiRequestReceipt, redisWriteApiRequestReceipt } from '~/lib/waitlist-redis'
import { deriveCheckoutSuccessIdempotencyKey, sanitizeIdempotencyKey } from '~/lib/idempotency'
import { recordCheckoutState } from '~/lib/checkout-state'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const flyIp = request.headers.get('fly-client-ip')?.trim();
  return forwarded || realIp || cfIp || flyIp || undefined;
}

function normalizeString(value: unknown, maxLen = 300) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized.slice(0, maxLen);
}

function optionalString(value: unknown, maxLen = 300) {
  const normalized = normalizeString(value, maxLen);
  return normalized.length > 0 ? normalized : undefined;
}

function getIdempotencyKey(request: Request) {
  return sanitizeIdempotencyKey(request.headers.get('x-idempotency-key'));
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function deriveFallbackEventId({ source, email, href, page, tier }: { source?: string; email?: string; href?: string; page?: string; tier?: string }) {
  const fingerprint = `${source || 'stripe-success'}|${email || 'anon'}|${href || ''}|${page || ''}|${tier || 'founder'}|fallback-v1`;
  return `checkout-success:fallback:${hashString(fingerprint)}`;
}

function safeMetaJson(meta: Record<string, unknown> | undefined) {
  if (!meta) return undefined;
  try {
    const serialized = JSON.stringify(meta);
    return serialized.length > 4000
      ? JSON.stringify({ truncated: true, preview: serialized.slice(0, 3800) })
      : serialized;
  } catch {
    return JSON.stringify({ invalidMeta: true });
  }
}

const recordSuccess = async ({
  requestId,
  eventId,
  page,
  href,
  tier,
  source,
  email,
  meta,
  request,
}: {
  requestId: string;
  eventId?: string;
  page?: string;
  href?: string;
  tier?: string;
  source?: string;
  email?: string;
  meta?: Record<string, unknown>;
  request: Request;
}) => {
  const startedAt = Date.now();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const payload = {
    eventName: 'paid_conversion_confirmed',
    eventId,
    page,
    href,
    tier: tier || 'founder',
    source: source || 'stripe-success',
    email,
    metaJson: safeMetaJson(meta),
    userAgent,
    ipAddress,
  };

  try {
    await redisInsertConversionEvent(payload);
    try {
      insertConversionEvent(payload);
    } catch (sqliteError) {
      appendOpsLog({
        route: '/api/checkout-success',
        level: 'warn',
        event: 'checkout_success_sqlite_write_failed',
        requestId,
        source: payload.source,
        eventId: payload.eventId,
        error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
      });
    }
    appendOpsLog({
      route: '/api/checkout-success',
      level: 'info',
      event: 'paid_conversion_confirmed',
      requestId,
      source: payload.source,
      eventId: payload.eventId,
      storage: 'redis',
      durationMs: Date.now() - startedAt,
    });
    return { requestId, queued: false, degraded: false };
  } catch (error) {
    const redisError = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({
      route: '/api/checkout-success',
      level: 'error',
      event: 'checkout_success_redis_write_failed',
      requestId,
      source: payload.source,
      eventId: payload.eventId,
      error: redisError,
      durationMs: Date.now() - startedAt,
    });

    try {
      insertConversionEvent(payload);
      appendOpsLog({
        route: '/api/checkout-success',
        level: 'warn',
        event: 'paid_conversion_saved_sqlite_fallback',
        requestId,
        source: payload.source,
        eventId: payload.eventId,
        durationMs: Date.now() - startedAt,
      });
      return { requestId, queued: false, degraded: true };
    } catch (sqliteError) {
      const sqliteErrorMessage = sqliteError instanceof Error ? sqliteError.message : 'unknown-error';
      appendOpsLog({
        route: '/api/checkout-success',
        level: 'error',
        event: 'paid_conversion_db_write_failed',
        requestId,
        source: payload.source,
        eventId: payload.eventId,
        error: sqliteErrorMessage,
        durationMs: Date.now() - startedAt,
      });

      try {
        appendEventsFallback({ route: '/api/checkout-success', requestId, ...payload, reason: sqliteErrorMessage });
        appendOpsLog({
          route: '/api/checkout-success',
          level: 'warn',
          event: 'paid_conversion_saved_to_fallback',
          requestId,
          source: payload.source,
          eventId: payload.eventId,
          durationMs: Date.now() - startedAt,
        });
        return { requestId, queued: true, degraded: true };
      } catch (fallbackError) {
        appendOpsLog({
          route: '/api/checkout-success',
          level: 'error',
          event: 'paid_conversion_fallback_write_failed',
          requestId,
          source: payload.source,
          eventId: payload.eventId,
          error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error',
          durationMs: Date.now() - startedAt,
        });
        throw sqliteError;
      }
    }
  }
};

export const Route = createFileRoute('/api/checkout-success')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';
        const route = '/api/checkout-success';
        const explicitIdempotencyKey = getIdempotencyKey(request);
        let idempotencyKey = explicitIdempotencyKey;

        const replayIfCached = async (key: string) => {
          try {
            const cached = await redisReadApiRequestReceipt(route, key);
            if (cached) {
              appendOpsLog({
                route,
                level: 'info',
                event: 'checkout_success_idempotency_replay',
                requestId,
                idempotencyStore: 'redis',
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
              event: 'checkout_success_idempotency_redis_read_failed',
              requestId,
              error: error instanceof Error ? error.message : 'unknown',
            });
          }

          try {
            const cached = readApiRequestReceipt(route, key);
            if (cached) {
              appendOpsLog({
                route,
                level: 'info',
                event: 'checkout_success_idempotency_replay',
                requestId,
                idempotencyStore: 'sqlite',
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
              event: 'checkout_success_idempotency_sqlite_read_failed',
              requestId,
              error: error instanceof Error ? error.message : 'unknown',
            });
          }

          return null;
        };

        const respond = async (
          body: Record<string, unknown>,
          status: number,
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
                event: 'checkout_success_idempotency_redis_write_failed',
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
                event: 'checkout_success_idempotency_sqlite_write_failed',
                requestId,
                error: error instanceof Error ? error.message : 'unknown',
              });
            }
            if (!persisted) {
              appendOpsLog({
                route,
                level: 'error',
                event: 'checkout_success_idempotency_write_failed',
                requestId,
              });
            }
          }

          return new Response(JSON.stringify({ ...body, requestId }), {
            status,
            headers: { 'content-type': 'application/json', 'x-request-id': requestId, ...extraHeaders },
          });
        };

        appendOpsLog({
          route,
          level: 'info',
          event: 'checkout_success_received',
          requestId,
          method: 'POST',
          contentType,
        });

        if (idempotencyKey) {
          const replay = await replayIfCached(idempotencyKey);
          if (replay) {
            return replay;
          }
        }

        let payload: Record<string, unknown> = {};

        try {
          if (contentType.includes('application/json')) {
            payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            formData.forEach((value, key) => {
              payload[key] = value;
            });
          } else {
            const rawBody = await request.text();
            if (rawBody.trim().startsWith('{')) {
              payload = (JSON.parse(rawBody) as Record<string, unknown>) ?? {};
            } else {
              const params = new URLSearchParams(rawBody);
              params.forEach((value, key) => {
                payload[key] = value;
              });
            }
          }
        } catch {
          payload = {};
        }

        const email = optionalString(payload.email);
        if (email && !EMAIL_RE.test(email)) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'checkout_success_invalid_email',
            requestId,
            method: 'POST',
          });
          return respond({ ok: false, error: 'Invalid email format.' }, 400);
        }

        const page = optionalString(payload.page, 120);
        const href = optionalString(payload.href, 600);
        const source = optionalString(payload.source, 120);
        const tier = optionalString(payload.tier, 60);
        const eventId =
          optionalString(payload.eventId, 180)
          ?? optionalString(payload.session_id, 180)
          ?? optionalString(payload.checkout_session_id, 180)
          ?? deriveFallbackEventId({ source, email, href, page, tier });
        const meta = payload.meta && typeof payload.meta === 'object' ? (payload.meta as Record<string, unknown>) : undefined;

        if (!idempotencyKey) {
          idempotencyKey = deriveCheckoutSuccessIdempotencyKey({
            eventId,
            source,
            email,
            page,
            href,
            tier,
          });
          appendOpsLog({
            route,
            level: 'info',
            event: 'checkout_success_idempotency_derived',
            requestId,
            idempotencyKeyPrefix: idempotencyKey.slice(0, 24),
          });
          const replay = await replayIfCached(idempotencyKey);
          if (replay) {
            return replay;
          }
        }

        try {
          const result = await recordSuccess({
            requestId,
            eventId,
            page,
            href,
            tier,
            source,
            email,
            meta,
            request,
          });

          await recordCheckoutState({
            route,
            requestId,
            transactionId: eventId,
            state: result.queued ? 'checkout_success_buffered' : 'checkout_success_recorded',
            source: source ?? 'stripe-success',
            email,
            providerEventId: eventId,
            meta: {
              page,
              href,
              tier: tier ?? 'founder',
              degraded: result.degraded || undefined,
              queued: result.queued || undefined,
            },
          });

          return respond({
            ok: true,
            requestId,
            queued: result.queued || undefined,
            degraded: result.degraded || undefined,
          }, result.queued ? 202 : 200);
        } catch {
          await recordCheckoutState({
            route,
            requestId,
            transactionId: eventId,
            state: 'checkout_success_failed',
            source: source ?? 'stripe-success',
            email,
            providerEventId: eventId,
            meta: { page, href, tier: tier ?? 'founder' },
          });
          return respond({ ok: false, error: 'Conversion storage unavailable.' }, 503);
        }
      },
      GET: async ({ request }) => {
        const requestId = crypto.randomUUID();
        const route = '/api/checkout-success';
        const url = new URL(request.url);
        appendOpsLog({
          route,
          level: 'info',
          event: 'checkout_success_received',
          requestId,
          method: 'GET',
          sessionId: url.searchParams.get('session_id') ?? url.searchParams.get('checkout_session_id') ?? undefined,
        });
        const email = optionalString(url.searchParams.get('email'));
        if (email && !EMAIL_RE.test(email)) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'checkout_success_invalid_email',
            requestId,
            method: 'GET',
          });
          return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
            status: 400,
            headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          });
        }

        const page = optionalString(url.searchParams.get('page'), 120) ?? url.pathname;
        const href = optionalString(url.searchParams.get('href'), 600) ?? request.url;
        const source = optionalString(url.searchParams.get('source'), 120);
        const tier = optionalString(url.searchParams.get('tier'), 60);
        const eventId =
          optionalString(url.searchParams.get('event_id'), 180)
          ?? optionalString(url.searchParams.get('session_id'), 180)
          ?? optionalString(url.searchParams.get('checkout_session_id'), 180)
          ?? deriveFallbackEventId({ source, email, href, page, tier });
        const idempotencyKey = deriveCheckoutSuccessIdempotencyKey({
          eventId,
          source,
          email,
          page,
          href,
          tier,
        });

        try {
          const cached = await redisReadApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'checkout_success_idempotency_replay',
              requestId,
              method: 'GET',
              idempotencyStore: 'redis',
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
            event: 'checkout_success_idempotency_redis_read_failed',
            requestId,
            method: 'GET',
            error: error instanceof Error ? error.message : 'unknown',
          });
        }

        try {
          const cached = readApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'checkout_success_idempotency_replay',
              requestId,
              method: 'GET',
              idempotencyStore: 'sqlite',
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
            event: 'checkout_success_idempotency_sqlite_read_failed',
            requestId,
            method: 'GET',
            error: error instanceof Error ? error.message : 'unknown',
          });
        }

        try {
          const result = await recordSuccess({
            requestId,
            eventId,
            page,
            href,
            tier,
            source,
            email,
            meta: {
              sessionId: eventId,
              query: Object.fromEntries(url.searchParams.entries()),
            },
            request,
          });

          await recordCheckoutState({
            route,
            requestId,
            transactionId: eventId,
            state: result.queued ? 'checkout_success_buffered' : 'checkout_success_recorded',
            source: source ?? 'stripe-success',
            email,
            providerEventId: eventId,
            meta: {
              page,
              href,
              tier: tier ?? 'founder',
              method: 'GET',
              degraded: result.degraded || undefined,
              queued: result.queued || undefined,
            },
          });

          const body = JSON.stringify({
            ok: true,
            requestId,
            queued: result.queued || undefined,
            degraded: result.degraded || undefined,
          });

          const receipt = {
            route,
            idempotencyKey,
            responseStatus: result.queued ? 202 : 200,
            responseBody: body,
          };
          try {
            await redisWriteApiRequestReceipt(receipt);
          } catch (error) {
            appendOpsLog({
              route,
              level: 'warn',
              event: 'checkout_success_idempotency_redis_write_failed',
              requestId,
              method: 'GET',
              error: error instanceof Error ? error.message : 'unknown',
            });
          }
          try {
            writeApiRequestReceipt(receipt);
          } catch (error) {
            appendOpsLog({
              route,
              level: 'warn',
              event: 'checkout_success_idempotency_sqlite_write_failed',
              requestId,
              method: 'GET',
              error: error instanceof Error ? error.message : 'unknown',
            });
          }

          return new Response(body, {
            status: result.queued ? 202 : 200,
            headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          });
        } catch {
          await recordCheckoutState({
            route,
            requestId,
            transactionId: eventId,
            state: 'checkout_success_failed',
            source: source ?? 'stripe-success',
            email,
            providerEventId: eventId,
            meta: { page, href, tier: tier ?? 'founder', method: 'GET' },
          });
          return new Response(JSON.stringify({ ok: false, error: 'Conversion storage unavailable.' }), {
            status: 503,
            headers: { 'content-type': 'application/json', 'x-request-id': requestId },
          });
        }
      },
    },
  },
})
