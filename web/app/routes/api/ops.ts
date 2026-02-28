import fs from 'node:fs'
import path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { getFunnelCounts, getReliabilitySnapshot, getStorageHealth } from '~/lib/waitlist-db'
import { drainFallbackQueues } from '~/lib/fallback-drain'
import { getRuntimeDir } from '~/lib/runtime-paths'
import { redisGetOpsLogTail, redisGetFunnelCounts } from '~/lib/waitlist-redis'

const LOG_DIR = process.env.MOLTPIT_LOG_DIR ?? getRuntimeDir();

type RuntimeFile = {
  file: string;
  exists: boolean;
  lines: number;
  lineCountApprox: boolean;
  bytes: number;
  tail: string[];
};

function readTail(filePath: string, tailLines = 20): RuntimeFile {
  if (!fs.existsSync(filePath)) {
    return {
      file: path.basename(filePath),
      exists: false,
      lines: 0,
      lineCountApprox: false,
      bytes: 0,
      tail: [],
    };
  }

  const stats = fs.statSync(filePath);
  const bytes = stats.size;
  const readStart = Math.max(0, bytes - 256 * 1024);
  const fd = fs.openSync(filePath, 'r');
  let content = '';

  try {
    const length = bytes - readStart;
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, readStart);
    content = buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }

  const lines = content.split('\n').filter(Boolean);

  return {
    file: path.basename(filePath),
    exists: true,
    lines: lines.length,
    lineCountApprox: readStart > 0,
    bytes,
    tail: lines.slice(-tailLines),
  };
}

function isAuthorized(request: Request) {
  const key = process.env.MOLTPIT_OPS_KEY;
  const provided = request.headers.get('x-ops-key') ?? new URL(request.url).searchParams.get('key');
  return !key || provided === key;
}

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

export const Route = createFileRoute('/api/ops')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) {
          return unauthorized();
        }

        const files = [
          readTail(path.join(LOG_DIR, 'api-events.ndjson')),
          readTail(path.join(LOG_DIR, 'waitlist-fallback.ndjson')),
          readTail(path.join(LOG_DIR, 'founder-intent-fallback.ndjson')),
          readTail(path.join(LOG_DIR, 'events-fallback.ndjson')),
        ];

        let counts;
        let reliability;
        let storage;
        try {
          counts = getFunnelCounts();
          reliability = getReliabilitySnapshot(24);
          storage = getStorageHealth();
        } catch (error) {
          counts = null;
          reliability = null;
          storage = { error: error instanceof Error ? error.message : 'unknown-error' };
        }

        // Redis-backed ops data — primary observable layer on Vercel (SQLite/filesystem are ephemeral per-invocation)
        let redisCounts = null;
        let redisOpsLog: string[] = [];
        try {
          [redisCounts, redisOpsLog] = await Promise.all([
            redisGetFunnelCounts(),
            redisGetOpsLogTail(50),
          ]);
        } catch {
          // Redis unavailable — degrade gracefully, SQLite counts still show
        }

        const queueBacklog = {
          waitlistFallbackLines: files.find((file) => file.file === 'waitlist-fallback.ndjson')?.lines ?? 0,
          founderIntentFallbackLines: files.find((file) => file.file === 'founder-intent-fallback.ndjson')?.lines ?? 0,
          eventsFallbackLines: files.find((file) => file.file === 'events-fallback.ndjson')?.lines ?? 0,
        };

        return new Response(JSON.stringify({
          ok: true,
          ts: new Date().toISOString(),
          counts,
          redisCounts,
          redisOpsLog,
          reliability,
          storage,
          runtimeDir: LOG_DIR,
          queueBacklog,
          files,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
      POST: async ({ request }) => {
        if (!isAuthorized(request)) {
          return unauthorized();
        }

        const url = new URL(request.url);
        const maxRows = Number(url.searchParams.get('maxRows') ?? '50');
        const safeMaxRows = Number.isFinite(maxRows) ? Math.max(1, Math.min(500, Math.floor(maxRows))) : 50;

        try {
          const drained = drainFallbackQueues(safeMaxRows);
          return new Response(JSON.stringify({
            ok: true,
            ts: new Date().toISOString(),
            maxRowsPerFile: safeMaxRows,
            drained,
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'Fallback drain failed',
            detail: error instanceof Error ? error.message : 'unknown-error',
          }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
})
