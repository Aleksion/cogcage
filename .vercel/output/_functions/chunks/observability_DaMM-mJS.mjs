import fs from 'node:fs';
import path from 'node:path';
import { f as ensureRuntimeDir } from './waitlist-db_D5cP36a2.mjs';

const LOG_DIR = process.env.COGCAGE_LOG_DIR ?? ensureRuntimeDir();
const LOG_FILE = path.join(LOG_DIR, "api-events.ndjson");
const FALLBACK_WAITLIST_FILE = path.join(LOG_DIR, "waitlist-fallback.ndjson");
const FALLBACK_FOUNDER_INTENT_FILE = path.join(LOG_DIR, "founder-intent-fallback.ndjson");
const FALLBACK_EVENTS_FILE = path.join(LOG_DIR, "events-fallback.ndjson");
function appendLine(filePath, payload) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(
    filePath,
    `${JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), ...payload })}
`,
    "utf8"
  );
}
function appendOpsLog(event) {
  try {
    appendLine(LOG_FILE, event);
  } catch {
  }
}
function appendWaitlistFallback(payload) {
  appendLine(FALLBACK_WAITLIST_FILE, payload);
}
function appendFounderIntentFallback(payload) {
  appendLine(FALLBACK_FOUNDER_INTENT_FILE, payload);
}
function appendEventsFallback(payload) {
  appendLine(FALLBACK_EVENTS_FILE, payload);
}

export { appendOpsLog as a, appendEventsFallback as b, appendFounderIntentFallback as c, appendWaitlistFallback as d };
