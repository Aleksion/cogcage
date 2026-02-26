import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

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

let db: Database.Database | null = null;

function getDbPath() {
  return process.env.COGCAGE_DB_PATH ?? path.join(process.cwd(), 'data', 'cogcage.db');
}

function getDb() {
  if (db) return db;

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

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

  insert.run(lead);
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

  insert.run(intent);
}

export function insertConversionEvent(event: ConversionEvent) {
  const conn = getDb();
  const insert = conn.prepare(`
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

  insert.run(event);
}

export function consumeRateLimit(
  ipAddress: string | undefined,
  route: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const conn = getDb();
  const ip = ipAddress || 'unknown';
  const windowStart = Math.floor(Date.now() / windowMs);

  // Keep the rate-limit table bounded in long-running environments.
  conn.prepare(`
    DELETE FROM rate_limits
    WHERE route = ? AND window_start < ?
  `).run(route, windowStart - 3);

  const existing = conn.prepare(`
    SELECT count
    FROM rate_limits
    WHERE ip_address = ? AND route = ? AND window_start = ?
  `).get(ip, route, windowStart) as { count: number } | undefined;

  if (existing && existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: (windowStart + 1) * windowMs - Date.now(),
    };
  }

  if (existing) {
    conn.prepare(`
      UPDATE rate_limits
      SET count = count + 1
      WHERE ip_address = ? AND route = ? AND window_start = ?
    `).run(ip, route, windowStart);
  } else {
    conn.prepare(`
      INSERT INTO rate_limits (ip_address, route, window_start, count)
      VALUES (?, ?, ?, 1)
    `).run(ip, route, windowStart);
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - ((existing?.count ?? 0) + 1)),
    resetMs: (windowStart + 1) * windowMs - Date.now(),
  };
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
