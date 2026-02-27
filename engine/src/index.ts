export { MatchEngine } from './MatchEngine.js';

interface Env {
  MATCH: DurableObjectNamespace;
  COGCAGE_ENGINE_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Health check
    if (path === '/health' || path === '/') {
      return jsonResponse({ ok: true, service: 'themoltpit-engine', version: '0.1.0' });
    }

    // Route /match/:id/* → MatchEngine DO
    const matchRoute = path.match(/^\/match\/([^/]+)(\/.*)?$/);
    if (matchRoute) {
      const matchId = matchRoute[1];
      const id = env.MATCH.idFromName(matchId);
      const stub = env.MATCH.get(id);

      // Forward the request to the DO, preserving the full path
      return stub.fetch(request);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
