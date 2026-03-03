import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Route as WaitlistRoute } from '../app/routes/api/waitlist.ts';
import { Route as FounderIntentRoute } from '../app/routes/api/founder-intent.ts';
import { Route as PostbackRoute } from '../app/routes/api/postback.ts';
import { Route as CheckoutSuccessRoute } from '../app/routes/api/checkout-success.ts';
import * as db from '../app/lib/waitlist-db.ts';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cogcage-api-critical-'));
process.env.MOLTPIT_DB_PATH = path.join(tmpDir, 'moltpit.routes.test.db');
process.env.MOLTPIT_LOG_DIR = tmpDir;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.COGCAGE_POSTBACK_KEY;
delete process.env.MOLTPIT_POSTBACK_KEY;

const postWaitlist = WaitlistRoute.options.server.handlers.POST;
const postFounderIntent = FounderIntentRoute.options.server.handlers.POST;
const postPostback = PostbackRoute.options.server.handlers.POST;
const getPostback = PostbackRoute.options.server.handlers.GET;
const postCheckoutSuccess = CheckoutSuccessRoute.options.server.handlers.POST;
const opsLogPath = path.join(tmpDir, 'api-events.ndjson');

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function readOpsEvents() {
  if (!fs.existsSync(opsLogPath)) return [];
  const lines = fs.readFileSync(opsLogPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

test('waitlist malformed payload returns deterministic contract fields', async () => {
  const response = await postWaitlist({
    request: new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{bad-json',
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.status, 'payload_invalid');
  assert.equal(body.storage, 'none');
  assert.equal(body.queued, false);
  assert.equal(body.replayed, false);
  assert.equal(typeof body.requestId, 'string');
});

test('waitlist and founder-intent degrade safely to durable fallback contract when Redis is unavailable', async () => {
  const waitlistRes = await postWaitlist({
    request: new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'founder@example.com',
        game: 'The Molt Pit',
        source: 'test-critical-routes',
      }),
    }),
  });
  const waitlistBody = await readJson(waitlistRes);
  assert.equal(waitlistBody.ok, true);
  assert.equal(waitlistBody.replayed, false);
  assert.ok(
    waitlistBody.status === 'submitted_degraded' || waitlistBody.status === 'queued_fallback',
    `unexpected waitlist status: ${waitlistBody.status}`,
  );
  if (waitlistBody.status === 'submitted_degraded') {
    assert.equal(waitlistRes.status, 200);
    assert.equal(waitlistBody.storage, 'sqlite');
  } else {
    assert.equal(waitlistRes.status, 202);
    assert.equal(waitlistBody.storage, 'fallback-file');
    assert.equal(waitlistBody.queued, true);
  }

  const founderRes = await postFounderIntent({
    request: new Request('http://localhost/api/founder-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'founder@example.com',
        source: 'test-critical-routes-founder',
        intentId: 'intent:test-critical-routes:1',
      }),
    }),
  });
  const founderBody = await readJson(founderRes);
  assert.equal(founderBody.ok, true);
  assert.equal(founderBody.replayed, false);
  assert.ok(
    founderBody.status === 'submitted_degraded' || founderBody.status === 'queued_fallback',
    `unexpected founder-intent status: ${founderBody.status}`,
  );
});

test('postback uses idempotency receipts and returns replay contract on duplicate event', async () => {
  const health = db.getStorageHealth();
  if (!health.sqliteAvailable) {
    // Bun's node:test shim does not implement t.skip yet.
    return;
  }

  const eventId = `evt-critical-${Date.now()}`;
  const payload = {
    type: 'founder_pack.paid',
    eventId,
    source: 'test-postback',
    email: 'buyer@example.com',
    metadata: { checkout_source: 'test-postback' },
  };

  const first = await postPostback({
    request: new Request('http://localhost/api/postback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  });
  const firstBody = await readJson(first);
  assert.equal(firstBody.ok, true);
  assert.equal(firstBody.eventId, eventId);
  assert.equal(firstBody.replayed, false);
  assert.ok(
    firstBody.status === 'recorded' || firstBody.status === 'recorded_degraded' || firstBody.status === 'queued_fallback',
    `unexpected first postback status: ${firstBody.status}`,
  );

  const replay = await postPostback({
    request: new Request('http://localhost/api/postback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  });
  const replayBody = await readJson(replay);
  assert.equal(replayBody.ok, true);
  assert.equal(replayBody.eventId, eventId);
  assert.equal(replay.headers.get('x-idempotent-replay'), '1');
  assert.equal(replayBody.status, 'idempotent_replay');
  assert.equal(replayBody.replayed, true);
});

test('checkout-success uses idempotency receipts and returns replay contract on duplicate conversion event', async () => {
  const eventId = `checkout-critical-${Date.now()}`;
  const payload = {
    eventId,
    source: 'test-checkout-success',
    email: 'buyer@example.com',
    tier: 'founder',
    page: '/success',
  };

  const first = await postCheckoutSuccess({
    request: new Request('http://localhost/api/checkout-success', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  });
  const firstBody = await readJson(first);
  assert.equal(firstBody.ok, true);
  assert.equal(firstBody.eventId, eventId);
  assert.equal(firstBody.replayed, false);
  assert.ok(
    firstBody.status === 'recorded' || firstBody.status === 'recorded_degraded' || firstBody.status === 'queued_fallback',
    `unexpected first checkout-success status: ${firstBody.status}`,
  );

  const replay = await postCheckoutSuccess({
    request: new Request('http://localhost/api/checkout-success', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  });
  const replayBody = await readJson(replay);
  assert.equal(replayBody.ok, true);
  assert.equal(replayBody.eventId, eventId);
  assert.equal(replayBody.status, 'idempotent_replay');
  assert.equal(replayBody.replayed, true);
  assert.equal(replay.headers.get('x-idempotent-replay'), '1');
});

test('postback verification GET returns request-id contract and observable verify logs', async () => {
  const testResponse = await getPostback({
    request: new Request('http://localhost/api/postback?test=1'),
  });
  const testBody = await readJson(testResponse);
  assert.equal(testResponse.status, 200);
  assert.equal(testBody.ok, true);
  assert.equal(testBody.mode, 'test');
  assert.equal(testBody.status, 'test_mode');
  assert.equal(testBody.storage, 'none');
  assert.equal(testBody.queued, false);
  assert.equal(testBody.degraded, false);
  assert.equal(testBody.replayed, false);
  assert.equal(typeof testBody.requestId, 'string');
  assert.equal(testResponse.headers.get('x-request-id'), testBody.requestId);

  const readyResponse = await getPostback({
    request: new Request('http://localhost/api/postback'),
  });
  const readyBody = await readJson(readyResponse);
  assert.equal(readyResponse.status, 200);
  assert.equal(readyBody.ok, true);
  assert.equal(readyBody.status, 'ready');
  assert.equal(readyBody.storage, 'none');
  assert.deepEqual(readyBody.acceptedTypes, ['checkout.session.completed', 'founder_pack.paid']);
  assert.equal(typeof readyBody.requestId, 'string');

  const events = readOpsEvents();
  const verifyReceived = events.find((entry) =>
    entry?.event === 'postback_verify_received' && entry?.requestId === testBody.requestId);
  const verifyCompleted = events.find((entry) =>
    entry?.event === 'postback_verify_completed' && entry?.requestId === testBody.requestId);
  assert.ok(verifyReceived, 'missing postback_verify_received log');
  assert.ok(verifyCompleted, 'missing postback_verify_completed log');
});
