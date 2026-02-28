import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { resolveRuntimePath } from './runtime-paths';

export type WaitlistLead = {
  email: string;
  game: string;
  source: string;
  userAgent?: string;
  ipAddress?: string;
};

export type FounderIntent = {
  email: string;
  source: string;
  intentId?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type ConversionEvent = {
  eventName: string;
  eventId?: string;
  page?: string;
  href?: string;
  tier?: string;
  source?: string;
  email?: string;
  metaJson?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

export type FunnelCounts = {
  waitlistLeads: number;
  founderIntents: number;
  conversionEvents: number;
};

export type ReliabilitySnapshot = {
  windowHours: number;
  waitlistSubmitted: number;
  waitlistQueuedFallback: number;
  waitlistFailed: number;
  founderIntentSubmitted: number;
  founderIntentQueuedFallback: number;
  founderIntentFailed: number;
};

export type ApiRequestReceipt = {
  route: string;
  idempotencyKey: string;
  responseStatus: number;
  responseBody: string;
};

let db: Database.Database | null = null;

export function getDbPath() {
  return process.env.MOLTPIT_DB_PATH ?? resolveRuntimePath('moltpit.db');
}

function runWithBusyRetry<T>(label: string, fn: () => T): T {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('SQLITE_BUSY') || attempt === maxAttempts - 1) break;
    }
  }

  throw new Error(`db_${label}_failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function getDb() {
  if (db) return db;

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 3000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      game TEXT NOT NULL,
      source TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email)
    );

    CREATE TABLE IF NOT EXISTS founder_intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      source TEXT NOT NULL,
      intent_id TEXT,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_intents_intent_id
    ON founder_intents (intent_id)
    WHERE intent_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS conversion_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      event_id TEXT,
      page TEXT,
      href TEXT,
      tier TEXT,
      source TEXT,
      email TEXT,
      meta_json TEXT,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name_created_at
    ON conversion_events (event_name, created_at);

    CREATE INDEX IF NOT EXISTS idx_conversion_events_email_created_at
    ON conversion_events (email, created_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_events_event_id
    ON conversion_events (event_id)
    WHERE event_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS rate_limits (
      ip_address TEXT NOT NULL,
      route TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (ip_address, route, window_start)
    );

    CREATE TABLE IF NOT EXISTS api_request_receipts (
      route TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      response_status INTEGER NOT NULL,
      response_body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (route, idempotency_key)
    );

    CREATE INDEX IF NOT EXISTS idx_api_request_receipts_created_at
    ON api_request_receipts (created_at);
  `);

  return db;
}

export function insertWaitlistLead(lead: WaitlistLead) {
  const conn = getDb();
  const insert = conn.prepare(`
    INSERT INTO waitlist_leads (email, game, source, user_agent, ip_address)
    VALUES (@email, @game, @source, @userAgent, @ipAddress)
    ON CONFLICT(email) DO UPDATE SET
      game=excluded.game,
      source=excluded.source,
      user_agent=excluded.user_agent,
      ip_address=excluded.ip_address,
      created_at=CURRENT_TIMESTAMP
  `);

  runWithBusyRetry('insert_waitlist', () => insert.run(lead));
}

export function insertFounderIntent(intent: FounderIntent) {
  const conn = getDb();
  const insert = conn.prepare(`
    INSERT INTO founder_intents (email, source, intent_id, user_agent, ip_address)
    VALUES (@email, @source, @intentId, @userAgent, @ipAddress)
    ON CONFLICT(intent_id) DO UPDATE SET
      source=excluded.source,
      user_agent=excluded.user_agent,
      ip_address=excluded.ip_address,
      created_at=CURRENT_TIMESTAMP
  `);

  runWithBusyRetry('insert_founder_intent', () => insert.run(intent));
}

export function insertConversionEvent(event: ConversionEvent) {
  const conn = getDb();
  const insert = conn.prepare(`
    INSERT OR IGNORE INTO conversion_events (
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
  `);

  const row = {
    eventName: event.eventName,
    eventId: event.eventId ?? null,
    page: event.page ?? null,
    href: event.href ?? null,
    tier: event.tier ?? null,
    source: event.source ?? null,
    email: event.email ?? null,
    metaJson: event.metaJson ?? null,
    userAgent: event.userAgent ?? null,
    ipAddress: event.ipAddress ?? null,
  };

  runWithBusyRetry('insert_conversion_event', () => insert.run(row));
}

