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
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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
    INSERT INTO founder_intents (email, source, user_agent, ip_address)
    VALUES (@email, @source, @userAgent, @ipAddress)
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
  `);

  insert.run(event);
}
