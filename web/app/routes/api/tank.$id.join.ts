import { createFileRoute } from '@tanstack/react-router'
import { joinLobby } from '~/lib/lobby'
import { getCookie } from '~/lib/cookies'

export const Route = createFileRoute('/api/tank/$id/join')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const { id } = params
        const playerId = getCookie(request, 'moltpit_pid')
        if (!id || !playerId) {
          return new Response(
            JSON.stringify({ error: 'Missing id or player' }),
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

          const lobby = await joinLobby(id, playerId, loadoutId)
          return new Response(
            JSON.stringify({ ok: true, status: lobby.status }),
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