export function consumeRateLimit(
  ipAddress: string | undefined,
  route: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const conn = getDb();
  const ip = ipAddress || 'unknown';
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);

  // Keep the rate-limit table bounded in long-running environments.
  runWithBusyRetry('rate_limit_gc', () => conn.prepare(`
    DELETE FROM rate_limits
    WHERE route = ? AND window_start < ?
  `).run(route, windowStart - 3));

  const tx = conn.transaction(() => {
    const existing = conn.prepare(`
      SELECT count
      FROM rate_limits
      WHERE ip_address = ? AND route = ? AND window_start = ?
    `).get(ip, route, windowStart) as { count: number } | undefined;

    if (existing && existing.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
      };
    }

    if (existing) {
      conn.prepare(`
        UPDATE rate_limits
        SET count = count + 1
        WHERE ip_address = ? AND route = ? AND window_start = ?
      `).run(ip, route, windowStart);
      const used = existing.count + 1;
      return {
        allowed: true,
        remaining: Math.max(0, limit - used),
      };
    }

    conn.prepare(`
      INSERT INTO rate_limits (ip_address, route, window_start, count)
      VALUES (?, ?, ?, 1)
    `).run(ip, route, windowStart);

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
    };
  });

  const result = runWithBusyRetry('rate_limit_consume', () => tx());
  return {
    ...result,
    resetMs: (windowStart + 1) * windowMs - now,
  };
}

export function readApiRequestReceipt(route: string, idempotencyKey: string): ApiRequestReceipt | null {
  const conn = getDb();
  const row = runWithBusyRetry('api_receipt_read', () => conn.prepare(`
    SELECT route, idempotency_key AS idempotencyKey, response_status AS responseStatus, response_body AS responseBody
    FROM api_request_receipts
    WHERE route = ? AND idempotency_key = ?
  `).get(route, idempotencyKey)) as ApiRequestReceipt | undefined;

  return row ?? null;
}

export function writeApiRequestReceipt(receipt: ApiRequestReceipt) {
  const conn = getDb();

  runWithBusyRetry('api_receipt_write', () => conn.prepare(`
    INSERT INTO api_request_receipts (route, idempotency_key, response_status, response_body)
    VALUES (@route, @idempotencyKey, @responseStatus, @responseBody)
    ON CONFLICT(route, idempotency_key) DO UPDATE SET
      response_status=excluded.response_status,
      response_body=excluded.response_body,
      created_at=CURRENT_TIMESTAMP
  `).run(receipt));

  runWithBusyRetry('api_receipt_gc', () => conn.prepare(`
    DELETE FROM api_request_receipts
    WHERE created_at < datetime('now', '-3 days')
  `).run());
}

export function getFunnelCounts(): FunnelCounts {
  const conn = getDb();
  const waitlist = conn.prepare('SELECT COUNT(*) AS count FROM waitlist_leads').get() as { count: number };
  const founders = conn.prepare('SELECT COUNT(*) AS count FROM founder_intents').get() as { count: number };
  const events = conn.prepare('SELECT COUNT(*) AS count FROM conversion_events').get() as { count: number };

  return {
    waitlistLeads: waitlist.count,
    founderIntents: founders.count,
    conversionEvents: events.count,
  };
}

export function getStorageHealth() {
  const dbPath = getDbPath();
  const conn = getDb();
  const probe = conn.prepare('SELECT 1 AS ok').get() as { ok: number };
  const dbExists = fs.existsSync(dbPath);
  const dbBytes = dbExists ? fs.statSync(dbPath).size : 0;

  return {
    dbPath,
    dbExists,
    dbBytes,
    writableDir: fs.existsSync(path.dirname(dbPath)),
    dbProbeOk: probe.ok === 1,
  };
}

export function getReliabilitySnapshot(windowHours = 24): ReliabilitySnapshot {
  const conn = getDb();
  const hours = Math.max(1, Math.min(168, Math.floor(windowHours)));

  const query = conn.prepare(`
    SELECT event_name AS eventName, COUNT(*) AS count
    FROM conversion_events
    WHERE created_at >= datetime('now', ?)
      AND event_name IN (
        'waitlist_submitted',
        'waitlist_queued_fallback',
        'waitlist_insert_failed',
        'founder_intent_submitted',
        'founder_intent_queued_fallback',
        'founder_intent_insert_failed'
      )
    GROUP BY event_name
  `);

  const rows = runWithBusyRetry('reliability_snapshot', () => query.all(`-${hours} hours`)) as Array<{ eventName: string; count: number }>;
  const counts = new Map(rows.map((row) => [row.eventName, row.count]));

  return {
    windowHours: hours,
    waitlistSubmitted: counts.get('waitlist_submitted') ?? 0,
    waitlistQueuedFallback: counts.get('waitlist_queued_fallback') ?? 0,
    waitlistFailed: counts.get('waitlist_insert_failed') ?? 0,
    founderIntentSubmitted: counts.get('founder_intent_submitted') ?? 0,
    founderIntentQueuedFallback: counts.get('founder_intent_queued_fallback') ?? 0,
    founderIntentFailed: counts.get('founder_intent_insert_failed') ?? 0,
  };
}
