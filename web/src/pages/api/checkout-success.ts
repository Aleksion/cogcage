import type { APIRoute } from 'astro';
import { insertConversionEvent } from '../../lib/waitlist-db';
import { appendEventsFallback, appendOpsLog } from '../../lib/observability';

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

export const prerender = false;

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

const recordSuccess = ({ 
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
    insertConversionEvent(payload);
    appendOpsLog({ route: '/api/checkout-success', level: 'info', event: 'paid_conversion_confirmed', requestId, source: payload.source, eventId: payload.eventId, durationMs: Date.now() - startedAt });
    return { requestId, queued: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({ route: '/api/checkout-success', level: 'error', event: 'paid_conversion_db_write_failed', requestId, source: payload.source, eventId: payload.eventId, error: errorMessage, durationMs: Date.now() - startedAt });

    try {
      appendEventsFallback({ route: '/api/checkout-success', requestId, ...payload, reason: errorMessage });
      appendOpsLog({ route: '/api/checkout-success', level: 'warn', event: 'paid_conversion_saved_to_fallback', requestId, source: payload.source, eventId: payload.eventId, durationMs: Date.now() - startedAt });
      return { requestId, queued: true };
    } catch (fallbackError) {
      appendOpsLog({ route: '/api/checkout-success', level: 'error', event: 'paid_conversion_fallback_write_failed', requestId, source: payload.source, eventId: payload.eventId, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
      throw error;
    }
  }
};

export const POST: APIRoute = async ({ request }) => {
  const requestId = crypto.randomUUID();
  const contentType = request.headers.get('content-type') ?? '';
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
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.', requestId }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId },
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
    const result = recordSuccess({
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

    return new Response(JSON.stringify({ ok: true, requestId: result.requestId, queued: result.queued || undefined }), {
      status: result.queued ? 202 : 200,
      headers: { 'content-type': 'application/json', 'x-request-id': result.requestId },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Conversion storage unavailable.', requestId }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId },
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const email = optionalString(url.searchParams.get('email'));
  if (email && !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.', requestId }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId },
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
    const result = recordSuccess({
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

    return new Response(JSON.stringify({ ok: true, requestId: result.requestId, queued: result.queued || undefined }), {
      status: result.queued ? 202 : 200,
      headers: { 'content-type': 'application/json', 'x-request-id': result.requestId },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Conversion storage unavailable.', requestId }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId },
    });
  }
};
