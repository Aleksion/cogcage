import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = process.env.COGCAGE_LOG_DIR ?? path.join(process.cwd(), '..', 'ops', 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'api-events.ndjson');
const FALLBACK_WAITLIST_FILE = path.join(LOG_DIR, 'waitlist-fallback.ndjson');

export function appendOpsLog(event: Record<string, unknown>) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(
      LOG_FILE,
      `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`,
      'utf8'
    );
  } catch {
    // Never fail request because log write failed.
  }
}

export function appendWaitlistFallback(payload: Record<string, unknown>) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(
    FALLBACK_WAITLIST_FILE,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`,
    'utf8'
  );
}
