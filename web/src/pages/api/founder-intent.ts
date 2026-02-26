import type { APIRoute } from 'astro';
import { insertFounderIntent } from '../../lib/waitlist-db';
import { appendOpsLog } from '../../lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
}

function normalize(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  let email = '';
  let source = '';

  if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({}));
    email = normalize(json.email ?? null);
    source = normalize(json.source ?? null);
  } else {
    const formData = await request.formData();
    email = normalize(formData.get('email'));
    source = normalize(formData.get('source'));
  }

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'Valid email is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const requestId = crypto.randomUUID();
  const payload = {
    email: email.toLowerCase(),
    source: source || 'founder-checkout',
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress: getClientIp(request),
  };

  try {
    insertFounderIntent(payload);
    appendOpsLog({ route: '/api/founder-intent', level: 'info', event: 'founder_intent_saved', requestId, source: payload.source, emailHash: payload.email.slice(0, 3) });
  } catch (error) {
    appendOpsLog({ route: '/api/founder-intent', level: 'error', event: 'founder_intent_db_write_failed', requestId, error: error instanceof Error ? error.message : 'unknown-error' });
    return new Response(JSON.stringify({ ok: false, error: 'Temporary storage issue. Please retry.', requestId }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, requestId }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
