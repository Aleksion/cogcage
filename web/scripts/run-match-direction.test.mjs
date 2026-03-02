import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveMovementDirection } from '../app/lib/ws2/movement.ts';
import { UNIT_SCALE } from '../app/lib/ws2/constants.ts';

test('deriveMovementDirection infers direction for MOVE when missing', () => {
  const dir = deriveMovementDirection(
    'MOVE',
    { x: 1 * UNIT_SCALE, y: 1 * UNIT_SCALE },
    { x: 4 * UNIT_SCALE, y: 1 * UNIT_SCALE },
  );
  assert.equal(dir, 'E');
});

test('deriveMovementDirection infers direction for DASH when missing', () => {
  const dir = deriveMovementDirection(
    'DASH',
    { x: 6 * UNIT_SCALE, y: 3 * UNIT_SCALE },
    { x: 6 * UNIT_SCALE, y: 8 * UNIT_SCALE },
  );
  assert.equal(dir, 'S');
});

test('deriveMovementDirection preserves explicit direction', () => {
  const dir = deriveMovementDirection(
    'DASH',
    { x: 5 * UNIT_SCALE, y: 5 * UNIT_SCALE },
    { x: 8 * UNIT_SCALE, y: 8 * UNIT_SCALE },
    'NW',
  );
  assert.equal(dir, 'NW');
});

test('deriveMovementDirection leaves non-movement actions unchanged', () => {
  const dir = deriveMovementDirection(
    'MELEE_STRIKE',
    { x: 5 * UNIT_SCALE, y: 5 * UNIT_SCALE },
    { x: 8 * UNIT_SCALE, y: 8 * UNIT_SCALE },
  );
  assert.equal(dir, undefined);
});
