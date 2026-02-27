import fs from 'node:fs';
import path from 'node:path';
import { ensureRuntimeDir } from './runtime-paths';

function getLogPaths() {
  const logDir = process.env.COGCAGE_LOG_DIR ?? ensureRuntimeDir();
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
 * Emit structured log entry to both:
 *   1. NDJSON file in runtime dir (readable via /api/ops endpoint)
 *   2. stdout/stderr (captured by Vercel function logs — survives ephemeral /tmp)
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
      console.error('[cogcage]', line);
    } else if (level === 'warn') {
      console.warn('[cogcage]', line);
    } else {
      console.log('[cogcage]', line);
    }
  } catch {
    // Serialization failure — never crash the request.
  }

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
    console.warn('[cogcage:fallback:waitlist]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    // ignore
  }
  appendLine(getLogPaths().waitlistFallbackFile, payload);
}

export function appendFounderIntentFallback(payload: Record<string, unknown>) {
  try {
    console.warn('[cogcage:fallback:founder]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    // ignore
  }
  appendLine(getLogPaths().founderIntentFallbackFile, payload);
}

export function appendEventsFallback(payload: Record<string, unknown>) {
  try {
    console.warn('[cogcage:fallback:events]', JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    // ignore
  }
  appendLine(getLogPaths().eventsFallbackFile, payload);
}
