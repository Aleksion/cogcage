import { createFileRoute } from '@tanstack/react-router'
import { Redis } from '@upstash/redis'

const MAX_DURATION_MS = 55_000 // close before Vercel's 60s timeout — EventSource auto-reconnects
const POLL_INTERVAL_MS = 800

/**
 * GET /api/sessions/:id/events — Server-Sent Events stream
 *
 * Backed by Redis Streams (XADD/XREAD). Clients reconnect with
 * Last-Event-ID header to catch up from where they left off.
 * Gracefully closes at 55s so Vercel doesn't hard-kill the function.
 */
export const Route = createFileRoute('/api/sessions/$id/events')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const sessionId = params.id
        if (!sessionId) {
          return new Response('Missing session id', { status: 400 })
        }

        // Per-request Redis instance (safe for long-lived streams)
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        })

        const streamKey = `session-stream:${sessionId}`
        const lastEventId = request.headers.get('Last-Event-ID') || '0-0'

        const encoder = new TextEncoder()
        let closed = false
        let lastSeenId = lastEventId

        const stream = new ReadableStream({
          async start(controller) {
            const enqueue = (chunk: string) => {
              try {
                controller.enqueue(encoder.encode(chunk))
              } catch {
                closed = true
              }
            }

            // Initial keepalive so the client knows it's connected
            enqueue(': connected\n\n')

            const startedAt = Date.now()

            while (!closed && Date.now() - startedAt < MAX_DURATION_MS) {
              try {
                const results = await redis.xread(streamKey, lastSeenId, { count: 20 })

                if (results && Array.isArray(results) && results.length > 0) {
                  for (const streamResult of results) {
                    if (!Array.isArray(streamResult) || streamResult.length < 2) continue
                    const messages = streamResult[1]
                    if (!Array.isArray(messages)) continue

                    for (const msg of messages) {
                      if (!Array.isArray(msg) || msg.length < 2) continue
                      const id = String(msg[0])
                      const fields = msg[1] as Record<string, unknown>
                      const data =
                        typeof fields === 'object' && fields !== null
                          ? ((fields.data as string) ?? JSON.stringify(fields))
                          : String(fields)

                      lastSeenId = id
                      enqueue(`id: ${id}\ndata: ${data}\n\n`)
                    }
                  }
                } else {
                  enqueue(': ping\n\n')
                }
              } catch {
                enqueue(': ping\n\n')
              }

              if (!closed) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
              }
            }

            // Graceful close — EventSource reconnects with Last-Event-ID
            try {
              controller.close()
            } catch {
              /* already closed */
            }
          },
          cancel() {
            closed = true
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
