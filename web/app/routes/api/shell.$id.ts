import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { getCookie } from '~/lib/cookies'
import type { Id } from '../../../convex/_generated/dataModel'
import { calculateLoadoutStats } from '~/lib/cards'

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://intent-horse-742.convex.cloud')

function normalizeShell(raw: any) {
  const cards = Array.isArray(raw?.cards) ? raw.cards.filter((x: unknown) => typeof x === 'string') : []
  const stats = raw?.stats && typeof raw.stats === 'object'
    ? {
        totalWeight: Number(raw.stats.totalWeight) || 0,
        totalOverhead: Number(raw.stats.totalOverhead) || 0,
        armorValue: Number(raw.stats.armorValue) || 0,
      }
    : calculateLoadoutStats(cards)
  return {
    id: String(raw?._id),
    name: String(raw?.name ?? 'Unnamed Shell'),
    cards,
    brainPrompt: String(raw?.directive ?? ''),
    skills: Array.isArray(raw?.skills) ? raw.skills.filter((x: unknown) => typeof x === 'string').slice(0, 3) : [],
    createdAt: Number(raw?.createdAt) || Date.now(),
    stats,
  }
}

export const Route = createFileRoute('/api/shell/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const token =
          request.headers.get('Authorization')?.replace('Bearer ', '') ??
          getCookie(request, '__convexAuthJWT')
        if (!token) {
          return new Response(JSON.stringify({ error: 'Not authenticated' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
        }

        const shellId = params.id
        if (!shellId) {
          return new Response(
            JSON.stringify({ error: 'Shell ID required' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        try {
          convex.setAuth(token)
          await convex.mutation(api.shells.remove, {
            shellId: shellId as Id<'shells'>,
          })
          const shells = await convex.query(api.shells.list)
          return new Response(JSON.stringify({ loadouts: shells.map(normalizeShell) }), {
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
