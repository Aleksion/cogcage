import test from 'node:test';
import assert from 'node:assert/strict';

import { computeRateLimitResetMs } from '../app/lib/rate-limit.ts';

test('computeRateLimitResetMs returns remaining milliseconds in current window', () => {
  assert.equal(computeRateLimitResetMs(1_001, 1_000), 999);
  assert.equal(computeRateLimitResetMs(1_999, 1_000), 1);
});

test('computeRateLimitResetMs returns full window at exact boundary', () => {
  assert.equal(computeRateLimitResetMs(2_000, 1_000), 1_000);
});
