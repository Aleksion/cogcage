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
        const route = '/api/events';
        const contentType = request.headers.get('content-type') ?? '';
        const respond = (
          body: Record<string, unknown>,
          status: number,
          storage: 'redis' | 'sqlite' | 'fallback' | 'none',
          extraHeaders: Record<string, string> = {},
        ) => {
          appendOpsLog({
            route,
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            event: 'conversion_event_response',
            requestId,
            status,
            storage,
            durationMs: Date.now() - startedAt,
          });
          return new Response(JSON.stringify({ ...body, requestId, storage }), {
            status,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
              'x-storage-mode': storage,
              ...extraHeaders,
            },
          });
        };

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
          appendOpsLog({ route, level: 'warn', event: 'conversion_event_payload_invalid', requestId, contentType, durationMs: Date.now() - startedAt });
          return respond({ ok: false, error: 'Invalid request payload.' }, 400, 'none');
        }

        const eventName = normalizeString((json as Record<string, unknown>).event, 64);
        if (!EVENT_RE.test(eventName)) {
          appendOpsLog({ route, level: 'warn', event: 'conversion_event_invalid_name', requestId, durationMs: Date.now() - startedAt });
          return respond({ ok: false, error: 'Valid event name is required.' }, 400, 'none');
        }

        const emailRaw = optionalString((json as Record<string, unknown>).email)?.toLowerCase();
        if (emailRaw && !EMAIL_RE.test(emailRaw)) {
          appendOpsLog({ route, level: 'warn', event: 'conversion_event_invalid_email', requestId, eventName, durationMs: Date.now() - startedAt });
          return respond({ ok: false, error: 'Invalid email format.' }, 400, 'none');
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

          appendOpsLog({ route, level: 'info', event: 'conversion_event_saved', requestId, eventName, source: payload.source, durationMs: Date.now() - startedAt });
          return respond({ ok: true }, 200, 'redis');
        } catch (error) {
          // Redis failed — try file fallback
          const errorMessage = error instanceof Error ? error.message : 'unknown-error';
          appendOpsLog({ route, level: 'error', event: 'conversion_event_redis_write_failed', requestId, eventName, source: payload.source, error: errorMessage, durationMs: Date.now() - startedAt });

          // Try SQLite directly when Redis is unavailable.
          try {
            insertConversionEvent(payload);
            appendOpsLog({
              route,
              level: 'warn',
              event: 'conversion_event_saved_sqlite_fallback',
              requestId,
              eventName,
              source: payload.source,
              durationMs: Date.now() - startedAt,
            });
            return respond({ ok: true, degraded: true }, 200, 'sqlite');
          } catch (sqliteError) {
            appendOpsLog({
              route,
              level: 'warn',
              event: 'conversion_event_sqlite_fallback_failed',
              requestId,
              eventName,
              source: payload.source,
              error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
            });
          }

          try {
            appendEventsFallback({ route, requestId, ...payload, reason: errorMessage });
            appendOpsLog({ route, level: 'warn', event: 'conversion_event_saved_to_fallback', requestId, eventName, source: payload.source, durationMs: Date.now() - startedAt });
            return respond({ ok: true, queued: true }, 202, 'fallback');
          } catch (fallbackError) {
            appendOpsLog({ route, level: 'error', event: 'conversion_event_fallback_write_failed', requestId, eventName, source: payload.source, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
            return respond({ ok: false, error: 'Event storage unavailable.' }, 503, 'none');
          }
        }
      },
    },
  },
})
