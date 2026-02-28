import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { getCookie } from '~/lib/cookies'
import type { Id } from '../../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

export const Route = createFileRoute('/api/tank/$id/join')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const { id } = params
        const token =
          request.headers.get('Authorization')?.replace('Bearer ', '') ??
          getCookie(request, '__convexAuthJWT')
        if (!id || !token) {
          return new Response(
            JSON.stringify({ error: 'Missing id or auth' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        try {
          const body = await request.json()
          const { loadoutId } = body
          if (!loadoutId) {
            return new Response(
              JSON.stringify({ error: 'loadoutId required' }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            )
          }

          convex.setAuth(token)
          await convex.mutation(api.tanks.join, {
            tankId: id as Id<'tanks'>,
            challengerShellId: loadoutId as Id<'shells'>,
          })
          return new Response(
            JSON.stringify({ ok: true, status: 'ready' }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        } catch (err: any) {
          const status = err.message?.includes('Unauthorized') || err.message?.includes('Cannot join')
            ? 403
            : 500
          return new Response(JSON.stringify({ error: err.message }), {
            status,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
    },
  },
})
