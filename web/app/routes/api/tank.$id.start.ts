import { createFileRoute } from '@tanstack/react-router'
import { startLobbyMatch } from '~/lib/lobby'

// ENGINE_URL: prefer explicit HTTP var, fall back to WS URL (strip wss:// → https://), then hardcoded default
const ENGINE_URL = (() => {
  const raw = process.env.ENGINE_URL ?? process.env.PUBLIC_ENGINE_WS_URL ?? ''
  return raw.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://') ||
    'https://themoltpit-engine.aleks-precurion.workers.dev'
})()
const ENGINE_SECRET = process.env.MOLTPIT_ENGINE_SECRET ?? ''

export const Route = createFileRoute('/api/tank/$id/start')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const { id } = params
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'Missing lobby id' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        try {
          const { botA, botB, seed } = await startLobbyMatch(id)
          const matchId = id
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
              `[lobby/start] DO start failed (${doRes.status}): ${body}`,
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
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        }
      },
    },
  },
})
