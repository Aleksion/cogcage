import { createHash } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud',
)

const logAuthEventRef = makeFunctionReference<'mutation'>('auth-log:logAuthEvent')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthMethod = 'github' | 'email-otp' | 'guest'

function normalizeMethod(value: unknown): AuthMethod {
  if (value === 'github' || value === 'email-otp' || value === 'guest') {
    return value
  }
  return 'email-otp'
}

function normalizeErrorCode(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().slice(0, 120)
  return normalized.length ? normalized : undefined
}

function deriveEmailHash(email: unknown, emailHash: unknown) {
  if (typeof emailHash === 'string' && emailHash.trim()) {
    return emailHash.trim().slice(0, 128)
  }
  if (typeof email !== 'string') return undefined
  const normalized = email.trim().toLowerCase()
  if (!normalized || !EMAIL_RE.test(normalized)) return undefined
  return createHash('sha256').update(normalized).digest('hex')
}

async function parsePayload(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  }
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData()
    return Object.fromEntries(formData.entries())
  }
  const rawBody = await request.text()
  if (rawBody.trim().startsWith('{')) {
    return (JSON.parse(rawBody) ?? {}) as Record<string, unknown>
  }
  return Object.fromEntries(new URLSearchParams(rawBody).entries())
}

export const Route = createFileRoute('/api/auth-event')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await parsePayload(request).catch(() => ({}))
        const success = payload.success === true || payload.success === 'true'
        const method = normalizeMethod(payload.method)
        const errorCode = normalizeErrorCode(payload.errorCode)
        const emailHash = deriveEmailHash(payload.email, payload.emailHash)

        try {
          await convex.mutation(logAuthEventRef, {
            method,
            success,
            errorCode,
            emailHash,
          } as any)
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'auth_event_write_failed',
              detail: error instanceof Error ? error.message : 'unknown-error',
            }),
            {
              status: 503,
              headers: { 'content-type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
