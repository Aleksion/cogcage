import type { APIRoute } from 'astro';
import { insertFounderIntent } from '../../lib/waitlist-db';
import { appendFounderIntentFallback, appendOpsLog } from '../../lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const flyIp = request.headers.get('fly-client-ip')?.trim();
  return forwarded || realIp || cfIp || flyIp || undefined;
}

function normalize(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const startedAt = Date.now();
  const contentType = request.headers.get('content-type') ?? '';
  let email = '';
  let source = '';
  let intentId = '';

  if (contentType.includes('application/json')) {
    const json = await request.json().catch(() => ({}));
    email = normalize(json.email ?? null);
    source = normalize(json.source ?? null);
    intentId = normalize(json.intentId ?? json.intent_id ?? null);
  } else {
    const formData = await request.formData();
    email = normalize(formData.get('email'));
    source = normalize(formData.get('source'));
    intentId = normalize(formData.get('intentId')) || normalize(formData.get('intent_id'));
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
    intentId: intentId || undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress: getClientIp(request),
  };

  try {
    insertFounderIntent(payload);
    appendOpsLog({ route: '/api/founder-intent', level: 'info', event: 'founder_intent_saved', requestId, source: payload.source, emailHash: payload.email.slice(0, 3), durationMs: Date.now() - startedAt });
    return new Response(JSON.stringify({ ok: true, requestId }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown-error';
    appendOpsLog({ route: '/api/founder-intent', level: 'error', event: 'founder_intent_db_write_failed', requestId, error: errorMessage, durationMs: Date.now() - startedAt });

    try {
      appendFounderIntentFallback({ route: '/api/founder-intent', requestId, ...payload, reason: errorMessage });
      appendOpsLog({ route: '/api/founder-intent', level: 'warn', event: 'founder_intent_saved_to_fallback', requestId, durationMs: Date.now() - startedAt });
      return new Response(JSON.stringify({ ok: true, queued: true, requestId }), {
        status: 202,
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
      });
    } catch (fallbackError) {
      appendOpsLog({ route: '/api/founder-intent', level: 'error', event: 'founder_intent_fallback_write_failed', requestId, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
      return new Response(JSON.stringify({ ok: false, error: 'Temporary storage issue. Please retry.', requestId }), {
        status: 503,
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
      });
    }
  }
};
