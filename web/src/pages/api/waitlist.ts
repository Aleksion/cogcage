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

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
  const rateLimit = consumeRateLimit(ipAddress, 'waitlist', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_rate_limited', ipAddress });
    insertConversionEvent({
      eventName: 'waitlist_rate_limited',
      source: source || 'cogcage-landing',
      email: email ? email.toLowerCase() : undefined,
      metaJson: JSON.stringify({ resetMs: rateLimit.resetMs }),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return new Response(JSON.stringify({ ok: false, error: 'Too many attempts. Try again in a few minutes.' }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(Math.ceil(rateLimit.resetMs / 1000)),
      },
    });
  }

  if (honeypot) {
    appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_honeypot_blocked', ipAddress });
    insertConversionEvent({
      eventName: 'waitlist_honeypot_blocked',
      source: source || 'cogcage-landing',
      email: email ? email.toLowerCase() : undefined,
      metaJson: JSON.stringify({ honeypot }),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return new Response(JSON.stringify({ ok: false, error: 'Submission blocked.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!EMAIL_RE.test(email)) {
    appendOpsLog({ route: '/api/waitlist', level: 'warn', event: 'waitlist_invalid_email', ipAddress });
    insertConversionEvent({
      eventName: 'waitlist_invalid_email',
      source: source || 'cogcage-landing',
      email: email ? email.toLowerCase() : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return new Response(JSON.stringify({ ok: false, error: 'Valid email is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (game.length < 2) {
    game = 'Unspecified';
  }

  const normalizedEmail = email.toLowerCase();
  const requestId = crypto.randomUUID();
  const payload = {
    email: normalizedEmail,
    game,
    source: source || 'cogcage-landing',
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress,
  };

  try {
    insertWaitlistLead(payload);
    appendOpsLog({ route: '/api/waitlist', level: 'info', event: 'waitlist_saved', requestId, source: payload.source, emailHash: normalizedEmail.slice(0, 3) });
    insertConversionEvent({
      eventName: 'waitlist_submitted',
      source: payload.source,
      email: normalizedEmail,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
  } catch (error) {
    appendOpsLog({ route: '/api/waitlist', level: 'error', event: 'waitlist_db_write_failed', requestId, error: error instanceof Error ? error.message : 'unknown-error' });
    appendWaitlistFallback({ route: '/api/waitlist', requestId, ...payload });
    insertConversionEvent({
      eventName: 'waitlist_insert_failed',
      source: payload.source,
      email: normalizedEmail,
      metaJson: JSON.stringify({ error: error instanceof Error ? error.message : 'unknown' }),
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress,
    });
    return new Response(JSON.stringify({ ok: false, error: 'Temporary storage issue. Please retry in 1 minute.', requestId }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, requestId }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
