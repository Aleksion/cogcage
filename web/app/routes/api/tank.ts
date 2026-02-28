import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { getCookie } from '~/lib/cookies'
import type { Id } from '../../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

export const Route = createFileRoute('/api/tank')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const tanks = await convex.query(api.tanks.listOpen)
          return new Response(JSON.stringify({ lobbies: tanks }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
      POST: async ({ request }) => {
        const token =
          request.headers.get('Authorization')?.replace('Bearer ', '') ??
          getCookie(request, '__convexAuthJWT')
        if (!token) {
          return new Response(JSON.stringify({ error: 'Not authenticated' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
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
          const tankId = await convex.mutation(api.tanks.create, {
            hostShellId: loadoutId as Id<'shells'>,
          })
          return new Response(JSON.stringify({ lobbyId: tankId }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
    },
  },
})
