import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogcage-product-mode-'));
process.env.MOLTPIT_DB_PATH = path.join(tmpDir, 'moltpit.test.db');

const dbModPromise = import('../app/lib/waitlist-db.ts');
const reliabilityModPromise = import('../app/lib/api-reliability.ts');

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

test('idempotency receipts persist only stable response statuses', async () => {
  const reliability = await reliabilityModPromise;
  assert.equal(reliability.shouldPersistIdempotencyReceipt(200), true);
  assert.equal(reliability.shouldPersistIdempotencyReceipt(202), true);
  assert.equal(reliability.shouldPersistIdempotencyReceipt(400), true);
  assert.equal(reliability.shouldPersistIdempotencyReceipt(422), true);
  assert.equal(reliability.shouldPersistIdempotencyReceipt(429), false);
  assert.equal(reliability.shouldPersistIdempotencyReceipt(503), false);
});

test('founder checkout URL resolver accepts only https URL', async () => {
  const reliability = await reliabilityModPromise;
  const previous = process.env.PUBLIC_STRIPE_FOUNDER_URL;

  process.env.PUBLIC_STRIPE_FOUNDER_URL = 'https://checkout.stripe.com/c/pay/example';
  assert.equal(
    reliability.resolveFounderCheckoutUrl(),
    'https://checkout.stripe.com/c/pay/example',
  );

  process.env.PUBLIC_STRIPE_FOUNDER_URL = 'http://checkout.stripe.com/c/pay/example';
  assert.equal(reliability.resolveFounderCheckoutUrl(), undefined);

  process.env.PUBLIC_STRIPE_FOUNDER_URL = 'javascript:alert(1)';
  assert.equal(reliability.resolveFounderCheckoutUrl(), undefined);

  if (typeof previous === 'string') process.env.PUBLIC_STRIPE_FOUNDER_URL = previous;
  else delete process.env.PUBLIC_STRIPE_FOUNDER_URL;
});
