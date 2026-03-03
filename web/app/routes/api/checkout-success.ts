import { createFileRoute } from '@tanstack/react-router'
import {
  insertConversionEvent,
  readApiRequestReceipt,
  writeApiRequestReceipt,
} from '~/lib/waitlist-db'
import { appendEventsFallback, appendOpsLog } from '~/lib/observability'
import {
  redisInsertConversionEvent,
  redisReadApiRequestReceipt,
  redisWriteApiRequestReceipt,
} from '~/lib/waitlist-redis'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type CheckoutOutcome =
  | 'recorded'
  | 'recorded_degraded'
  | 'queued_fallback'
  | 'payload_invalid'
  | 'invalid_email'
  | 'idempotent_replay'
  | 'failed'
  | 'unknown';

function getIdempotencyKey(request: Request) {
  const key = request.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!key) return undefined;
  return key.slice(0, 120);
}

function asCheckoutContract(
  body: Record<string, unknown>,
  outcome: CheckoutOutcome,
  storage: string,
  replayed = false,
) {
  const queued = body.queued === true || outcome === 'queued_fallback';
  const degraded = body.degraded === true || outcome === 'recorded_degraded' || outcome === 'queued_fallback';
  return {
    ...body,
    ok: body.ok === true,
    status: outcome,
    storage,
    queued,
    degraded,
    replayed,
  };
}

