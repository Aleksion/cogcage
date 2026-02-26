import type { APIRoute } from 'astro';
import { insertConversionEvent } from '../../lib/waitlist-db';
import { appendOpsLog } from '../../lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
}

export const prerender = false;

const recordSuccess = ({
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
    metaJson: meta ? JSON.stringify(meta) : undefined,
    userAgent,
    ipAddress,
  };

  insertConversionEvent(payload);
  appendOpsLog({ route: '/api/checkout-success', level: 'info', event: 'paid_conversion_confirmed', requestId, source: payload.source, eventId: payload.eventId });
  return requestId;
};

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  let payload: Record<string, unknown> = {};

  if (contentType.includes('application/json')) {
    payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    formData.forEach((value, key) => {
      payload[key] = value;
    });
  }

  const email = optionalString(payload.email);
  if (email && !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const eventId =
    optionalString(payload.eventId)
    ?? optionalString(payload.session_id)
    ?? optionalString(payload.checkout_session_id);
  const page = optionalString(payload.page);
  const href = optionalString(payload.href);
  const source = optionalString(payload.source);
  const tier = optionalString(payload.tier);
  const meta = payload.meta && typeof payload.meta === 'object' ? (payload.meta as Record<string, unknown>) : undefined;

  const requestId = recordSuccess({
    eventId,
    page,
    href,
    tier,
    source,
    email,
    meta,
    request,
  });

  return new Response(JSON.stringify({ ok: true, requestId }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const email = optionalString(url.searchParams.get('email'));
  if (email && !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const eventId =
    optionalString(url.searchParams.get('event_id'))
    ?? optionalString(url.searchParams.get('session_id'))
    ?? optionalString(url.searchParams.get('checkout_session_id'));
  const page = optionalString(url.searchParams.get('page')) ?? url.pathname;
  const href = optionalString(url.searchParams.get('href')) ?? request.url;
  const source = optionalString(url.searchParams.get('source'));
  const tier = optionalString(url.searchParams.get('tier'));

  const requestId = recordSuccess({
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

  return new Response(JSON.stringify({ ok: true, requestId }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
