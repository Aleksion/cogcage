import { createFileRoute } from '@tanstack/react-router'
import { insertConversionEvent, upsertFounderEntitlement } from '~/lib/waitlist-db'
import { appendEventsFallback, appendOpsLog } from '~/lib/observability'
import { redisInsertConversionEvent, redisUpsertFounderEntitlement } from '~/lib/waitlist-redis'

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
}: {
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
  const requestId = crypto.randomUUID();
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
  const entitlementPayload = email ? {
    email,
    entitlementState: 'active' as const,
    source: payload.source,
    eventId: payload.eventId,
    provider: 'checkout-success',
    metaJson: payload.metaJson,
    userAgent,
    ipAddress,
  } : null;

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
    if (entitlementPayload) {
      try {
        await redisUpsertFounderEntitlement(entitlementPayload);
        try {
          upsertFounderEntitlement(entitlementPayload);
        } catch (sqliteError) {
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'warn',
            event: 'checkout_success_sqlite_entitlement_write_failed',
            requestId,
            source: payload.source,
            eventId: payload.eventId,
            error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
          });
        }
      } catch (redisEntitlementError) {
        appendOpsLog({
          route: '/api/checkout-success',
          level: 'warn',
          event: 'checkout_success_redis_entitlement_write_failed',
          requestId,
          source: payload.source,
          eventId: payload.eventId,
          error: redisEntitlementError instanceof Error ? redisEntitlementError.message : 'unknown',
        });
        try {
          upsertFounderEntitlement(entitlementPayload);
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'warn',
            event: 'checkout_success_entitlement_saved_sqlite_fallback',
            requestId,
            source: payload.source,
            eventId: payload.eventId,
          });
        } catch (sqliteEntitlementError) {
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'error',
            event: 'checkout_success_entitlement_sqlite_fallback_failed',
            requestId,
            source: payload.source,
            eventId: payload.eventId,
            error: sqliteEntitlementError instanceof Error ? sqliteEntitlementError.message : 'unknown',
          });
        }
      }
    }
    appendOpsLog({
      route: '/api/checkout-success',
      level: 'info',
      event: 'paid_conversion_confirmed',
      requestId,
      source: payload.source,
      eventId: payload.eventId,
      entitlementUpdated: Boolean(entitlementPayload),
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
      if (entitlementPayload) {
        try {
          upsertFounderEntitlement(entitlementPayload);
        } catch (sqliteEntitlementError) {
          appendOpsLog({
            route: '/api/checkout-success',
            level: 'warn',
            event: 'checkout_success_sqlite_entitlement_write_failed',
            requestId,
            source: payload.source,
            eventId: payload.eventId,
            error: sqliteEntitlementError instanceof Error ? sqliteEntitlementError.message : 'unknown',
          });
        }
      }
      appendOpsLog({
        route: '/api/checkout-success',
        level: 'warn',
        event: 'paid_conversion_saved_sqlite_fallback',
        requestId,
        source: payload.source,
        eventId: payload.eventId,
        entitlementUpdated: Boolean(entitlementPayload),
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
        appendOpsLog({
          route: '/api/checkout-success',
          level: 'info',
          event: 'checkout_success_received',
          requestId,
          method: 'POST',
          contentType,
        });
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
            route: '/api/checkout-success',
            level: 'warn',
            event: 'checkout_success_invalid_email',
            requestId,
            method: 'POST',
          });
          return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
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
          });

          return new Response(JSON.stringify({
            ok: true,
            requestId: result.requestId,
            queued: result.queued || undefined,
            degraded: result.degraded || undefined,
          }), {
            status: result.queued ? 202 : 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false, error: 'Conversion storage unavailable.' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
      GET: async ({ request }) => {
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
          });

          return new Response(JSON.stringify({
            ok: true,
            requestId: result.requestId,
            queued: result.queued || undefined,
            degraded: result.degraded || undefined,
          }), {
            status: result.queued ? 202 : 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false, error: 'Conversion storage unavailable.' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
})
