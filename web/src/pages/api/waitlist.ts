import type { APIRoute } from 'astro';
import { consumeRateLimit, insertConversionEvent, insertWaitlistLead } from '../../lib/waitlist-db';
import { appendOpsLog, appendWaitlistFallback } from '../../lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HONEYPOT_FIELDS = ['company', 'website', 'nickname'];
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
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

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const contentType = request.headers.get('content-type') ?? '';
  let email = '';
  let game = '';
  let source = '';
  let honeypot = '';

  if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({}));
    email = normalizeString(json.email ?? null);
    game = normalizeString(json.game ?? null);
    source = normalizeString(json.source ?? null);
    honeypot = normalizeString(
      HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== undefined) ?? ''
    );
  } else {
    const formData = await request.formData();
    email = normalize(formData.get('email'));
    game = normalize(formData.get('game'));
    source = normalize(formData.get('source'));
    for (const field of HONEYPOT_FIELDS) {
      const value = normalize(formData.get(field));
      if (value) {
        honeypot = value;
        break;
      }
    }
  }

  const ipAddress = getClientIp(request);
  const normalizedEmail = email.toLowerCase();
  const eventSource = source || 'cogcage-landing';

  const rateLimit = consumeRateLimit(ipAddress, 'waitlist', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_rate_limited', requestId, ipAddress, durationMs: Date.now() - startedAt });
    insertConversionEvent({
      eventName: 'waitlist_rate_limited',
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
    appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_honeypot_blocked', requestId, ipAddress, durationMs: Date.now() - startedAt });
    insertConversionEvent({
      eventName: 'waitlist_honeypot_blocked',
      source: eventSource,
      email: normalizedEmail || undefined,
      metaJson: JSON.stringify({ honeypot }),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: false, error: 'Submission blocked.' }, 400, requestId);
  }

  if (!EMAIL_RE.test(email)) {
    appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_invalid_email', requestId, ipAddress, durationMs: Date.now() - startedAt });
    insertConversionEvent({
      eventName: 'waitlist_invalid_email',
      source: eventSource,
      email: normalizedEmail || undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: false, error: 'Valid email is required.' }, 400, requestId);
  }

  const payload = {
    email: normalizedEmail,
    game: game.length < 2 ? 'Unspecified' : game,
    source: eventSource,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress,
  };

  try {
    insertWaitlistLead(payload);
    appendOpsLog({ route: '/api/waitlist', level: 'info', event: 'waitlist_saved', requestId, source: payload.source, emailHash: normalizedEmail.slice(0, 3), durationMs: Date.now() - startedAt });
    insertConversionEvent({
      eventName: 'waitlist_submitted',
      source: payload.source,
      email: normalizedEmail,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return jsonResponse({ ok: true }, 200, requestId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({ route: '/api/waitlist', level: 'error', event: 'waitlist_db_write_failed', requestId, error: errorMessage, durationMs: Date.now() - startedAt });

    try {
      appendWaitlistFallback({ route: '/api/waitlist', requestId, ...payload, reason: errorMessage });
      insertConversionEvent({
        eventName: 'waitlist_queued_fallback',
        source: payload.source,
        email: normalizedEmail,
        metaJson: JSON.stringify({ error: errorMessage }),
        userAgent: request.headers.get('user-agent') ?? undefined,
        ipAddress,
      });
      appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_saved_to_fallback', requestId, durationMs: Date.now() - startedAt });
      return jsonResponse({ ok: true, queued: true }, 202, requestId);
    } catch (fallbackError) {
      appendOpsLog({ route: '/api/waitlist', level: 'error', event: 'waitlist_fallback_write_failed', requestId, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
      insertConversionEvent({
        eventName: 'waitlist_insert_failed',
        source: payload.source,
        email: normalizedEmail,
        metaJson: JSON.stringify({ error: errorMessage }),
        userAgent: request.headers.get('user-agent') ?? undefined,
        ipAddress,
      });
      return jsonResponse({ ok: false, error: 'Temporary storage issue. Please retry in 1 minute.' }, 503, requestId);
    }
  }
};
