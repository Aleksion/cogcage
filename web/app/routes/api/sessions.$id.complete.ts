import { createFileRoute } from '@tanstack/react-router'
import { completeMatch, completeFfaMatch, getSession } from '~/lib/session'

/** POST /api/sessions/:id/complete — Complete current match (bracket or FFA) */
export const Route = createFileRoute('/api/sessions/$id/complete')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const sessionId = params.id;
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Missing session id' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        try {
          const body = await request.json();
          const { matchId, winnerId, hostParticipantId } = body;

          if (!matchId) {
            return new Response(JSON.stringify({ error: 'matchId required' }), {
              status: 400,
              headers: { 'content-type': 'application/json' },
            });
          }

          // Verify host
          const session = await getSession(sessionId);
          if (!session) {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
              status: 404,
              headers: { 'content-type': 'application/json' },
            });
          }
          if (session.hostParticipantId !== hostParticipantId) {
            return new Response(JSON.stringify({ error: 'Only host can complete matches' }), {
              status: 403,
              headers: { 'content-type': 'application/json' },
            });
          }

          // FFA completion path
          if (matchId === 'ffa') {
            const placements = body.placements ?? [];
            const result = await completeFfaMatch(sessionId, winnerId ?? null, placements);
            return new Response(JSON.stringify({ ...result, done: true, nextMatchId: null }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            });
          }

          // Bracket completion path
          if (!winnerId) {
            return new Response(JSON.stringify({ error: 'winnerId required for bracket match' }), {
              status: 400,
              headers: { 'content-type': 'application/json' },
            });
          }

          const { scoreA, scoreB } = body;
          const result = await completeMatch(sessionId, matchId, winnerId, scoreA ?? 0, scoreB ?? 0);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          const status = err.message.includes('not found') ? 404 : 400;
          return new Response(JSON.stringify({ error: err.message }), {
            status,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
})
