import { createFileRoute } from '@tanstack/react-router'
import {
  insertConversionEvent,
  insertFounderIntent,
  readApiRequestReceipt,
  writeApiRequestReceipt,
} from '~/lib/waitlist-db'
import { appendEventsFallback, appendFounderIntentFallback, appendOpsLog } from '~/lib/observability'
import { redisInsertConversionEvent, redisInsertFounderIntent } from '~/lib/waitlist-redis'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeString(value: unknown, maxLen = 300) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().slice(0, 180)
}

function hashString(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function deriveIntentId(email: string, source: string) {
  const day = new Date().toISOString().slice(0, 10)
  return `intent:${day}:${hashString(`${email}|${source}|${day}`)}`
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  const flyIp = request.headers.get('fly-client-ip')?.trim()
  return forwarded || realIp || cfIp || flyIp || undefined
}

function resolveCheckoutBaseUrl() {
  return (
    process.env.STRIPE_FOUNDER_URL?.trim()
    || process.env.PUBLIC_STRIPE_FOUNDER_URL?.trim()
    || ''
  )
}

function buildCheckoutUrl(baseUrl: string, email: string, source: string, requestId: string) {
  const url = new URL(baseUrl)
  url.searchParams.set('prefilled_email', email)
  url.searchParams.set('source', source)
  url.searchParams.set('request_id', requestId)
  return url.toString()
}

function jsonResponse(body: Record<string, unknown>, status: number, requestId: string, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ ...body, requestId }), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      ...extraHeaders,
    },
  })
}

export const Route = createFileRoute('/api/founder-checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now()
        const requestId = crypto.randomUUID()
        const route = '/api/founder-checkout'
        const contentType = request.headers.get('content-type') ?? ''
        let email = ''
        let source = ''
        let intentId = ''

        try {
          if (contentType.includes('application/json')) {
            const json = await request.json().catch(() => ({}))
            email = normalizeEmail(json.email)
            source = normalizeString(json.source, 120)
            intentId = normalizeString(json.intentId ?? json.intent_id, 220)
          } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            email = normalizeEmail(formData.get('email'))
            source = normalizeString(formData.get('source'), 120)
            intentId = normalizeString(formData.get('intentId') || formData.get('intent_id'), 220)
          } else {
            const rawBody = await request.text()
            if (rawBody.trim().startsWith('{')) {
              const json = JSON.parse(rawBody) as Record<string, unknown>
              email = normalizeEmail(json.email)
              source = normalizeString(json.source, 120)
              intentId = normalizeString(json.intentId ?? json.intent_id, 220)
            } else {
              const params = new URLSearchParams(rawBody)
              email = normalizeEmail(params.get('email'))
              source = normalizeString(params.get('source'), 120)
              intentId = normalizeString(params.get('intentId') || params.get('intent_id'), 220)
            }
          }
        } catch {
          return jsonResponse({ ok: false, error: 'Invalid request payload.' }, 400, requestId)
        }

        if (!email || !EMAIL_RE.test(email)) {
          appendOpsLog({ route, level: 'warn', event: 'founder_checkout_invalid_email', requestId, durationMs: Date.now() - startedAt })
          return jsonResponse({ ok: false, error: 'Valid email is required.' }, 400, requestId)
        }

        const normalizedSource = source ? source.replace(/[^a-zA-Z0-9:_./-]/g, '-').slice(0, 120) : 'founder-checkout'
        const resolvedIntentId = intentId || deriveIntentId(email, normalizedSource)
        const idempotencyKey = (request.headers.get('x-idempotency-key')?.trim() || `checkout-init:${resolvedIntentId}`).slice(0, 120)

        const respond = (body: Record<string, unknown>, status: number, extraHeaders: Record<string, string> = {}) => {
          try {
            writeApiRequestReceipt({
              route,
              idempotencyKey,
              responseStatus: status,
              responseBody: JSON.stringify({ ...body, requestId }),
            })
          } catch (error) {
            appendOpsLog({
              route,
              level: 'warn',
              event: 'founder_checkout_idempotency_write_failed',
              requestId,
              error: error instanceof Error ? error.message : 'unknown',
            })
          }
          return jsonResponse(body, status, requestId, extraHeaders)
        }

        try {
          const cached = readApiRequestReceipt(route, idempotencyKey)
          if (cached) {
            appendOpsLog({
              route,
              level: 'info',
              event: 'founder_checkout_idempotency_replay',
              requestId,
              durationMs: Date.now() - startedAt,
            })
            return new Response(cached.responseBody, {
              status: cached.responseStatus,
              headers: {
                'content-type': 'application/json',
                'x-request-id': requestId,
                'x-idempotent-replay': '1',
              },
            })
          }
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'founder_checkout_idempotency_read_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          })
        }

        const founderIntentPayload = {
          email,
          source: normalizedSource,
          intentId: resolvedIntentId,
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
        }
        const storage = { redis: false, sqlite: false, fallback: false }

        try {
          await redisInsertFounderIntent(founderIntentPayload)
          storage.redis = true
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'founder_checkout_redis_intent_write_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          })
        }

        try {
          insertFounderIntent(founderIntentPayload)
          storage.sqlite = true
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'founder_checkout_sqlite_intent_write_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          })
        }

        if (!storage.redis && !storage.sqlite) {
          try {
            appendFounderIntentFallback({
              route,
              requestId,
              ...founderIntentPayload,
              reason: 'intent-storage-unavailable',
            })
            storage.fallback = true
          } catch (error) {
            appendOpsLog({
              route,
              level: 'error',
              event: 'founder_checkout_fallback_write_failed',
              requestId,
              error: error instanceof Error ? error.message : 'unknown-fallback-error',
              durationMs: Date.now() - startedAt,
            })
            return respond({ ok: false, error: 'Checkout initiation unavailable. Please retry.' }, 503)
          }
        }

        const conversionEvent = {
          eventName: 'founder_checkout_initiated',
          eventId: `checkout-init:${resolvedIntentId}`,
          source: normalizedSource,
          email,
          userAgent: request.headers.get('user-agent') ?? undefined,
          ipAddress: getClientIp(request),
          metaJson: JSON.stringify({ intentId: resolvedIntentId }),
        }
        try {
          insertConversionEvent(conversionEvent)
        } catch (error) {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'founder_checkout_sqlite_event_write_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          })
          try {
            appendEventsFallback({ route, requestId, ...conversionEvent, reason: 'sqlite-write-failed' })
          } catch {
            // best effort telemetry only
          }
        }
        void redisInsertConversionEvent(conversionEvent).catch((error: unknown) => {
          appendOpsLog({
            route,
            level: 'warn',
            event: 'founder_checkout_redis_event_write_failed',
            requestId,
            error: error instanceof Error ? error.message : 'unknown',
          })
        })

        const checkoutBase = resolveCheckoutBaseUrl()
        const checkoutUrl = checkoutBase ? buildCheckoutUrl(checkoutBase, email, normalizedSource, requestId) : null

        appendOpsLog({
          route,
          level: 'info',
          event: checkoutUrl ? 'founder_checkout_started' : 'founder_checkout_reserved_no_provider',
          requestId,
          source: normalizedSource,
          hasCheckoutUrl: Boolean(checkoutUrl),
          storage,
          durationMs: Date.now() - startedAt,
        })

        return respond({
          ok: true,
          checkoutUrl,
          queued: storage.fallback || undefined,
        }, storage.fallback ? 202 : 200)
      },
    },
  },
})

