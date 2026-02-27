import fs from 'node:fs';
import path from 'node:path';
import { ensureRuntimeDir } from './runtime-paths';

function getLogPaths() {
  const logDir = process.env.MOLTPIT_LOG_DIR ?? ensureRuntimeDir();
  return {
    logDir,
    logFile: path.join(logDir, 'api-events.ndjson'),
    waitlistFallbackFile: path.join(logDir, 'waitlist-fallback.ndjson'),
    founderIntentFallbackFile: path.join(logDir, 'founder-intent-fallback.ndjson'),
    eventsFallbackFile: path.join(logDir, 'events-fallback.ndjson'),
  };
}

function appendLine(filePath: string, payload: Record<string, unknown>) {
  const logDir = path.dirname(filePath);
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    filePath,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`,
    'utf8'
  );
}

/**
 * Fire-and-forget Redis ops log write.
 * Lazy import avoids circular deps and keeps this module sync-compatible.
 * Never throws — any failure is silently swallowed.
 */
function fireRedisOpsLog(entry: Record<string, unknown>): void {
  try {
    // Dynamic import keeps this module free of hard Upstash dep at module load time.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    import('./waitlist-redis').then(({ redisAppendOpsLog }) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      redisAppendOpsLog(entry).catch(() => {
        // Redis write failure — silently swallow, never crash the request.
      });
    }).catch(() => {
      // Import failure — not possible at runtime but guard anyway.
    });
  } catch {
    // Absolute last resort.
  }
}

/**
 * Emit structured log entry to:
 *   1. stdout/stderr (captured by Vercel function logs — survives ephemeral /tmp)
 *   2. NDJSON file in runtime dir (best-effort; /tmp on Vercel is ephemeral per-invocation)
 *   3. Redis ops log via fire-and-forget (durable across invocations, readable from /api/ops)
 *
 * Vercel log levels: console.error → "error", console.warn → "warning", console.log → "info"
 */
export function appendOpsLog(event: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), ...event };
  const level = typeof event.level === 'string' ? event.level : 'info';

  // Always emit to stdout — Vercel function logs capture this.
  try {
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error('[moltpit]', line);
    } else if (level === 'warn') {
      console.warn('[moltpit]', line);
    } else {
      console.log('[moltpit]', line);
    }
  } catch {
    // Serialization failure — never crash the request.
  }

  // Persist to Redis ops log (durable, readable from /api/ops redisOpsLog field).
  fireRedisOpsLog(entry);

  // Also persist to file (best-effort; /tmp on Vercel is ephemeral per-invocation).
  try {
    appendLine(getLogPaths().logFile, event);
  } catch {
    // Never fail request because file write failed.
  }
}

export function appendWaitlistFallback(payload: Record<string, unknown>) {
  // Emit to stdout so fallback queuing is visible in Vercel logs.
  try {
    console.warn('[moltpit:fallback:waitlist]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    // ignore
  }
  appendLine(getLogPaths().waitlistFallbackFile, payload);
}

export function appendFounderIntentFallback(payload: Record<string, unknown>) {
  try {
    console.warn('[moltpit:fallback:founder]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    // ignore
  }
  appendLine(getLogPaths().founderIntentFallbackFile, payload);
}

export function appendEventsFallback(payload: Record<string, unknown>) {
  try {
    console.warn('[moltpit:fallback:events]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    // ignore
  }
  appendLine(getLogPaths().eventsFallbackFile, payload);
}
