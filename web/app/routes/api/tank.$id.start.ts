import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { getCookie } from '~/lib/cookies'
import type { Id } from '../../../convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

// ENGINE_URL: prefer explicit HTTP var, fall back to WS URL (strip wss:// -> https://), then hardcoded default
const ENGINE_URL = (() => {
  const raw = process.env.ENGINE_URL ?? process.env.PUBLIC_ENGINE_WS_URL ?? ''
  return raw.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://') ||
    'https://themoltpit-engine.aleks-precurion.workers.dev'
})()
const ENGINE_SECRET = process.env.MOLTPIT_ENGINE_SECRET ?? ''

export const Route = createFileRoute('/api/tank/$id/start')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const { id } = params
        const token =
          request.headers.get('Authorization')?.replace('Bearer ', '') ??
          getCookie(request, '__convexAuthJWT')
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'Missing tank id' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        try {
          // Auth-gated: mark tank as active (host only)
          if (token) convex.setAuth(token)
          await convex.mutation(api.tanks.startMolt, {
            tankId: id as Id<'tanks'>,
          })

          // Get full tank data for engine call
          const tank = await convex.query(api.tanks.get, {
            tankId: id as Id<'tanks'>,
          })
          if (!tank) {
            return new Response(
              JSON.stringify({ error: 'Tank not found after start' }),
              { status: 500, headers: { 'content-type': 'application/json' } },
            )
          }

          // Resolve shell snapshots
          const hostShell = await convex.query(api.shells.get, { shellId: tank.hostShellId })
          let challengerShell = null
          if (tank.challengerShellId) {
            challengerShell = await convex.query(api.shells.get, { shellId: tank.challengerShellId })
          }
          if (!hostShell || !challengerShell) {
            return new Response(
              JSON.stringify({ error: 'Could not resolve shells' }),
              { status: 500, headers: { 'content-type': 'application/json' } },
            )
          }

          // Build bot snapshots compatible with engine format
          const botA = {
            botName: hostShell.name,
            brainPrompt: hostShell.directive,
            skills: hostShell.skills,
            cards: hostShell.cards,
            actionTypes: [],
            armor: 'light' as const,
            moveCost: 1,
          }
          const botB = {
            botName: challengerShell.name,
            brainPrompt: challengerShell.directive,
            skills: challengerShell.skills,
            cards: challengerShell.cards,
            actionTypes: [],
            armor: 'light' as const,
            moveCost: 1,
          }

          const matchId = id
          const seed = Date.now()
          const doRes = await fetch(`${ENGINE_URL}/match/${matchId}/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(ENGINE_SECRET
                ? { Authorization: `Bearer ${ENGINE_SECRET}` }
                : {}),
            },
            body: JSON.stringify({ botA, botB, seed }),
          })

          if (!doRes.ok) {
            const body = await doRes.text()
            console.error(
              `[tank/start] DO start failed (${doRes.status}): ${body}`,
            )
            return new Response(
              JSON.stringify({ error: 'Engine start failed', detail: body }),
              { status: 502, headers: { 'content-type': 'application/json' } },
            )
          }

          return new Response(
            JSON.stringify({ matchId, botA, botB, seed }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        } catch (err: any) {
          const status = err.message?.includes('Only the host') ? 403 : 500
          return new Response(JSON.stringify({ error: err.message }), {
            status,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
    },
  },
})
