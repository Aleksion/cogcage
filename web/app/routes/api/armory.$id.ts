import { createFileRoute } from '@tanstack/react-router'
import { deleteLoadout } from '~/lib/armory'
import { getCookie } from '~/lib/cookies'

export const Route = createFileRoute('/api/armory/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const playerId = getCookie(request, 'moltpit_pid')
        if (!playerId) {
          return new Response(JSON.stringify({ error: 'No player ID' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
        }

        const loadoutId = params.id
        if (!loadoutId) {
          return new Response(
            JSON.stringify({ error: 'Loadout ID required' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        try {
          const result = await deleteLoadout(playerId, loadoutId)
          return new Response(JSON.stringify({ loadouts: result.loadouts }), {
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
