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
