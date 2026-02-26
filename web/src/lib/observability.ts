import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = process.env.COGCAGE_LOG_DIR ?? path.join(process.cwd(), '..', 'ops', 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'api-events.ndjson');
const FALLBACK_WAITLIST_FILE = path.join(LOG_DIR, 'waitlist-fallback.ndjson');

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