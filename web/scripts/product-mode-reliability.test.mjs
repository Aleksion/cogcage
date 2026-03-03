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
const waitlistRoutePromise = import('../app/routes/api/waitlist.ts');
const founderIntentRoutePromise = import('../app/routes/api/founder-intent.ts');
const checkoutSuccessRoutePromise = import('../app/routes/api/checkout-success.ts');
const postbackRoutePromise = import('../app/routes/api/postback.ts');

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
  assert.ok(keyA.startsWith('checkout_success:fallback:'));
});

test('checkout state table persists durable state transitions by transaction id', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const transactionId = `checkout-state-${Date.now()}`;
  db.upsertCheckoutState({
    transactionId,
    state: 'postback_received',
    source: 'test',
    email: 'state@pit.dev',
    providerEventId: transactionId,
    requestId: 'req-a',
  });
  db.upsertCheckoutState({
    transactionId,
    state: 'fulfillment_recorded',
    source: 'test',
    email: 'state@pit.dev',
    providerEventId: transactionId,
    requestId: 'req-b',
  });

  const stored = db.getCheckoutState(transactionId);
  assert.ok(stored);
  assert.equal(stored.transactionId, transactionId);
  assert.equal(stored.state, 'fulfillment_recorded');
  assert.equal(stored.requestId, 'req-b');
});

test('idempotency key sanitization trims and bounds untrusted header input', () => {
  const noisy = `  ${'x'.repeat(180)}  `;
  const sanitized = sanitizeIdempotencyKey(noisy);
  assert.ok(sanitized);
  assert.equal(sanitized.length, 120);
  assert.equal(sanitizeIdempotencyKey('   '), undefined);
});

test('waitlist route replays idempotent requests and avoids duplicate lead writes', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const { Route } = await waitlistRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const before = db.getFunnelCounts();
  const eventId = `waitlist-route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idempotencyKey = `waitlist:test:${eventId}`;
  const payload = {
    email: `${eventId}@pit.dev`,
    game: 'The Molt Pit',
    source: 'test-route',
  };

  const requestA = new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': ` ${idempotencyKey} `,
      'user-agent': 'node-test',
    },
    body: JSON.stringify(payload),
  });
  const responseA = await postHandler({ request: requestA });
  assert.ok([200, 202].includes(responseA.status));
  const bodyA = await responseA.json();
  assert.equal(bodyA.ok, true);

  const requestB = new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': idempotencyKey,
      'user-agent': 'node-test',
    },
    body: JSON.stringify(payload),
  });
  const responseB = await postHandler({ request: requestB });
  assert.equal(responseB.headers.get('x-idempotent-replay'), '1');
  const bodyB = await responseB.json();
  assert.equal(bodyB.ok, true);

  const after = db.getFunnelCounts();
  assert.equal(after.waitlistLeads, before.waitlistLeads + 1);
});

test('waitlist route returns 400 on malformed JSON payload', async () => {
  const { Route } = await waitlistRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const request = new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'node-test',
    },
    body: '{',
  });

  const response = await postHandler({ request });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.ok(
    body.error === 'Invalid request payload.'
    || body.error === 'Valid email is required.',
  );
});

test('founder-intent route captures durable checkout intent state', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const { Route } = await founderIntentRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const intentId = `intent:test:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const email = `${intentId}@pit.dev`;

  const response = await postHandler({
    request: new Request('http://localhost/api/founder-intent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': `founder_intent:${intentId}`,
        'user-agent': 'node-test',
      },
      body: JSON.stringify({
        email,
        source: 'test-founder-intent',
        intentId,
      }),
    }),
  });

  assert.ok([200, 202].includes(response.status));
  const body = await response.json();
  assert.equal(body.ok, true);

  const state = db.getCheckoutState(intentId);
  assert.ok(state);
  assert.ok(
    state.state === 'intent_captured'
    || state.state === 'intent_captured_degraded'
    || state.state === 'intent_buffered',
  );
});

