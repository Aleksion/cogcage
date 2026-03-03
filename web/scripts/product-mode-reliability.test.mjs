import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  deriveCheckoutSuccessIdempotencyKey,
  deriveFounderIntentIdempotencyKey,
  sanitizeIdempotencyKey,
  deriveWaitlistIdempotencyKey,
} from '../app/lib/idempotency.ts';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogcage-product-mode-'));
process.env.MOLTPIT_DB_PATH = path.join(tmpDir, 'moltpit.test.db');

const dbModPromise = import('../app/lib/waitlist-db.ts');

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

test('derived signup idempotency keys are deterministic and scoped by source/day', () => {
  const now = new Date('2026-03-02T13:00:00.000Z');
  const keyA = deriveWaitlistIdempotencyKey('Captain@Pit.dev', 'hero', now);
  const keyB = deriveWaitlistIdempotencyKey('captain@pit.dev', 'hero', now);
  const keyC = deriveWaitlistIdempotencyKey('captain@pit.dev', 'footer', now);

  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);
  assert.ok(keyA.startsWith('waitlist:2026-03-02:'));
  assert.ok(keyA.length <= 120);
});

test('founder + checkout idempotency keys prefer stable event identifiers', () => {
  const now = new Date('2026-03-02T18:45:00.000Z');
  const founderKey = deriveFounderIntentIdempotencyKey({
    intentId: 'intent:2026-03-02:abc123',
    email: 'captain@pit.dev',
    source: 'play-page-founder-checkout',
  }, now);
  const checkoutKey = deriveCheckoutSuccessIdempotencyKey({
    eventId: 'cs_test_42',
    source: 'stripe-success',
    email: 'captain@pit.dev',
  }, now);

  assert.equal(founderKey, 'founder_intent:intent:2026-03-02:abc123');
  assert.equal(checkoutKey, 'checkout_success:cs_test_42');
});

test('checkout fallback idempotency key is deterministic for identical payload fingerprints', () => {
  const now = new Date('2026-03-02T18:45:00.000Z');
  const keyA = deriveCheckoutSuccessIdempotencyKey({
    source: 'stripe-success',
    email: 'captain@pit.dev',
    page: '/success',
    href: 'https://cogcage.com/success?tier=founder',
    tier: 'founder',
  }, now);
  const keyB = deriveCheckoutSuccessIdempotencyKey({
    source: 'stripe-success',
    email: 'captain@pit.dev',
    page: '/success',
    href: 'https://cogcage.com/success?tier=founder',
    tier: 'founder',
  }, now);
  const keyC = deriveCheckoutSuccessIdempotencyKey({
    source: 'stripe-success',
    email: 'captain@pit.dev',
    page: '/success',
    href: 'https://cogcage.com/success?tier=vip',
    tier: 'vip',
  }, now);

  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);
  assert.ok(keyA.startsWith('checkout_success:2026-03-02:'));
});

test('idempotency key sanitization trims and bounds untrusted header input', () => {
  const noisy = `  ${'x'.repeat(180)}  `;
  const sanitized = sanitizeIdempotencyKey(noisy);
  assert.ok(sanitized);
  assert.equal(sanitized.length, 120);
  assert.equal(sanitizeIdempotencyKey('   '), undefined);
});
