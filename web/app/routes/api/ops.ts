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

type CriticalPathSummary = {
  signup: {
    waitlistSubmitted: number;
    waitlistDegraded: number;
    waitlistQueued: number;
    waitlistFailed: number;
    founderIntentSubmitted: number;
    founderIntentDegraded: number;
    founderIntentQueued: number;
    founderIntentFailed: number;
  };
  monetization: {
    checkoutConfirmed: number;
    checkoutDegraded: number;
    checkoutQueued: number;
    checkoutFailed: number;
    postbackRecorded: number;
    postbackReplayed: number;
    postbackDegraded: number;
    postbackQueued: number;
    postbackFailed: number;
  };
  opsLevels: {
    warn: number;
    error: number;
  };
};

function parseOpsLine(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // ignore malformed lines in summary
  }
  return null;
}

function summarizeCriticalPath(lines: string[]): CriticalPathSummary {
  const summary: CriticalPathSummary = {
    signup: {
      waitlistSubmitted: 0,
      waitlistDegraded: 0,
      waitlistQueued: 0,
      waitlistFailed: 0,
      founderIntentSubmitted: 0,
      founderIntentDegraded: 0,
      founderIntentQueued: 0,
      founderIntentFailed: 0,
    },
    monetization: {
      checkoutConfirmed: 0,
      checkoutDegraded: 0,
      checkoutQueued: 0,
      checkoutFailed: 0,
      postbackRecorded: 0,
      postbackReplayed: 0,
      postbackDegraded: 0,
      postbackQueued: 0,
      postbackFailed: 0,
    },
    opsLevels: {
      warn: 0,
      error: 0,
    },
  };

  for (const line of lines) {
    const entry = parseOpsLine(line);
    if (!entry) continue;

    const level = typeof entry.level === 'string' ? entry.level : '';
    if (level === 'warn') summary.opsLevels.warn += 1;
    if (level === 'error') summary.opsLevels.error += 1;

    const event = typeof entry.event === 'string' ? entry.event : '';
    const outcome = typeof entry.outcome === 'string' ? entry.outcome : '';

    if (event === 'waitlist_request_completed') {
      if (outcome === 'submitted') summary.signup.waitlistSubmitted += 1;
      else if (outcome === 'submitted_degraded') {
        summary.signup.waitlistSubmitted += 1;
        summary.signup.waitlistDegraded += 1;
      } else if (outcome === 'queued_fallback') {
        summary.signup.waitlistQueued += 1;
      } else if (outcome === 'failed') {
        summary.signup.waitlistFailed += 1;
      }
    }

    if (event === 'founder_intent_request_completed') {
      if (outcome === 'submitted') summary.signup.founderIntentSubmitted += 1;
      else if (outcome === 'submitted_degraded') {
        summary.signup.founderIntentSubmitted += 1;
        summary.signup.founderIntentDegraded += 1;
      } else if (outcome === 'queued_fallback') {
        summary.signup.founderIntentQueued += 1;
      } else if (outcome === 'failed') {
        summary.signup.founderIntentFailed += 1;
      }
    }

    if (event === 'checkout_success_request_completed') {
      if (outcome === 'recorded') summary.monetization.checkoutConfirmed += 1;
      else if (outcome === 'recorded_degraded') {
        summary.monetization.checkoutConfirmed += 1;
        summary.monetization.checkoutDegraded += 1;
      } else if (outcome === 'queued_fallback') {
        summary.monetization.checkoutQueued += 1;
      } else if (outcome === 'idempotent_replay') {
        summary.monetization.checkoutConfirmed += 1;
      } else if (outcome === 'failed') {
        summary.monetization.checkoutFailed += 1;
      }
    }

    if (event === 'postback_request_completed') {
      if (outcome === 'recorded') summary.monetization.postbackRecorded += 1;
      else if (outcome === 'recorded_degraded') {
        summary.monetization.postbackRecorded += 1;
        summary.monetization.postbackDegraded += 1;
      } else if (outcome === 'queued_fallback') {
        summary.monetization.postbackQueued += 1;
      } else if (outcome === 'idempotent_replay') {
        summary.monetization.postbackReplayed += 1;
      } else if (outcome === 'failed') {
        summary.monetization.postbackFailed += 1;
      }
    }
  }

  return summary;
}

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
        // Auth is optional for GET — ops log is diagnostic data, not sensitive.
        // Pass ?key=... or x-ops-key header to get filesystem tails (when key is configured).
        const authorized = isAuthorized(request);

        const files = authorized ? [
          readTail(path.join(LOG_DIR, 'api-events.ndjson')),
          readTail(path.join(LOG_DIR, 'waitlist-fallback.ndjson')),
          readTail(path.join(LOG_DIR, 'founder-intent-fallback.ndjson')),
          readTail(path.join(LOG_DIR, 'events-fallback.ndjson')),
        ] : [];

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
        const fileOpsLogTail = files.find((file) => file.file === 'api-events.ndjson')?.tail ?? [];
        const criticalPath = summarizeCriticalPath(redisOpsLog.length > 0 ? redisOpsLog : fileOpsLogTail);

        // Recent commits — build-time manifest (hardcoded for reliability on serverless)
        const recentCommits = [
          { sha: 'HEAD', msg: 'fix(p1): signup retry UX + queued replay controls surfaced on landing forms' },
          { sha: 'HEAD~1', msg: 'feat(p2): demo loop AP feedback now shows regen/spend and forced WAIT reason' },
          { sha: 'HEAD~2', msg: 'fix(p3): checkout-success idempotency + deterministic replay contract' },
          { sha: 'HEAD~3', msg: 'ops(p4): critical-path summary on /api/ops for signup+monetization outcomes' },
          { sha: 'HEAD~4', msg: 'test: api-critical-routes adds checkout-success duplicate replay coverage' },
        ];

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
          criticalPath,
          files,
          recentCommits,
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
