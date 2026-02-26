import type { APIRoute } from 'astro';
import {
  consumeRateLimit,
  insertConversionEvent,
  insertFounderIntent,
  readApiRequestReceipt,
  writeApiRequestReceipt,
  type ConversionEvent,
} from '../../lib/waitlist-db';
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '../../lib/observability';
import { drainFallbackQueues } from '../../lib/fallback-drain';

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

function normalizeFormValue(value: FormDataEntryValue | null, maxLen = 300) {
  return normalize(value).slice(0, maxLen);
}

function normalizeString(value: unknown, maxLen = 300) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized.slice(0, maxLen);
}

function getIdempotencyKey(request: Request) {
  const key = request.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!key) return undefined;
  return key.slice(0, 120);
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
  const route = '/api/founder-intent';
  const idempotencyKey = getIdempotencyKey(request);
  let email = '';
  let source = '';
  let intentId = '';
  let honeypot = '';

  const respond = (body: Record<string, unknown>, status: number, extraHeaders: Record<string, string> = {}) => {
    if (idempotencyKey) {
      try {
        writeApiRequestReceipt({
          route,
          idempotencyKey,
          responseStatus: status,
          responseBody: JSON.stringify({ ...body, requestId }),
        });
      } catch (error) {
        appendOpsLog({
          route,
          level: 'warn',
          event: 'founder_intent_idempotency_write_failed',
          requestId,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    return jsonResponse(body, status, requestId, extraHeaders);
  };

  if (idempotencyKey) {
    try {
      const cached = readApiRequestReceipt(route, idempotencyKey);
      if (cached) {
        appendOpsLog({ route, level: 'info', event: 'founder_intent_idempotency_replay', requestId, durationMs: Date.now() - startedAt });
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
        event: 'founder_intent_idempotency_read_failed',
        requestId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  try {
    if (contentType.includes('application/json')) {
      const json = await request.json().catch(() => ({}));
      email = normalizeString(json.email ?? null, 180);
      source = normalizeString(json.source ?? null, 120);
      intentId = normalizeString(json.intentId ?? json.intent_id ?? null, 180);
      honeypot = normalizeString(
        HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== undefined) ?? '',
        120
      );
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      email = normalizeFormValue(formData.get('email'), 180);
      source = normalizeFormValue(formData.get('source'), 120);
      intentId = normalizeFormValue(formData.get('intentId'), 180) || normalizeFormValue(formData.get('intent_id'), 180);
      for (const field of HONEYPOT_FIELDS) {
        const value = normalizeFormValue(formData.get(field), 120);
        if (value) {
          honeypot = value;
          break;
        }
      }
    } else {
      // Content-Type can be missing/misconfigured from edge clients; recover by sniffing body.
      const rawBody = await request.text();
      if (rawBody.trim().startsWith('{')) {
        const json = JSON.parse(rawBody) as Record<string, unknown>;
        email = normalizeString(json.email ?? null, 180);
        source = normalizeString(json.source ?? null, 120);
        intentId = normalizeString(json.intentId ?? json.intent_id ?? null, 180);
        honeypot = normalizeString(
          HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== undefined) ?? '',
          120
        );
      } else {
        const params = new URLSearchParams(rawBody);
        email = normalizeString(params.get('email'), 180);
        source = normalizeString(params.get('source'), 120);
        intentId = normalizeString(params.get('intentId') || params.get('intent_id'), 180);
        for (const field of HONEYPOT_FIELDS) {
          const value = normalizeString(params.get(field), 120);
          if (value) {
            honeypot = value;
            break;
          }
        }
      }
    }
  } catch (error) {
    appendOpsLog({
      route: '/api/founder-intent',
      level: 'warn',
      event: 'founder_intent_payload_parse_failed',
      requestId,
      contentType,
      error: error instanceof Error ? error.message : 'unknown',
      durationMs: Date.now() - startedAt,
    });
    safeTrackConversion('/api/founder-intent', requestId, {
      eventName: 'founder_intent_payload_parse_failed',
      source: 'founder-checkout',
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress: getClientIp(request),
      metaJson: JSON.stringify({ contentType }),
    });
    return respond({ ok: false, error: 'Invalid request payload.' }, 400);
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
    return respond({ ok: false, error: 'Too many attempts. Try again in a few minutes.' }, 429, {
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
    return respond({ ok: false, error: 'Submission blocked.' }, 400);
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
    return respond({ ok: false, error: 'Valid email is required.' }, 400);
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
    try {
      const drained = drainFallbackQueues(10);
      if ((drained.waitlist.inserted + drained.founder.inserted + drained.events.inserted) > 0) {
        appendOpsLog({ route: '/api/founder-intent', level: 'info', event: 'fallback_drain_after_founder_intent', requestId, drained });
      }
    } catch {
      // best-effort background healing only
    }
    safeTrackConversion('/api/founder-intent', requestId, {
      eventName: 'founder_intent_submitted',
      source: payload.source,
      email: payload.email,
      metaJson: payload.intentId ? JSON.stringify({ intentId: payload.intentId }) : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return respond({ ok: true }, 200);
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
      return respond({ ok: true, queued: true }, 202);
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
      return respond({ ok: false, error: 'Temporary storage issue. Please retry.' }, 503);
    }
  }
};
