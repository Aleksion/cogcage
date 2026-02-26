import fs from 'node:fs';
import path from 'node:path';
import { ensureRuntimeDir } from './runtime-paths';

const LOG_DIR = process.env.COGCAGE_LOG_DIR ?? ensureRuntimeDir();
const LOG_FILE = path.join(LOG_DIR, 'api-events.ndjson');
const FALLBACK_WAITLIST_FILE = path.join(LOG_DIR, 'waitlist-fallback.ndjson');
const FALLBACK_FOUNDER_INTENT_FILE = path.join(LOG_DIR, 'founder-intent-fallback.ndjson');
const FALLBACK_EVENTS_FILE = path.join(LOG_DIR, 'events-fallback.ndjson');

function appendLine(filePath: string, payload: Record<string, unknown>) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(
    filePath,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`,
    'utf8'
  );
}

export function appendOpsLog(event: Record<string, unknown>) {
  try {
    appendLine(LOG_FILE, event);
  } catch {
    // Never fail request because log write failed.
  }
}

export function appendWaitlistFallback(payload: Record<string, unknown>) {
  appendLine(FALLBACK_WAITLIST_FILE, payload);
}

export function appendFounderIntentFallback(payload: Record<string, unknown>) {
  appendLine(FALLBACK_FOUNDER_INTENT_FILE, payload);
}

export function appendEventsFallback(payload: Record<string, unknown>) {
  appendLine(FALLBACK_EVENTS_FILE, payload);
}
