import { createFileRoute } from '@tanstack/react-router'
import { startLobbyMatch } from '~/lib/lobby'

const ENGINE_URL =
  process.env.ENGINE_URL ??
  'https://themoltpit-engine.aleks-precurion.workers.dev'
const ENGINE_SECRET = process.env.MOLTPIT_ENGINE_SECRET ?? ''

export const Route = createFileRoute('/api/lobby/$id/start')({
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
