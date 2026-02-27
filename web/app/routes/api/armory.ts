import { createFileRoute } from '@tanstack/react-router'
import { getLoadouts, saveLoadout } from '~/lib/armory'
import { getCookie } from '~/lib/cookies'

export const Route = createFileRoute('/api/armory')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const playerId = getCookie(request, 'moltpit_pid')
        if (!playerId) {
          return new Response(JSON.stringify({ loadouts: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }

        try {
          const loadouts = await getLoadouts(playerId)
          return new Response(JSON.stringify({ loadouts }), {
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
          const { name, cards, brainPrompt, skills } = body

          if (!name || !Array.isArray(cards)) {
            return new Response(
              JSON.stringify({ error: 'name and cards[] required' }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            )
          }

          const result = await saveLoadout(
            playerId,
            name,
            cards,
            brainPrompt || '',
            Array.isArray(skills) ? skills : [],
          )
          if (result.error) {
            return new Response(
              JSON.stringify({ error: result.error, loadouts: result.loadouts }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            )
          }

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
