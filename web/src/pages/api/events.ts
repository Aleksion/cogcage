import type { APIRoute } from 'astro';
import { insertConversionEvent } from '../../lib/waitlist-db';
import { appendOpsLog } from '../../lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_RE = /^[a-z0-9_:-]{2,64}$/i;

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

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ ok: false, error: 'JSON body required.' }), {
      status: 415,
      headers: { 'content-type': 'application/json' },
    });
  }

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== 'object') {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const eventName = normalizeString((json as Record<string, unknown>).event);
  if (!EVENT_RE.test(eventName)) {
    return new Response(JSON.stringify({ ok: false, error: 'Valid event name is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const emailRaw = optionalString((json as Record<string, unknown>).email)?.toLowerCase();
  if (emailRaw && !EMAIL_RE.test(emailRaw)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rawMeta = (json as Record<string, unknown>).meta;
  const metaRecord = rawMeta && typeof rawMeta === 'object' ? (rawMeta as Record<string, unknown>) : undefined;
  let metaJson: string | undefined;
  if (rawMeta !== undefined) {
    try {
      metaJson = JSON.stringify(rawMeta);
    } catch {
      metaJson = JSON.stringify({ invalidMeta: true });
    }
  }

  const requestId = crypto.randomUUID();
  const payload = {
    eventName,
    eventId: optionalString((json as Record<string, unknown>).eventId) ?? optionalString(metaRecord?.eventId),
    page: optionalString((json as Record<string, unknown>).page),
    href: optionalString((json as Record<string, unknown>).href),
    tier: optionalString((json as Record<string, unknown>).tier),
    source: optionalString((json as Record<string, unknown>).source) ?? 'landing',
    email: emailRaw,
    metaJson,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress: getClientIp(request),
  };

  try {
    insertConversionEvent(payload);
    appendOpsLog({ route: '/api/events', level: 'info', event: 'conversion_event_saved', requestId, eventName, source: payload.source });
  } catch (error) {
    appendOpsLog({ route: '/api/events', level: 'error', event: 'conversion_event_db_write_failed', requestId, eventName, source: payload.source, error: error instanceof Error ? error.message : 'unknown-error' });
    return new Response(JSON.stringify({ ok: false, error: 'Event storage unavailable.', requestId }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, requestId }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
