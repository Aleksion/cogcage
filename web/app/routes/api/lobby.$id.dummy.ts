import { createFileRoute } from '@tanstack/react-router'
import { addDummy } from '~/lib/lobby'

export const Route = createFileRoute('/api/lobby/$id/dummy')({
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
          const lobby = await addDummy(id)
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
