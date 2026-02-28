import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { getCookie } from '~/lib/cookies'

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

export const Route = createFileRoute('/api/shell')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token =
          request.headers.get('Authorization')?.replace('Bearer ', '') ??
          getCookie(request, '__convexAuthJWT')
        if (!token) {
          return new Response(JSON.stringify({ loadouts: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }

        try {
          convex.setAuth(token)
          const shells = await convex.query(api.shells.list)
          return new Response(JSON.stringify({ loadouts: shells }), {
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
          const { name, cards, brainPrompt, skills, stats } = body

          if (!name || !Array.isArray(cards)) {
            return new Response(
              JSON.stringify({ error: 'name and cards[] required' }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            )
          }

          convex.setAuth(token)
          await convex.mutation(api.shells.create, {
            name,
            cards,
            directive: brainPrompt || '',
            skills: Array.isArray(skills) ? skills : [],
            stats: stats || { totalWeight: 0, totalOverhead: 0, armorValue: 0 },
          })

          const shells = await convex.query(api.shells.list)
          return new Response(JSON.stringify({ loadouts: shells }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        } catch (err: any) {
          const status = err.message?.includes('Max 10') ? 400 : 500
          return new Response(
            JSON.stringify({ error: err.message }),
            { status, headers: { 'content-type': 'application/json' } },
          )
        }
      },
    },
  },
})
