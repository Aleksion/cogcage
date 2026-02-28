import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { getCookie } from '~/lib/cookies'
import type { Id } from '../../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

export const Route = createFileRoute('/api/tank/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { id } = params
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing tank id' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          })
        }

        try {
          const tank = await convex.query(api.tanks.get, {
            tankId: id as Id<'tanks'>,
          })
          if (!tank) {
            return new Response(JSON.stringify({ error: 'Tank not found' }), {
              status: 404,
              headers: { 'content-type': 'application/json' },
            })
          }

          // Resolve shell snapshots for host and challenger
          const hostShell = await convex.query(api.shells.get, {
            shellId: tank.hostShellId,
          })
          let challengerShell = null
          if (tank.challengerShellId) {
            challengerShell = await convex.query(api.shells.get, {
              shellId: tank.challengerShellId,
            })
          }

          return new Response(
            JSON.stringify({
              id: tank._id,
              host: hostShell,
              guest: challengerShell,
              status: tank.status,
              hostPlayerId: tank.hostPlayerId,
              createdAt: tank.createdAt,
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          )
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
      DELETE: async ({ request, params }) => {
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
          convex.setAuth(token)
          await convex.mutation(api.tanks.closeTank, {
            tankId: id as Id<'tanks'>,
          })
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        } catch (err: any) {
          const status = err.message?.includes('Unauthorized') ? 403 : 500
          return new Response(JSON.stringify({ error: err.message }), {
            status,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
    },
  },
})
