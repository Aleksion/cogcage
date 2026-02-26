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

export function appendOpsLog(event: Record<string, unknown>) {
  try {
    appendLine(getLogPaths().logFile, event);
  } catch {
    // Never fail request because log write failed.
  }
}

export function appendWaitlistFallback(payload: Record<string, unknown>) {
  appendLine(getLogPaths().waitlistFallbackFile, payload);
}

export function appendFounderIntentFallback(payload: Record<string, unknown>) {
  appendLine(getLogPaths().founderIntentFallbackFile, payload);
}

export function appendEventsFallback(payload: Record<string, unknown>) {
  appendLine(getLogPaths().eventsFallbackFile, payload);
}
