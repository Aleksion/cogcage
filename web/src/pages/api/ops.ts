import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { getFunnelCounts } from '../../lib/waitlist-db';

export const prerender = false;

const LOG_DIR = process.env.COGCAGE_LOG_DIR ?? path.join(process.cwd(), '..', 'ops', 'runtime');

type RuntimeFile = {
  file: string;
  exists: boolean;
  lines: number;
  bytes: number;
  tail: string[];
};

function readTail(filePath: string, tailLines = 20): RuntimeFile {
  if (!fs.existsSync(filePath)) {
    return {
      file: path.basename(filePath),
      exists: false,
      lines: 0,
      bytes: 0,
      tail: [],
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(Boolean);

  return {
    file: path.basename(filePath),
    exists: true,
    lines: lines.length,
    bytes: Buffer.byteLength(content),
    tail: lines.slice(-tailLines),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const key = process.env.COGCAGE_OPS_KEY;
  const provided = request.headers.get('x-ops-key') ?? new URL(request.url).searchParams.get('key');

  if (key && provided !== key) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const files = [
    readTail(path.join(LOG_DIR, 'api-events.ndjson')),
    readTail(path.join(LOG_DIR, 'waitlist-fallback.ndjson')),
    readTail(path.join(LOG_DIR, 'founder-intent-fallback.ndjson')),
    readTail(path.join(LOG_DIR, 'events-fallback.ndjson')),
  ];

  let counts;
  try {
    counts = getFunnelCounts();
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Could not read funnel counts',
      detail: error instanceof Error ? error.message : 'unknown-error',
      files,
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    ts: new Date().toISOString(),
    counts,
    files,
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
