#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.COGCAGE_DB_PATH ?? path.join(process.cwd(), 'data', 'cogcage.db');
const outDir = process.env.COGCAGE_EXPORT_DIR ?? path.join(process.cwd(), 'data', 'exports');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const db = new Database(dbPath, { readonly: false });

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
`);

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[,"\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function rowsToCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function exportQuery({ table, orderBy = 'created_at DESC' }) {
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
  const csv = rowsToCsv(rows);
  const filePath = path.join(outDir, `${table}-${stamp}.csv`);

  if (!csv) {
    fs.writeFileSync(filePath, '');
    return { table, filePath, rowCount: 0 };
  }

  fs.writeFileSync(filePath, csv);
  return { table, filePath, rowCount: rows.length };
}

const outputs = [
  exportQuery({ table: 'waitlist_leads' }),
  exportQuery({ table: 'founder_intents' }),
  exportQuery({ table: 'conversion_events' }),
];

for (const output of outputs) {
  console.log(`${output.table}: ${output.rowCount} rows -> ${output.filePath}`);
}

console.log('Export complete.');

db.close();