function parseReplayBody(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // fall through
  }
  return { ok: true };
}

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

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function deriveFallbackEventId({ source, email, href, page, tier }: { source?: string; email?: string; href?: string; page?: string; tier?: string }) {
  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = `${source || 'stripe-success'}|${email || 'anon'}|${href || ''}|${page || ''}|${tier || 'founder'}|${day}`;
  return `checkout-success:${day}:${hashString(fingerprint)}`;
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
  eventId,
  page,
  href,
  tier,
  source,
  email,
  meta,
  request,
  requestId,
}: {
  eventId?: string;
  page?: string;
  href?: string;
  tier?: string;
  source?: string;
  email?: string;
  meta?: Record<string, unknown>;
  request: Request;
  requestId: string;
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
    return { queued: false, degraded: false, storage: 'redis' as const };
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
      return { queued: false, degraded: true, storage: 'sqlite' as const };
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
        return { queued: true, degraded: true, storage: 'fallback-file' as const };
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
        const route = '/api/checkout-success';
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';
        const headerIdempotencyKey = getIdempotencyKey(request);
        appendOpsLog({
          route,
          level: 'info',
          event: 'checkout_success_received',
          requestId,
          method: 'POST',
          contentType,
        });

        const respond = async (
          body: Record<string, unknown>,
          status: number,
          outcome: CheckoutOutcome,
          detail: Record<string, unknown> = {},
          idempotencyKey?: string,
          extraHeaders: Record<string, string> = {},
        ) => {
          const storage =
            (typeof detail.storage === 'string' && detail.storage)
            || (typeof body.storage === 'string' && body.storage)
            || 'none';
          const replayed = detail.replayed === true || body.replayed === true || outcome === 'idempotent_replay';
          const responseBody = asCheckoutContract(body, outcome, storage, replayed);

          appendOpsLog({
            route,
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            event: 'checkout_success_request_completed',
            requestId,
            httpStatus: status,
            outcome,
            storage,
            durationMs: Date.now() - startedAt,
            ...detail,
          });

          if (idempotencyKey) {
            const receipt = {
              route,
              idempotencyKey,
              responseStatus: status,
              responseBody: JSON.stringify({ ...responseBody, requestId }),
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

          return new Response(JSON.stringify({ ...responseBody, requestId }), {
            status,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
              ...extraHeaders,
            },
          });
        };

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
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'checkout_success_payload_parse_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          });
          return respond({ ok: false, error: 'Invalid request payload.' }, 400, 'payload_invalid', { storage: 'none' }, headerIdempotencyKey);
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
          return respond({ ok: false, error: 'Invalid email format.' }, 400, 'invalid_email', { storage: 'none' }, headerIdempotencyKey);
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
        const idempotencyKey = (headerIdempotencyKey || `event:${eventId}`).slice(0, 120);

        try {
          const cached = await redisReadApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'checkout_success_idempotency_replay',
              requestId,
              idempotencyStore: 'redis',
              eventId,
            });
            const replayBody = asCheckoutContract(parseReplayBody(cached.responseBody), 'idempotent_replay', 'idempotency-replay:redis', true);
            return respond(
              replayBody,
              cached.responseStatus,
              'idempotent_replay',
              { storage: 'idempotency-replay:redis', replayed: true, idempotencyStore: 'redis', eventId },
              idempotencyKey,
              { 'x-idempotent-replay': '1' },
            );
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
          const cached = readApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'checkout_success_idempotency_replay',
              requestId,
              idempotencyStore: 'sqlite',
              eventId,
            });
            const replayBody = asCheckoutContract(parseReplayBody(cached.responseBody), 'idempotent_replay', 'idempotency-replay:sqlite', true);
            return respond(
              replayBody,
              cached.responseStatus,
              'idempotent_replay',
              { storage: 'idempotency-replay:sqlite', replayed: true, idempotencyStore: 'sqlite', eventId },
              idempotencyKey,
              { 'x-idempotent-replay': '1' },
            );
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

        try {
          const result = await recordSuccess({
            eventId,
            page,
            href,
            tier,
            source,
            email,
            meta,
            request,
            requestId,
          });
          const outcome: CheckoutOutcome = result.queued ? 'queued_fallback' : result.degraded ? 'recorded_degraded' : 'recorded';
          return respond(
            { ok: true, eventId, queued: result.queued || undefined, degraded: result.degraded || undefined },
            result.queued ? 202 : 200,
            outcome,
            { storage: result.storage, eventId, source: source || 'stripe-success' },
            idempotencyKey,
          );
        } catch (error) {
          appendOpsLog({
            route,
            level: 'error',
            event: 'checkout_success_processing_failed',
            requestId,
            eventId,
            error: error instanceof Error ? error.message : 'unknown',
          });
          return respond({ ok: false, error: 'Conversion storage unavailable.' }, 503, 'failed', { storage: 'none', eventId }, idempotencyKey);
        }
      },
      GET: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const url = new URL(request.url);
        appendOpsLog({
          route: '/api/checkout-success',
          level: 'info',
          event: 'checkout_success_received',
          requestId,
          method: 'GET',
          sessionId: url.searchParams.get('session_id') ?? url.searchParams.get('checkout_session_id') ?? undefined,
        });
        const email = optionalString(url.searchParams.get('email'));
        if (email && !EMAIL_RE.test(email)) {
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'warn',
            event: 'checkout_success_invalid_email',
            requestId,
            method: 'GET',
          });
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'warn',
            event: 'checkout_success_request_completed',
            requestId,
            method: 'GET',
            httpStatus: 400,
            outcome: 'invalid_email',
            storage: 'none',
            durationMs: Date.now() - startedAt,
          });
          return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        const eventId =
          optionalString(url.searchParams.get('event_id'), 180)
          ?? optionalString(url.searchParams.get('session_id'), 180)
          ?? optionalString(url.searchParams.get('checkout_session_id'), 180);
        const page = optionalString(url.searchParams.get('page'), 120) ?? url.pathname;
        const href = optionalString(url.searchParams.get('href'), 600) ?? request.url;
        const source = optionalString(url.searchParams.get('source'), 120);
        const tier = optionalString(url.searchParams.get('tier'), 60);

        try {
          const result = await recordSuccess({
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
            requestId,
          });

          const outcome: CheckoutOutcome = result.queued ? 'queued_fallback' : result.degraded ? 'recorded_degraded' : 'recorded';
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'info',
            event: 'checkout_success_request_completed',
            requestId,
            method: 'GET',
            httpStatus: result.queued ? 202 : 200,
            outcome,
            storage: result.storage,
            eventId,
            durationMs: Date.now() - startedAt,
          });

          return new Response(JSON.stringify({
            ok: true,
            requestId,
            queued: result.queued || undefined,
            degraded: result.degraded || undefined,
          }), {
            status: result.queued ? 202 : 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (error) {
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'error',
            event: 'checkout_success_request_completed',
            requestId,
            method: 'GET',
            httpStatus: 503,
            outcome: 'failed',
            storage: 'none',
            eventId,
            error: error instanceof Error ? error.message : 'unknown',
            durationMs: Date.now() - startedAt,
          });
          return new Response(JSON.stringify({ ok: false, error: 'Conversion storage unavailable.' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
})
