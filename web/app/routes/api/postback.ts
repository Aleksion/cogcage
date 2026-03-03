import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '~/lib/observability'
import { insertConversionEvent, insertFounderIntent, readApiRequestReceipt, writeApiRequestReceipt } from '~/lib/waitlist-db'
import {
  redisInsertConversionEvent,
  redisInsertFounderIntent,
  redisReadApiRequestReceipt,
  redisWriteApiRequestReceipt,
} from '~/lib/waitlist-redis'

type CheckoutPostback = {
  type?: string;
  id?: string;
  eventId?: string;
  source?: string;
  created?: number;
  data?: {
    object?: {
      id?: string;
      client_reference_id?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
      metadata?: Record<string, unknown>;
    };
  };
  email?: string;
  metadata?: Record<string, unknown>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type PostbackOutcome =
  | 'ready'
  | 'recorded'
  | 'recorded_degraded'
  | 'queued_fallback'
  | 'payload_invalid'
  | 'unsupported_type'
  | 'unauthorized'
  | 'idempotent_replay'
  | 'test_mode'
  | 'failed'
  | 'unknown';

function normalizeString(value: unknown, maxLen = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function getIdempotencyKey(request: Request) {
  const key = request.headers.get('x-idempotency-key')?.trim() ?? '';
  if (!key) return undefined;
  return key.slice(0, 120);
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const email = value.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return undefined;
  return email;
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  const flyIp = request.headers.get('fly-client-ip')?.trim();
  return forwarded || realIp || cfIp || flyIp || undefined;
}

type PostbackAuthResult = {
  ok: boolean;
  mode: 'open' | 'key' | 'signature' | 'key+signature';
  reason?: 'invalid_key' | 'missing_signature' | 'missing_signature_timestamp' | 'invalid_signature' | 'stale_signature_timestamp';
};

function getPostbackAuthSecrets() {
  const key = (process.env.COGCAGE_POSTBACK_KEY ?? process.env.MOLTPIT_POSTBACK_KEY)?.trim();
  const signingSecret = (process.env.COGCAGE_POSTBACK_SIGNING_SECRET ?? process.env.MOLTPIT_POSTBACK_SIGNING_SECRET)?.trim();
  return {
    key: key || undefined,
    signingSecret: signingSecret || undefined,
  };
}

function parseSignatureHeader(rawHeader: string): { signature?: string; timestamp?: string } {
  const header = rawHeader.trim();
  if (!header) return {};
  const parts = header.split(',').map((part) => part.trim()).filter(Boolean);
  let signature = '';
  let timestamp = '';

  for (const part of parts) {
    if (!part.includes('=')) {
      if (!signature) signature = part;
      continue;
    }
    const [rawKey, rawValue] = part.split('=', 2);
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim();
    if (!value) continue;
    if (key === 'v1' || key === 'sha256' || key === 'sig' || key === 'signature') {
      signature = value;
    } else if (key === 't') {
      timestamp = value;
    }
  }

  if (!signature && parts.length === 1 && header.includes('=') && !header.includes(',')) {
    const [rawKey, rawValue] = header.split('=', 2);
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim();
    if (value && (key === 'sha256' || key === 'signature' || key === 'sig' || key === 'v1')) {
      signature = value;
    }
  }

  if (!signature && !header.includes(',')) {
    signature = header;
  }

  if (signature.startsWith('sha256=')) {
    signature = signature.slice('sha256='.length);
  }

  return {
    signature: signature || undefined,
    timestamp: timestamp || undefined,
  };
}

function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function authorize(request: Request, rawBody = ''): PostbackAuthResult {
  const secrets = getPostbackAuthSecrets();
  const hasKey = Boolean(secrets.key);
  const hasSigningSecret = Boolean(secrets.signingSecret);
  const mode: PostbackAuthResult['mode'] = hasKey && hasSigningSecret
    ? 'key+signature'
    : hasKey
      ? 'key'
      : hasSigningSecret
        ? 'signature'
        : 'open';

  if (hasKey) {
    const provided = request.headers.get('x-postback-key')?.trim() ?? '';
    if (provided !== secrets.key) {
      return { ok: false, mode, reason: 'invalid_key' };
    }
  }

  if (hasSigningSecret) {
    const parsed = parseSignatureHeader(
      request.headers.get('x-postback-signature')
      ?? request.headers.get('stripe-signature')
      ?? '',
    );
    const signature = parsed.signature?.toLowerCase();
    const timestamp = (
      request.headers.get('x-postback-timestamp')
      ?? request.headers.get('x-signature-timestamp')
      ?? parsed.timestamp
      ?? ''
    ).trim();

    if (!signature) {
      return { ok: false, mode, reason: 'missing_signature' };
    }
    if (!timestamp) {
      return { ok: false, mode, reason: 'missing_signature_timestamp' };
    }
    if (!/^[a-f0-9]{32,128}$/i.test(signature)) {
      return { ok: false, mode, reason: 'invalid_signature' };
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      return { ok: false, mode, reason: 'invalid_signature' };
    }

    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Math.floor(timestampSeconds));
    if (ageSeconds > 300) {
      return { ok: false, mode, reason: 'stale_signature_timestamp' };
    }

    const expected = createHmac('sha256', secrets.signingSecret as string)
      .update(`${Math.floor(timestampSeconds)}.${rawBody}`)
      .digest('hex')
      .toLowerCase();
    if (!timingSafeEqualHex(expected, signature)) {
      return { ok: false, mode, reason: 'invalid_signature' };
    }
  }

  return { ok: true, mode };
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function deriveFallbackEventId({ eventType, source, email, created, metadata }: { eventType: string; source: string; email?: string; created?: number; metadata?: Record<string, unknown> }) {
  const day = new Date().toISOString().slice(0, 10);
  const metadataPreview = JSON.stringify(metadata ?? {}).slice(0, 512);
  const fingerprint = `${eventType}|${source}|${email || 'anon'}|${created || ''}|${metadataPreview}|${day}`;
  return `postback:${day}:${hashString(fingerprint)}`;
}

function safeMetaJson(meta: Record<string, unknown>) {
  try {
    const serialized = JSON.stringify(meta);
    return serialized.length > 4000
      ? JSON.stringify({ truncated: true, preview: serialized.slice(0, 3800) })
      : serialized;
  } catch {
    return JSON.stringify({ invalidMeta: true });
  }
}

function asPostbackContract(
  body: Record<string, unknown>,
  outcome: PostbackOutcome,
  storage: string,
  replayed = false,
) {
  const queued = body.queued === true || outcome === 'queued_fallback';
  const degraded = body.degraded === true || outcome === 'recorded_degraded' || outcome === 'queued_fallback';
  const ok = body.ok === true;
  return {
    ...body,
    ok,
    status: outcome,
    storage,
    queued,
    degraded,
    replayed,
  };
}

function parseReplayBody(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // fall through
  }
  return { ok: true };
}

export const Route = createFileRoute('/api/postback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const route = '/api/postback';
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const url = new URL(request.url);

        const respondVerify = (
          body: Record<string, unknown>,
          status: number,
          outcome: 'ready' | 'test_mode' | 'unauthorized',
          detail: Record<string, unknown> = {},
        ) => {
          const storage = typeof detail.storage === 'string' ? detail.storage : 'none';
          const responseBody = {
            ...body,
            ok: body.ok === true,
            status: outcome,
            storage,
            queued: false,
            degraded: false,
            replayed: false,
            requestId,
          };

          appendOpsLog({
            route,
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            event: 'postback_verify_completed',
            requestId,
            httpStatus: status,
            outcome,
            storage,
            durationMs: Date.now() - startedAt,
            ...detail,
          });

          return new Response(JSON.stringify(responseBody), {
            status,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          });
        };

        appendOpsLog({
          route,
          level: 'info',
          event: 'postback_verify_received',
          requestId,
          method: 'GET',
          testMode: url.searchParams.get('test') === '1',
        });

        const auth = authorize(request);
        if (!auth.ok) {
          return respondVerify({ ok: false, error: 'Unauthorized' }, 401, 'unauthorized', {
            authMode: auth.mode,
            authReason: auth.reason,
          });
        }
        // Health check / test endpoint
        if (url.searchParams.get('test') === '1') {
          return respondVerify({ ok: true, mode: 'test', method: 'GET' }, 200, 'test_mode');
        }
        return respondVerify(
          { ok: true, acceptedTypes: ['checkout.session.completed', 'founder_pack.paid'] },
          200,
          'ready',
        );
      },
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
        const contentType = request.headers.get('content-type') ?? '';
        const route = '/api/postback';
        const headerIdempotencyKey = getIdempotencyKey(request);

        const respond = async (
          body: Record<string, unknown>,
          status: number,
          idempotencyKey?: string,
          extraHeaders: Record<string, string> = {},
          outcome: PostbackOutcome = 'unknown',
          detail: Record<string, unknown> = {},
        ) => {
          const storage =
            (typeof detail.storage === 'string' && detail.storage)
            || (typeof body.storage === 'string' && body.storage)
            || 'none';
          const replayed = detail.replayed === true || body.replayed === true || outcome === 'idempotent_replay';
          const responseBody = asPostbackContract(body, outcome, storage, replayed);

          appendOpsLog({
            route,
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            event: 'postback_request_completed',
            requestId,
            httpStatus: status,
            outcome,
            storage,
            durationMs: Date.now() - startedAt,
            ...detail,
          });

          if (idempotencyKey) {
            const receipt = {
              route,
              idempotencyKey,
              responseStatus: status,
              responseBody: JSON.stringify({ ...responseBody, requestId }),
            };
            let persisted = false;

            try {
              await redisWriteApiRequestReceipt(receipt);
              persisted = true;
            } catch (error) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_idempotency_redis_write_failed',
                requestId,
                error: error instanceof Error ? error.message : 'unknown',
              });
            }

            try {
              writeApiRequestReceipt(receipt);
              persisted = true;
            } catch (error) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_idempotency_sqlite_write_failed',
                requestId,
                error: error instanceof Error ? error.message : 'unknown',
              });
            }

            if (!persisted) {
              appendOpsLog({
                route,
                level: 'error',
                event: 'postback_idempotency_write_failed',
                requestId,
              });
            }
          }

          return new Response(JSON.stringify({ ...responseBody, requestId }), {
            status,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
              ...extraHeaders,
            },
          });
        };

        appendOpsLog({
          route,
          level: 'info',
          event: 'postback_received',
          requestId,
          contentType,
          hasIdempotencyKey: Boolean(headerIdempotencyKey),
          authMode: authorize(request).mode,
        });

        // Test mode stub: ?test=1 returns 200 without processing, for deploy verification
        const url = new URL(request.url);
        if (url.searchParams.get('test') === '1') {
          return respond({ ok: true, mode: 'test' }, 200, headerIdempotencyKey, {}, 'test_mode', { storage: 'none' });
        }

        let payload: CheckoutPostback | null = null;
        let rawBody = '';

        try {
          if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const eventType = normalizeString(formData.get('type'), 120);
            const eventId = normalizeString(formData.get('eventId') ?? formData.get('id'), 180);
            const source = normalizeString(formData.get('source'), 160);
            const email = normalizeString(formData.get('email'), 180);
            payload = {
              type: eventType || undefined,
              eventId: eventId || undefined,
              source: source || undefined,
              email: email || undefined,
            };
          } else {
            rawBody = await request.text();
            if (contentType.includes('application/json') || rawBody.trim().startsWith('{')) {
              payload = JSON.parse(rawBody) as CheckoutPostback;
            } else {
              const params = new URLSearchParams(rawBody);
              payload = {
                type: normalizeString(params.get('type'), 120) || undefined,
                eventId: normalizeString(params.get('eventId') ?? params.get('id'), 180) || undefined,
                source: normalizeString(params.get('source'), 160) || undefined,
                email: normalizeString(params.get('email'), 180) || undefined,
              };
            }
          }
        } catch {
          payload = null;
        }

        const auth = authorize(request, rawBody);
        if (!auth.ok) {
          appendOpsLog({ route, level: 'warn', event: 'postback_unauthorized', requestId, authMode: auth.mode, authReason: auth.reason });
          return respond({ ok: false, error: 'Unauthorized' }, 401, headerIdempotencyKey, {}, 'unauthorized', {
            storage: 'none',
            authMode: auth.mode,
            authReason: auth.reason,
          });
        }

        if (!payload) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_payload_invalid',
            requestId,
            contentType,
            durationMs: Date.now() - startedAt,
          });
          return respond({ ok: false, error: 'Invalid request payload' }, 400, headerIdempotencyKey, {}, 'payload_invalid', { storage: 'none' });
        }

        const rawType = payload.type ?? '';
        const eventType = typeof rawType === 'string' ? rawType : '';
        const acceptedTypes = new Set(['checkout.session.completed', 'founder_pack.paid']);
        if (!acceptedTypes.has(eventType)) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_type_unsupported',
            requestId,
            eventType,
            durationMs: Date.now() - startedAt,
          });
          return respond({ ok: false, error: 'Unsupported postback type' }, 422, headerIdempotencyKey, {}, 'unsupported_type', { storage: 'none', eventType });
        }

        const object = payload.data?.object;
        const email =
          normalizeEmail(payload.email)
          ?? normalizeEmail(object?.customer_email)
          ?? normalizeEmail(object?.customer_details?.email);

        const objectMetadata = (object?.metadata && typeof object.metadata === 'object')
          ? object.metadata
          : {};
        const payloadMetadata = (payload.metadata && typeof payload.metadata === 'object')
          ? payload.metadata
          : undefined;
        const resolvedMetadata = payloadMetadata ?? objectMetadata;
        const sourceFromMetadata =
          normalizeString((resolvedMetadata as Record<string, unknown>).checkout_source, 160)
          || normalizeString((resolvedMetadata as Record<string, unknown>).source, 160);
        const source =
          normalizeString(payload.source, 160)
          || sourceFromMetadata
          || 'postback';
        const clientReferenceId = normalizeString(object?.client_reference_id, 180);
        const checkoutIntentId =
          normalizeString((resolvedMetadata as Record<string, unknown>).intentId, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).intent_id, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).checkout_intent_id, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).founder_intent_id, 180)
          || (clientReferenceId.startsWith('intent:') ? clientReferenceId : '');
        const meta = {
          eventType,
          created: payload.created,
          metadata: resolvedMetadata,
          checkoutIntentId: checkoutIntentId || undefined,
        };
        const metadataEventId =
          normalizeString((resolvedMetadata as Record<string, unknown>).checkout_event_id, 180)
          || normalizeString((resolvedMetadata as Record<string, unknown>).event_id, 180);

        const eventId =
          (typeof payload.eventId === 'string' && payload.eventId.trim() ? payload.eventId.trim() : undefined)
          ?? (typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : undefined)
          ?? metadataEventId
          ?? (clientReferenceId && !clientReferenceId.startsWith('intent:') ? clientReferenceId : undefined)
          ?? (typeof object?.id === 'string' && object.id.trim() ? object.id.trim() : undefined)
          ?? deriveFallbackEventId({ eventType, source, email, created: payload.created, metadata: meta.metadata as Record<string, unknown> });
        const idempotencyKey = (headerIdempotencyKey || `event:${eventId}`).slice(0, 120);

        try {
          const cached = await redisReadApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({ route, level: 'info', event: 'postback_idempotency_replay', requestId, idempotencyStore: 'redis', eventId, durationMs: Date.now() - startedAt });
            const replayBody = asPostbackContract(parseReplayBody(cached.responseBody), 'idempotent_replay', 'idempotency-replay:redis', true);
            return respond(replayBody, cached.responseStatus, idempotencyKey, { 'x-idempotent-replay': '1' }, 'idempotent_replay', {
              storage: 'idempotency-replay:redis',
              idempotencyStore: 'redis',
              eventId,
            });
          }
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_idempotency_redis_read_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }

        try {
          const cached = readApiRequestReceipt(route, idempotencyKey);
          if (cached) {
            appendOpsLog({ route, level: 'info', event: 'postback_idempotency_replay', requestId, idempotencyStore: 'sqlite', eventId, durationMs: Date.now() - startedAt });
            const replayBody = asPostbackContract(parseReplayBody(cached.responseBody), 'idempotent_replay', 'idempotency-replay:sqlite', true);
            return respond(replayBody, cached.responseStatus, idempotencyKey, { 'x-idempotent-replay': '1' }, 'idempotent_replay', {
              storage: 'idempotency-replay:sqlite',
              idempotencyStore: 'sqlite',
              eventId,
            });
          }
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'postback_idempotency_sqlite_read_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }

        const conversionPayload = {
          eventName: 'paid_conversion_confirmed',
          eventId,
          source,
          tier: 'founder',
          email,
          metaJson: safeMetaJson(meta),
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
        };
        const founderIntentId = checkoutIntentId || `paid:${eventId}`;
        const founderIntentPayload = email ? {
          email,
          source: checkoutIntentId ? `${source}-postback-confirmed` : `${source}-postback`,
          intentId: founderIntentId,
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
        } : null;
        const intentPurchaseSignalPayload = checkoutIntentId && email
          ? {
            eventName: 'founder_intent_purchase_confirmed',
            eventId: `intent-paid:${checkoutIntentId}`.slice(0, 180),
            source: `${source}-postback`,
            tier: 'founder',
            email,
            metaJson: safeMetaJson({
              checkoutIntentId,
              paidEventId: eventId,
              eventType,
            }),
            userAgent: request.headers.get('user-agent') ?? undefined,
            ipAddress: getClientIp(request),
          }
          : null;

        try {
          await redisInsertConversionEvent(conversionPayload);
          try {
            insertConversionEvent(conversionPayload);
          } catch (sqliteError) {
            appendOpsLog({
              route,
              level: 'warn',
              event: 'postback_sqlite_conversion_write_failed',
              requestId,
              eventType,
              source,
              eventId,
              error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
            });
          }

          if (founderIntentPayload) {
            try {
              await redisInsertFounderIntent(founderIntentPayload);
              try {
                insertFounderIntent(founderIntentPayload);
              } catch (sqliteError) {
                appendOpsLog({
                  route,
                  level: 'warn',
                  event: 'postback_sqlite_founder_intent_write_failed',
                  requestId,
                  eventType,
                  source,
                  eventId,
                  error: sqliteError instanceof Error ? sqliteError.message : 'unknown',
                });
              }
            } catch (redisFounderError) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_redis_founder_intent_write_failed',
                requestId,
                eventType,
                source,
                eventId,
                error: redisFounderError instanceof Error ? redisFounderError.message : 'unknown',
              });
              try {
                insertFounderIntent(founderIntentPayload);
                appendOpsLog({
                  route,
                  level: 'warn',
                  event: 'postback_founder_intent_saved_sqlite_fallback',
                  requestId,
                  eventType,
                  source,
                  eventId,
                });
              } catch (sqliteFounderError) {
                appendOpsLog({
                  route,
                  level: 'error',
                  event: 'postback_founder_intent_sqlite_fallback_failed',
                  requestId,
                  eventType,
                  source,
                  eventId,
                  error: sqliteFounderError instanceof Error ? sqliteFounderError.message : 'unknown',
                });
                try {
                  appendFounderIntentFallback({
                    route,
                    requestId,
                    ...founderIntentPayload,
                    reason: sqliteFounderError instanceof Error ? sqliteFounderError.message : 'unknown',
                  });
                } catch {
                  // best-effort founder-intent fallback only
                }
              }
            }
          }

          if (intentPurchaseSignalPayload) {
            try {
              await redisInsertConversionEvent(intentPurchaseSignalPayload);
            } catch (redisSignalError) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_intent_signal_redis_write_failed',
                requestId,
                eventId,
                checkoutIntentId,
                error: redisSignalError instanceof Error ? redisSignalError.message : 'unknown',
              });
            }
            try {
              insertConversionEvent(intentPurchaseSignalPayload);
            } catch (sqliteSignalError) {
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_intent_signal_sqlite_write_failed',
                requestId,
                eventId,
                checkoutIntentId,
                error: sqliteSignalError instanceof Error ? sqliteSignalError.message : 'unknown',
              });
            }
          }

          appendOpsLog({
            route,
            level: 'info',
            event: 'postback_recorded',
            requestId,
            eventType,
            source,
            eventId,
            hasEmail: Boolean(email),
            checkoutIntentId: checkoutIntentId || undefined,
            founderIntentId: founderIntentPayload?.intentId,
            storage: 'redis',
            durationMs: Date.now() - startedAt,
          });

          return respond({ ok: true, eventId, intentId: founderIntentPayload?.intentId }, 200, idempotencyKey, {}, 'recorded', {
            storage: 'redis',
            eventId,
            eventType,
            source,
            checkoutIntentId: checkoutIntentId || undefined,
            founderIntentId: founderIntentPayload?.intentId,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'unknown-error';
          appendOpsLog({
            route,
            level: 'error',
            event: 'postback_redis_conversion_write_failed',
            requestId,
            eventType,
            source,
            eventId,
            checkoutIntentId: checkoutIntentId || undefined,
            error: errorMessage,
            durationMs: Date.now() - startedAt,
          });

          try {
            insertConversionEvent(conversionPayload);
            if (founderIntentPayload) {
              try {
                insertFounderIntent(founderIntentPayload);
              } catch (sqliteFounderError) {
                appendOpsLog({
                  route,
                  level: 'warn',
                  event: 'postback_sqlite_founder_intent_write_failed',
                  requestId,
                  eventType,
                  source,
                  eventId,
                  error: sqliteFounderError instanceof Error ? sqliteFounderError.message : 'unknown',
                });
              }
            }
            appendOpsLog({
              route,
              level: 'warn',
              event: 'postback_recorded_sqlite_fallback',
              requestId,
              eventType,
              source,
              eventId,
              hasEmail: Boolean(email),
              checkoutIntentId: checkoutIntentId || undefined,
              durationMs: Date.now() - startedAt,
            });

            return respond({ ok: true, degraded: true, eventId, intentId: founderIntentPayload?.intentId }, 200, idempotencyKey, {}, 'recorded_degraded', {
              storage: 'sqlite',
              eventId,
              eventType,
              source,
              checkoutIntentId: checkoutIntentId || undefined,
              founderIntentId: founderIntentPayload?.intentId,
            });
          } catch (sqliteError) {
            const sqliteErrorMessage = sqliteError instanceof Error ? sqliteError.message : 'unknown-error';
            appendOpsLog({
              route,
              level: 'error',
              event: 'postback_record_failed',
              requestId,
              eventType,
              source,
              eventId,
              checkoutIntentId: checkoutIntentId || undefined,
              error: sqliteErrorMessage,
              durationMs: Date.now() - startedAt,
            });

            try {
              appendEventsFallback({ route, requestId, ...conversionPayload, reason: sqliteErrorMessage });
              appendOpsLog({
                route,
                level: 'warn',
                event: 'postback_saved_to_fallback',
                requestId,
                eventType,
                source,
                eventId,
                checkoutIntentId: checkoutIntentId || undefined,
                durationMs: Date.now() - startedAt,
              });
              return respond({ ok: true, queued: true, degraded: true, eventId, intentId: founderIntentPayload?.intentId }, 202, idempotencyKey, {}, 'queued_fallback', {
                storage: 'fallback-file',
                eventId,
                eventType,
                source,
                checkoutIntentId: checkoutIntentId || undefined,
                founderIntentId: founderIntentPayload?.intentId,
              });
            } catch (fallbackError) {
              appendOpsLog({
                route,
                level: 'error',
                event: 'postback_fallback_write_failed',
                requestId,
                eventType,
                source,
                eventId,
                checkoutIntentId: checkoutIntentId || undefined,
                error: fallbackError instanceof Error ? fallbackError.message : 'unknown-fallback-error',
                durationMs: Date.now() - startedAt,
              });

              return respond({ ok: false, error: 'Postback processing failed' }, 500, idempotencyKey, {}, 'failed', {
                storage: 'none',
                eventId,
                eventType,
                source,
                checkoutIntentId: checkoutIntentId || undefined,
                founderIntentId: founderIntentPayload?.intentId,
              });
            }
          }
        }
      },
    },
  },
})