test('checkout-success route replays idempotent requests and avoids duplicate conversion writes', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const { Route } = await checkoutSuccessRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const before = db.getFunnelCounts();
  const eventId = `checkout-route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idempotencyKey = `checkout_success:${eventId}`;
  const payload = {
    eventId,
    page: '/success',
    href: 'https://cogcage.test/success',
    source: 'stripe-success',
    tier: 'founder',
    email: `${eventId}@pit.dev`,
  };

  const requestA = new Request('http://localhost/api/checkout-success', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': ` ${idempotencyKey} `,
      'user-agent': 'node-test',
    },
    body: JSON.stringify(payload),
  });
  const responseA = await postHandler({ request: requestA });
  assert.ok([200, 202].includes(responseA.status));
  const bodyA = await responseA.json();
  assert.equal(bodyA.ok, true);

  const requestB = new Request('http://localhost/api/checkout-success', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': idempotencyKey,
      'user-agent': 'node-test',
    },
    body: JSON.stringify(payload),
  });
  const responseB = await postHandler({ request: requestB });
  assert.equal(responseB.headers.get('x-idempotent-replay'), '1');
  const bodyB = await responseB.json();
  assert.equal(bodyB.ok, true);

  const after = db.getFunnelCounts();
  assert.equal(after.conversionEvents, before.conversionEvents + 1);
});

test('checkout-success GET callback replays deterministic idempotency key', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  const { Route } = await checkoutSuccessRoutePromise;
  const getHandler = Route.options?.server?.handlers?.GET;
  assert.equal(typeof getHandler, 'function');

  const before = db.getFunnelCounts();
  const eventId = `checkout-get-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const query = new URLSearchParams({
    event_id: eventId,
    source: 'stripe-success',
    email: `${eventId}@pit.dev`,
    page: '/success',
    href: 'https://cogcage.test/success',
    tier: 'founder',
  });

  const responseA = await getHandler({
    request: new Request(`http://localhost/api/checkout-success?${query.toString()}`, {
      method: 'GET',
      headers: { 'user-agent': 'node-test' },
    }),
  });
  assert.ok([200, 202].includes(responseA.status));
  const bodyA = await responseA.json();
  assert.equal(bodyA.ok, true);

  const responseB = await getHandler({
    request: new Request(`http://localhost/api/checkout-success?${query.toString()}`, {
      method: 'GET',
      headers: { 'user-agent': 'node-test' },
    }),
  });
  assert.equal(responseB.headers.get('x-idempotent-replay'), '1');
  const bodyB = await responseB.json();
  assert.equal(bodyB.ok, true);

  const after = db.getFunnelCounts();
  assert.equal(after.conversionEvents, before.conversionEvents + 1);
});

test('postback route replays idempotent requests and dedupes conversion/founder writes', async (t) => {
  const db = await dbModPromise;
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    t.skip(`SQLite unavailable in test runtime: ${health.sqliteLoadError ?? 'unknown error'}`);
    return;
  }

  process.env.COGCAGE_POSTBACK_KEY = 'test-postback-key';

  const { Route } = await postbackRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const before = db.getFunnelCounts();
  const eventId = `postback-route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idempotencyKey = `postback:checkout.session.completed:${eventId}`;
  const payload = {
    type: 'checkout.session.completed',
    eventId,
    source: 'postback-test',
    data: {
      object: {
        id: `cs_${eventId}`,
        customer_email: `${eventId}@pit.dev`,
        metadata: { tier: 'founder' },
      },
    },
  };

  const requestA = new Request('http://localhost/api/postback', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-postback-key': 'test-postback-key',
      'x-idempotency-key': ` ${idempotencyKey} `,
      'user-agent': 'node-test',
    },
    body: JSON.stringify(payload),
  });
  const responseA = await postHandler({ request: requestA });
  assert.ok([200, 202].includes(responseA.status));
  const bodyA = await responseA.json();
  assert.equal(bodyA.ok, true);
  assert.equal(bodyA.eventId, eventId);

  const requestB = new Request('http://localhost/api/postback', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-postback-key': 'test-postback-key',
      'x-idempotency-key': idempotencyKey,
      'user-agent': 'node-test',
    },
    body: JSON.stringify(payload),
  });
  const responseB = await postHandler({ request: requestB });
  assert.equal(responseB.headers.get('x-idempotent-replay'), '1');
  const bodyB = await responseB.json();
  assert.equal(bodyB.ok, true);
  assert.equal(bodyB.eventId, eventId);

  const after = db.getFunnelCounts();
  assert.equal(after.conversionEvents, before.conversionEvents + 1);
  assert.equal(after.founderIntents, before.founderIntents + 1);

  const state = db.getCheckoutState(eventId);
  assert.ok(state);
  assert.equal(state.state, 'fulfillment_recorded');
});

test('postback route rejects unauthorized callbacks when key is configured', async () => {
  process.env.COGCAGE_POSTBACK_KEY = 'test-postback-key';
  const { Route } = await postbackRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const response = await postHandler({
    request: new Request('http://localhost/api/postback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        eventId: `unauth-${Date.now()}`,
      }),
    }),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, 'Unauthorized');
});

test('postback route validates callback type before fulfillment transitions', async () => {
  process.env.COGCAGE_POSTBACK_KEY = 'test-postback-key';
  const { Route } = await postbackRoutePromise;
  const postHandler = Route.options?.server?.handlers?.POST;
  assert.equal(typeof postHandler, 'function');

  const response = await postHandler({
    request: new Request('http://localhost/api/postback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-postback-key': 'test-postback-key',
      },
      body: JSON.stringify({
        type: 'invoice.created',
        eventId: `unsupported-${Date.now()}`,
      }),
    }),
  });

  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, 'Unsupported postback type');
});
