import fs from 'node:fs';
import path from 'node:path';
import { insertConversionEvent, insertFounderIntent, insertWaitlistLead } from './waitlist-db';
import { ensureRuntimeDir } from './runtime-paths';

type DrainStats = {
  processed: number;
  inserted: number;
  kept: number;
  parseFailed: number;
  insertFailed: number;
};

const WAITLIST_FILE = 'waitlist-fallback.ndjson';
const FOUNDER_FILE = 'founder-intent-fallback.ndjson';
const EVENTS_FILE = 'events-fallback.ndjson';

function runtimeFile(file: string) {
  const dir = process.env.MOLTPIT_LOG_DIR ?? ensureRuntimeDir();
  return path.join(dir, file);
}

function drainFile(
  filePath: string,
  insertRow: (row: Record<string, unknown>) => void,
  maxRows = 50
): DrainStats {
  const empty: DrainStats = { processed: 0, inserted: 0, kept: 0, parseFailed: 0, insertFailed: 0 };
  if (!fs.existsSync(filePath)) return empty;

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  if (!lines.length) return empty;

  const rest: string[] = [];
  const stats: DrainStats = { ...empty };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (stats.processed >= maxRows) {
      rest.push(line);
      continue;
    }

    stats.processed += 1;

    try {
      const row = JSON.parse(line) as Record<string, unknown>;
      try {
        insertRow(row);
        stats.inserted += 1;
      } catch {
        stats.insertFailed += 1;
        rest.push(line);
      }
    } catch {
      stats.parseFailed += 1;
      // drop irrecoverable malformed line
    }
  }

  stats.kept = rest.length;

  const next = rest.length ? `${rest.join('\n')}\n` : '';
  const temp = `${filePath}.tmp`;
  fs.writeFileSync(temp, next, 'utf8');
  fs.renameSync(temp, filePath);

  return stats;
}

export function drainFallbackQueues(maxRowsPerFile = 50) {
  const waitlist = drainFile(runtimeFile(WAITLIST_FILE), (row) => {
    insertWaitlistLead({
      email: String(row.email || '').toLowerCase(),
      game: String(row.game || 'Unspecified'),
      source: String(row.source || 'fallback-replay'),
      userAgent: typeof row.userAgent === 'string' ? row.userAgent : undefined,
      ipAddress: typeof row.ipAddress === 'string' ? row.ipAddress : undefined,
    });
  }, maxRowsPerFile);

  const founder = drainFile(runtimeFile(FOUNDER_FILE), (row) => {
    insertFounderIntent({
      email: String(row.email || '').toLowerCase(),
      source: String(row.source || 'fallback-replay'),
      intentId: typeof row.intentId === 'string' ? row.intentId : undefined,
      userAgent: typeof row.userAgent === 'string' ? row.userAgent : undefined,
      ipAddress: typeof row.ipAddress === 'string' ? row.ipAddress : undefined,
    });
  }, maxRowsPerFile);

  const events = drainFile(runtimeFile(EVENTS_FILE), (row) => {
    insertConversionEvent({
      eventName: String(row.eventName || 'fallback_event'),
      eventId: typeof row.eventId === 'string' ? row.eventId : undefined,
      page: typeof row.page === 'string' ? row.page : undefined,
      href: typeof row.href === 'string' ? row.href : undefined,
      tier: typeof row.tier === 'string' ? row.tier : undefined,
      source: typeof row.source === 'string' ? row.source : undefined,
      email: typeof row.email === 'string' ? row.email.toLowerCase() : undefined,
      metaJson: typeof row.metaJson === 'string' ? row.metaJson : undefined,
      userAgent: typeof row.userAgent === 'string' ? row.userAgent : undefined,
      ipAddress: typeof row.ipAddress === 'string' ? row.ipAddress : undefined,
    });
  }, maxRowsPerFile);

  return {
    waitlist,
    founder,
    events,
  };
}
