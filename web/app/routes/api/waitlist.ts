import { createFileRoute } from '@tanstack/react-router'
import {
  consumeRateLimit,
  insertConversionEvent,
  insertWaitlistLead,
  readApiRequestReceipt,
  writeApiRequestReceipt,
  type ConversionEvent,
} from '~/lib/waitlist-db'
import { appendEventsFallback, appendOpsLog, appendWaitlistFallback } from '~/lib/observability'
import { drainFallbackQueues } from '~/lib/fallback-drain'
import {
  redisInsertWaitlistLead,
  redisInsertConversionEvent,
  redisConsumeRateLimit,
  redisAppendOpsLog,
} from '~/lib/waitlist-redis'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HONEYPOT_FIELDS = ['company', 'website', 'nickname'];
const RATE_LIMIT_MAX = 6;
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
  // Fallback avoids global throttling when proxy IP headers are missing.
  return `anon:${ua.slice(0, 80)}:${lang.slice(0, 40)}`;
}

function getIdempotencyKey(request: Request) {
  const key = request.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!key) return undefined;
  // Keep bounded for storage safety and header abuse prevention.
  return key.slice(0, 120);
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

export const Route = createFileRoute('/api/waitlist')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';
        const route = '/api/waitlist';
        const idempotencyKey = getIdempotencyKey(request);
        let email = '';
        let game = '';
        let source = '';
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
                event: 'waitlist_idempotency_write_failed',
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
              appendOpsLog({ route, level: 'info', event: 'waitlist_idempotency_replay', requestId, durationMs: Date.now() - startedAt });
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
              event: 'waitlist_idempotency_read_failed',
              requestId,
              error: error instanceof Error ? error.message : 'unknown',
            });
          }
        }

        try {
          if (contentType.includes('application/json')) {
            const json = await request.json().catch(() => ({}));
            email = normalizeString(json.email ?? null, 180);
            game = normalizeString(json.game ?? null, 120);
            source = normalizeString(json.source ?? null, 120);
            honeypot = normalizeString(
              HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== undefined) ?? '',
              120
            );
          } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            email = normalizeFormValue(formData.get('email'), 180);
            game = normalizeFormValue(formData.get('game'), 120);
            source = normalizeFormValue(formData.get('source'), 120);
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
              game = normalizeString(json.game ?? null, 120);
              source = normalizeString(json.source ?? null, 120);
              honeypot = normalizeString(
                HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== undefined) ?? '',
                120
              );
            } else {
              const params = new URLSearchParams(rawBody);
              email = normalizeString(params.get('email'), 180);
              game = normalizeString(params.get('game'), 120);
              source = normalizeString(params.get('source'), 120);
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
            route: route,
            level: 'warn',
            event: 'waitlist_payload_parse_failed',
            requestId,
            contentType,
            error: error instanceof Error ? error.message : 'unknown',
            durationMs: Date.now() - startedAt,
          });
          safeTrackConversion(route, requestId, {
            eventName: 'waitlist_payload_parse_failed',
            source: 'moltpit-landing',
            userAgent: request.headers.get('user-agent') ?? undefined,
            ipAddress: getClientIp(request),
            metaJson: JSON.stringify({ contentType }),
          });
          return respond({ ok: false, error: 'Invalid request payload.' }, 400);
        }

        const ipAddress = getClientIp(request);
        const rateLimitKey = getRateLimitKey(request);
        const normalizedEmail = email.toLowerCase();
        const eventSource = source || 'moltpit-landing';

        let rateLimit = { allowed: true, remaining: RATE_LIMIT_MAX, resetMs: 0 };
        try {
          // Prefer Redis rate limiting — survives across Lambda invocations
          rateLimit = await redisConsumeRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
        } catch {
          try {
            rateLimit = consumeRateLimit(rateLimitKey, 'waitlist', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
          } catch (error) {
            appendOpsLog({
              route: route,
              level: 'warn',
              event: 'waitlist_rate_limit_failed',
              requestId,
              error: error instanceof Error ? error.message : 'unknown',
            });
          }
        }
        if (!rateLimit.allowed) {
          appendOpsLog({ route: route, level: 'warn', event: 'waitlist_rate_limited', requestId, ipAddress, durationMs: Date.now() - startedAt });
          safeTrackConversion(route, requestId, {
            eventName: 'waitlist_rate_limited',
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
          appendOpsLog({ route: route, level: 'warn', event: 'waitlist_honeypot_blocked', requestId, ipAddress, durationMs: Date.now() - startedAt });
          safeTrackConversion(route, requestId, {
            eventName: 'waitlist_honeypot_blocked',
            source: eventSource,
            email: normalizedEmail || undefined,
            metaJson: JSON.stringify({ honeypot }),
            userAgent: request.headers.get('user-agent') ?? undefined,
            ipAddress,
          });
          return respond({ ok: false, error: 'Submission blocked.' }, 400);
        }

        if (!EMAIL_RE.test(email)) {
          appendOpsLog({ route: route, level: 'warn', event: 'waitlist_invalid_email', requestId, ipAddress, durationMs: Date.now() - startedAt });
          safeTrackConversion(route, requestId, {
            eventName: 'waitlist_invalid_email',
            source: eventSource,
            email: normalizedEmail || undefined,
            userAgent: request.headers.get('user-agent') ?? undefined,
            ipAddress,
          });
          return respond({ ok: false, error: 'Valid email is required.' }, 400);
        }

        const payload = {
          email: normalizedEmail,
          game: game.length < 2 ? 'Unspecified' : game,
          source: eventSource,
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress,
        };

        try {
          // Redis is the primary storage on Vercel — durable across Lambda invocations
          await redisInsertWaitlistLead(payload);

          // Convex is best-effort secondary — durable, queryable
          try {
            await convexClient.mutation(api.waitlist.addToWaitlist, {
              email: normalizedEmail,
              source: eventSource,
            });
          } catch (convexError) {
            appendOpsLog({ route, level: 'warn', event: 'waitlist_convex_write_failed', requestId, error: convexError instanceof Error ? convexError.message : 'unknown' });
            // Never throw — Redis already succeeded
          }

          // SQLite is best-effort tertiary — useful locally, ephemeral on Vercel
          try {
            insertWaitlistLead(payload);
          } catch (sqliteError) {
            appendOpsLog({ route, level: 'warn', event: 'waitlist_sqlite_write_failed', requestId, error: sqliteError instanceof Error ? sqliteError.message : 'unknown' });
            // Never throw — Redis already succeeded
          }

          appendOpsLog({ route: route, level: 'info', event: 'waitlist_saved', requestId, source: payload.source, emailHash: normalizedEmail.slice(0, 3), durationMs: Date.now() - startedAt });
          try {
            const drained = drainFallbackQueues(10);
            if ((drained.waitlist.inserted + drained.founder.inserted + drained.events.inserted) > 0) {
              appendOpsLog({ route, level: 'info', event: 'fallback_drain_after_waitlist', requestId, drained });
            }
          } catch {
            // best-effort background healing only
          }
          safeTrackConversion(route, requestId, {
            eventName: 'waitlist_submitted',
            source: payload.source,
            email: normalizedEmail,
            userAgent: request.headers.get('user-agent') ?? undefined,
            ipAddress,
          });
          return respond({ ok: true }, 200);
        } catch (error) {
          // Redis failed — try file fallback
          const errorMessage = error instanceof Error ? error.message : 'unknown-error';
          appendOpsLog({ route: route, level: 'error', event: 'waitlist_redis_write_failed', requestId, error: errorMessage, durationMs: Date.now() - startedAt });

          try {
            appendWaitlistFallback({ route: route, requestId, ...payload, reason: errorMessage });
            safeTrackConversion(route, requestId, {
              eventName: 'waitlist_queued_fallback',
              source: payload.source,
              email: normalizedEmail,
              metaJson: JSON.stringify({ error: errorMessage }),
              userAgent: request.headers.get('user-agent') ?? undefined,
              ipAddress,
            });
            appendOpsLog({ route: route, level: 'warn', event: 'waitlist_saved_to_fallback', requestId, durationMs: Date.now() - startedAt });
            return respond({ ok: true, queued: true }, 202);
          } catch (fallbackError) {
            appendOpsLog({ route: route, level: 'error', event: 'waitlist_fallback_write_failed', requestId, error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error', durationMs: Date.now() - startedAt });
            safeTrackConversion(route, requestId, {
              eventName: 'waitlist_insert_failed',
              source: payload.source,
              email: normalizedEmail,
              metaJson: JSON.stringify({ error: errorMessage }),
              userAgent: request.headers.get('user-agent') ?? undefined,
              ipAddress,
            });
            return respond({ ok: false, error: 'Temporary storage issue. Please retry in 1 minute.' }, 503);
          }
        }
      },
    },
  },
})
