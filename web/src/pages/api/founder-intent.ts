import type { APIRoute } from 'astro';
import { insertFounderIntent } from '../../lib/waitlist-db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
}

function normalize(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

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

  insertFounderIntent({
    email: email.toLowerCase(),
    source: source || 'founder-checkout',
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress: getClientIp(request),
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
