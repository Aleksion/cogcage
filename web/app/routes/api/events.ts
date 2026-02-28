import { createFileRoute } from '@tanstack/react-router'
import { insertConversionEvent } from '~/lib/waitlist-db'
import { appendEventsFallback, appendOpsLog } from '~/lib/observability'
import { redisInsertConversionEvent } from '~/lib/waitlist-redis'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_RE = /^[a-z0-9_:-]{2,64}$/i;

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

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';

        let json: Record<string, unknown> | null = null;
        try {
          if (contentType.includes('application/json')) {
            const parsed = await request.json();
            json = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
          } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const payload: Record<string, unknown> = {};
            formData.forEach((value, key) => {
              payload[key] = typeof value === 'string' ? value : value.name;
            });
            json = payload;
          } else {
            const rawBody = await request.text();
            if (rawBody.trim().startsWith('{')) {
              const parsed = JSON.parse(rawBody) as Record<string, unknown>;
              json = parsed && typeof parsed === 'object' ? parsed : null;
            } else {
              const params = new URLSearchParams(rawBody);
              const payload: Record<string, unknown> = {};
              params.forEach((value, key) => {
                payload[key] = value;
              });
              json = payload;
            }
          }
        } catch {
          json = null;
        }

        if (!json || typeof json !== 'object') {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid request payload.', requestId }), {
            status: 400,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          });
        }

        const eventName = normalizeString((json as Record<string, unknown>).event, 64);
        if (!EVENT_RE.test(eventName)) {
          return new Response(JSON.stringify({ ok: false, error: 'Valid event name is required.', requestId }), {
            status: 400,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          });
        }

        const emailRaw = optionalString((json as Record<string, unknown>).email)?.toLowerCase();
        if (emailRaw && !EMAIL_RE.test(emailRaw)) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.', requestId }), {
            status: 400,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          });
        }

        const rawMeta = (json as Record<string, unknown>).meta;
        const metaRecord = rawMeta && typeof rawMeta === 'object' ? (rawMeta as Record<string, unknown>) : undefined;
        let metaJson: string | undefined;
        if (rawMeta !== undefined) {
          try {
            const serialized = JSON.stringify(rawMeta);
            metaJson = serialized.length > 4000
              ? JSON.stringify({ truncated: true, preview: serialized.slice(0, 3800) })
              : serialized;
          } catch {
            metaJson = JSON.stringify({ invalidMeta: true });
          }
        }

        const payload = {
          eventName,
          eventId: optionalString((json as Record<string, unknown>).eventId, 160) ?? optionalString(metaRecord?.eventId, 160),
          page: optionalString((json as Record<string, unknown>).page, 120),
          href: optionalString((json as Record<string, unknown>).href, 600),
          tier: optionalString((json as Record<string, unknown>).tier, 60),
          source: optionalString((json as Record<string, unknown>).source, 120) ?? 'landing',
          email: emailRaw,
          metaJson,
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
        };

        try {
          // Redis is the primary storage on Vercel — durable across Lambda invocations
          await redisInsertConversionEvent(payload);

          // SQLite is best-effort secondary — useful locally, ephemeral on Vercel
          try {
            insertConversionEvent(payload);
          } catch (sqliteError) {
            appendOpsLog({ route: '/api/events', level: 'warn', event: 'conversion_event_sqlite_write_failed', requestId, eventName, source: payload.source, error: sqliteError instanceof Error ? sqliteError.message : 'unknown' });
            // Never throw — Redis already succeeded
          }

          appendOpsLog({ route: '/api/events', level: 'info', event: 'conversion_event_saved', requestId, eventName, source: payload.source, durationMs: Date.now() - startedAt });
          return new Response(JSON.stringify({ ok: true, requestId }), {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          });
        } catch (error) {
          // Redis failed — try file fallback
          const errorMessage = error instanceof Error ? error.message : 'unknown-error';
          appendOpsLog({ route: '/api/events', level: 'error', event: 'conversion_event_redis_write_failed', requestId, eventName, source: payload.source, error: errorMessage, durationMs: Date.now() - startedAt });

          try {
            appendEventsFallback({ route: '/api/events', requestId, ...payload, reason: errorMessage });
            appendOpsLog({ route: '/api/events', level: 'warn', event: 'conversion_event_saved_to_fallback', requestId, eventName, source: payload.source, durationMs: Date.now() - startedAt });
            return new Response(JSON.stringify({ ok: true, queued: true, requestId }), {
              status: 202,
              headers: {
                'content-type': 'application/json',
                'x-request-id': requestId,
              },
            });
          } catch (fallbackError) {
            appendOpsLog({ route: '/api/events', level: 'error', event: 'conversion_event_fallback_write_failed', requestId, eventName, source: payload.source, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
            return new Response(JSON.stringify({ ok: false, error: 'Event storage unavailable.', requestId }), {
              status: 503,
              headers: {
                'content-type': 'application/json',
                'x-request-id': requestId,
              },
            });
          }
        }
      },
    },
  },
})
