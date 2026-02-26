import type { APIRoute } from 'astro';
import { consumeRateLimit, insertConversionEvent, insertFounderIntent, type ConversionEvent } from '../../lib/waitlist-db';
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '../../lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HONEYPOT_FIELDS = ['company', 'website', 'nickname'];
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const flyIp = request.headers.get('fly-client-ip')?.trim();
  return forwarded || realIp || cfIp || flyIp || undefined;
}

function getRateLimitKey(request: Request) {
  const ip = getClientIp(request);
  if (ip) return ip;
  const ua = request.headers.get('user-agent') ?? 'unknown-ua';
  const lang = request.headers.get('accept-language') ?? 'unknown-lang';
  return `anon:${ua.slice(0, 80)}:${lang.slice(0, 40)}`;
}

function normalize(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonResponse(body: Record<string, unknown>, status: number, requestId: string, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ ...body, requestId }), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      ...extraHeaders,
    },
  });
}

function safeTrackConversion(route: string, requestId: string, event: ConversionEvent) {
  try {
    insertConversionEvent(event);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({ route, level: 'error', event: 'conversion_event_write_failed', requestId, conversionEventName: event.eventName, error: errorMessage });
    try {
      appendEventsFallback({ route, requestId, ...event, reason: errorMessage });
    } catch {
      // Never break request flow because telemetry fallback failed.
    }
  }
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const contentType = request.headers.get('content-type') ?? '';
  let email = '';
  let source = '';
  let intentId = '';
  let honeypot = '';

  if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({}));
    email = normalizeString(json.email ?? null);
    source = normalizeString(json.source ?? null);
    intentId = normalizeString(json.intentId ?? json.intent_id ?? null);
    honeypot = normalizeString(
      HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== undefined) ?? ''
    );
  } else {
    const formData = await request.formData();
    email = normalize(formData.get('email'));
    source = normalize(formData.get('source'));
    intentId = normalize(formData.get('intentId')) || normalize(formData.get('intent_id'));
    for (const field of HONEYPOT_FIELDS) {
      const value = normalize(formData.get(field));
      if (value) {
        honeypot = value;
        break;
      }
    }
  }

  const ipAddress = getClientIp(request);
  const rateLimitKey = getRateLimitKey(request);
  const normalizedEmail = email.toLowerCase();
  const eventSource = source || 'founder-checkout';

  let rateLimit = { allowed: true, remaining: RATE_LIMIT_MAX, resetMs: 0 };
  try {
    rateLimit = consumeRateLimit(rateLimitKey, 'founder-intent', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  } catch (error) {
    appendOpsLog({
      route: '/api/founder-intent',
      level: 'warn',
      event: 'founder_intent_rate_limit_failed',
      requestId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  if (!rateLimit.allowed) {
    appendOpsLog({ route: '/api/founder-intent', level: 'warn', event: 'founder_intent_rate_limited', requestId, ipAddress, durationMs: Date.now() - startedAt });
    safeTrackConversion('/api/founder-intent', requestId, {
      eventName: 'founder_intent_rate_limited',
      source: eventSource,
      email: normalizedEmail || undefined,
      metaJson: JSON.stringify({ resetMs: rateLimit.resetMs }),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: false, error: 'Too many attempts. Try again in a few minutes.' }, 429, requestId, {
      'retry-after': String(Math.ceil(rateLimit.resetMs / 1000)),
    });
  }

  if (honeypot) {
    appendOpsLog({ route: '/api/founder-intent', level: 'warn', event: 'founder_intent_honeypot_blocked', requestId, ipAddress, durationMs: Date.now() - startedAt });
    safeTrackConversion('/api/founder-intent', requestId, {
      eventName: 'founder_intent_honeypot_blocked',
      source: eventSource,
      email: normalizedEmail || undefined,
      metaJson: JSON.stringify({ honeypot }),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: false, error: 'Submission blocked.' }, 400, requestId);
  }

  if (!EMAIL_RE.test(email)) {
    appendOpsLog({ route: '/api/founder-intent', level: 'warn', event: 'founder_intent_invalid_email', requestId, ipAddress, durationMs: Date.now() - startedAt });
    safeTrackConversion('/api/founder-intent', requestId, {
      eventName: 'founder_intent_invalid_email',
      source: eventSource,
      email: normalizedEmail || undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: false, error: 'Valid email is required.' }, 400, requestId);
  }

  const payload = {
    email: normalizedEmail,
    source: eventSource,
    intentId: intentId || undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress,
  };

  try {
    insertFounderIntent(payload);
    appendOpsLog({ route: '/api/founder-intent', level: 'info', event: 'founder_intent_saved', requestId, source: payload.source, emailHash: payload.email.slice(0, 3), durationMs: Date.now() - startedAt });
    safeTrackConversion('/api/founder-intent', requestId, {
      eventName: 'founder_intent_submitted',
      source: payload.source,
      email: payload.email,
      metaJson: payload.intentId ? JSON.stringify({ intentId: payload.intentId }) : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: true }, 200, requestId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({ route: '/api/founder-intent', level: 'error', event: 'founder_intent_db_write_failed', requestId, error: errorMessage, durationMs: Date.now() - startedAt });

    try {
      appendFounderIntentFallback({ route: '/api/founder-intent', requestId, ...payload, reason: errorMessage });
      safeTrackConversion('/api/founder-intent', requestId, {
        eventName: 'founder_intent_queued_fallback',
        source: payload.source,
        email: payload.email,
        metaJson: JSON.stringify({ error: errorMessage }),
        userAgent: request.headers.get('user-agent') ?? undefined,
        ipAddress,
      });
      appendOpsLog({ route: '/api/founder-intent', level: 'warn', event: 'founder_intent_saved_to_fallback', requestId, durationMs: Date.now() - startedAt });
      return jsonResponse({ ok: true, queued: true }, 202, requestId);
    } catch (fallbackError) {
      appendOpsLog({ route: '/api/founder-intent', level: 'error', event: 'founder_intent_fallback_write_failed', requestId, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
      safeTrackConversion('/api/founder-intent', requestId, {
        eventName: 'founder_intent_insert_failed',
        source: payload.source,
        email: payload.email,
        metaJson: JSON.stringify({ error: errorMessage }),
        userAgent: request.headers.get('user-agent') ?? undefined,
        ipAddress,
      });
      return jsonResponse({ ok: false, error: 'Temporary storage issue. Please retry.' }, 503, requestId);
    }
  }
};
