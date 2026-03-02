import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogcage-product-mode-'));
process.env.MOLTPIT_DB_PATH = path.join(tmpDir, 'moltpit.test.db');
process.env.MOLTPIT_LOG_DIR = path.join(tmpDir, 'logs');
fs.mkdirSync(process.env.MOLTPIT_LOG_DIR, { recursive: true });

const dbModPromise = import('../app/lib/waitlist-db.ts');
const drainModPromise = import('../app/lib/fallback-drain.ts');

test('waitlist/founder/conversion persistence is idempotent in sqlite path', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  db.insertWaitlistLead({
    email: 'captain@pit.dev',
    game: 'The Molt Pit',
    source: 'test-signup',
    userAgent: 'node-test',
    ipAddress: '127.0.0.1',
  });
  db.insertWaitlistLead({
    email: 'captain@pit.dev',
    game: 'Updated Game',
    source: 'test-signup-updated',
    userAgent: 'node-test',
    ipAddress: '127.0.0.1',
  });

  db.insertFounderIntent({
    email: 'captain@pit.dev',
    source: 'test-founder',
    intentId: 'intent:test:1',
    userAgent: 'node-test',
    ipAddress: '127.0.0.1',
  });
  db.insertFounderIntent({
    email: 'captain@pit.dev',
    source: 'test-founder-2',
    intentId: 'intent:test:1',
    userAgent: 'node-test',
    ipAddress: '127.0.0.1',
  });

  db.insertConversionEvent({
    eventName: 'paid_conversion_confirmed',
    eventId: 'paid:test:1',
    source: 'test-postback',
    email: 'captain@pit.dev',
  });
  db.insertConversionEvent({
    eventName: 'paid_conversion_confirmed',
    eventId: 'paid:test:1',
    source: 'test-postback',
    email: 'captain@pit.dev',
  });

  const counts = db.getFunnelCounts();
  assert.equal(counts.waitlistLeads, 1);
  assert.equal(counts.founderIntents, 1);
  assert.equal(counts.conversionEvents, 1);
});

test('api idempotency receipts are readable and updateable', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  db.writeApiRequestReceipt({
    route: '/api/waitlist',
    idempotencyKey: 'idem-test-1',
    responseStatus: 202,
    responseBody: JSON.stringify({ ok: true, queued: true }),
  });

  const stored = db.readApiRequestReceipt('/api/waitlist', 'idem-test-1');
  assert.ok(stored);
  assert.equal(stored.responseStatus, 202);

  db.writeApiRequestReceipt({
    route: '/api/waitlist',
    idempotencyKey: 'idem-test-1',
    responseStatus: 200,
    responseBody: JSON.stringify({ ok: true }),
  });

  const updated = db.readApiRequestReceipt('/api/waitlist', 'idem-test-1');
  assert.ok(updated);
  assert.equal(updated.responseStatus, 200);
});

test('rate limit enforces cap with clear reset metadata', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const first = db.consumeRateLimit('198.51.100.9', 'waitlist', 2, 60_000);
  const second = db.consumeRateLimit('198.51.100.9', 'waitlist', 2, 60_000);
  const third = db.consumeRateLimit('198.51.100.9', 'waitlist', 2, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.ok(Number.isFinite(third.resetMs));
});

test('fallback drain replays waitlist rows when redis is unavailable', async (t) => {
  const db = await dbModPromise;
  const drain = await drainModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const logDir = process.env.MOLTPIT_LOG_DIR;
  const filePath = path.join(logDir, 'waitlist-fallback.ndjson');
  fs.writeFileSync(filePath, `${JSON.stringify({
    email: 'drain-test@pit.dev',
    game: 'The Molt Pit',
    source: 'fallback-test',
  })}\n`, 'utf8');

  const before = db.getFunnelCounts().waitlistLeads;
  const drained = await drain.drainFallbackQueues(10);
  const after = db.getFunnelCounts().waitlistLeads;

  assert.equal(drained.waitlist.inserted, 1);
  assert.equal(drained.waitlist.kept, 0);
  assert.equal(after, before + 1);
  assert.equal(fs.readFileSync(filePath, 'utf8'), '');
});
