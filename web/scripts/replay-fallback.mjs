import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const cwd = process.cwd();
const dbPath = process.env.COGCAGE_DB_PATH ?? path.join(cwd, 'data', 'cogcage.db');
const runtimeDir = process.env.COGCAGE_LOG_DIR ?? path.join(cwd, '..', 'ops', 'runtime');

const files = {
  waitlist: path.join(runtimeDir, 'waitlist-fallback.ndjson'),
  founderIntent: path.join(runtimeDir, 'founder-intent-fallback.ndjson'),
  events: path.join(runtimeDir, 'events-fallback.ndjson'),
};

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const upsertWaitlist = db.prepare(`
  INSERT INTO waitlist_leads (email, game, source, user_agent, ip_address)
  VALUES (@email, @game, @source, @userAgent, @ipAddress)
  ON CONFLICT(email) DO UPDATE SET
    game=excluded.game,
    source=excluded.source,
    user_agent=excluded.user_agent,
    ip_address=excluded.ip_address,
    created_at=CURRENT_TIMESTAMP
`);

const upsertFounderIntent = db.prepare(`
  INSERT INTO founder_intents (email, source, intent_id, user_agent, ip_address)
  VALUES (@email, @source, @intentId, @userAgent, @ipAddress)
  ON CONFLICT(intent_id) DO UPDATE SET
    source=excluded.source,
    user_agent=excluded.user_agent,
    ip_address=excluded.ip_address,
    created_at=CURRENT_TIMESTAMP
`);

const insertEvent = db.prepare(`
  INSERT INTO conversion_events (
    event_name,
    event_id,
    page,
    href,
    tier,
    source,
    email,
    meta_json,
    user_agent,
    ip_address
  )
  VALUES (
    @eventName,
    @eventId,
    @page,
    @href,
    @tier,
    @source,
    @email,
    @metaJson,
    @userAgent,
    @ipAddress
  )
  ON CONFLICT(event_id) DO NOTHING
`);

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const target = `${filePath}.replayed-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.renameSync(filePath, target);
  return target;
}

let waitlistCount = 0;
let founderCount = 0;
let eventCount = 0;

const tx = db.transaction(() => {
  for (const row of readNdjson(files.waitlist)) {
    if (!row.email) continue;
    upsertWaitlist.run({
      email: String(row.email).toLowerCase(),
      game: row.game ? String(row.game) : 'Unspecified',
      source: row.source ? String(row.source) : 'fallback-replay',
      userAgent: row.userAgent ? String(row.userAgent) : null,
      ipAddress: row.ipAddress ? String(row.ipAddress) : null,
    });
    waitlistCount += 1;
  }

  for (const row of readNdjson(files.founderIntent)) {
    if (!row.email) continue;
    upsertFounderIntent.run({
      email: String(row.email).toLowerCase(),
      source: row.source ? String(row.source) : 'founder-checkout',
      intentId: row.intentId ? String(row.intentId) : row.requestId ? `legacy:${row.requestId}` : null,
      userAgent: row.userAgent ? String(row.userAgent) : null,
      ipAddress: row.ipAddress ? String(row.ipAddress) : null,
    });
    founderCount += 1;
  }

  for (const row of readNdjson(files.events)) {
    if (!row.eventName) continue;
    insertEvent.run({
      eventName: String(row.eventName),
      eventId: row.eventId ? String(row.eventId) : null,
      page: row.page ? String(row.page) : null,
      href: row.href ? String(row.href) : null,
      tier: row.tier ? String(row.tier) : null,
      source: row.source ? String(row.source) : null,
      email: row.email ? String(row.email).toLowerCase() : null,
      metaJson: row.metaJson ? String(row.metaJson) : null,
      userAgent: row.userAgent ? String(row.userAgent) : null,
      ipAddress: row.ipAddress ? String(row.ipAddress) : null,
    });
    eventCount += 1;
  }
});

tx();

const moved = [backupFile(files.waitlist), backupFile(files.founderIntent), backupFile(files.events)].filter(Boolean);

console.log(JSON.stringify({
  ok: true,
  dbPath,
  replayed: {
    waitlist: waitlistCount,
    founderIntent: founderCount,
    events: eventCount,
  },
  archivedFiles: moved,
}, null, 2));
