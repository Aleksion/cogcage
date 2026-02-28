import { createFileRoute } from '@tanstack/react-router'
import { listOpenLobbies, createLobby } from '~/lib/lobby'
import { getCookie } from '~/lib/cookies'

export const Route = createFileRoute('/api/tank')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const lobbies = await listOpenLobbies()
          return new Response(JSON.stringify({ lobbies }), {
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
        const playerId = getCookie(request, 'moltpit_pid')
        if (!playerId) {
          return new Response(JSON.stringify({ error: 'No player ID' }), {
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

          const lobby = await createLobby(playerId, loadoutId)
          return new Response(JSON.stringify({ lobbyId: lobby.id }), {
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
