import test from 'node:test'
import assert from 'node:assert/strict'

import { __postbackTest } from '../app/routes/api/postback.ts'

test('postback normalizes legacy event type alias', () => {
  assert.equal(__postbackTest.normalizePostbackType('founder_pack_paid'), 'founder_pack.paid')
  assert.equal(__postbackTest.normalizePostbackType('checkout.session.completed'), 'checkout.session.completed')
})

test('postback identity resolves email and source from metadata when direct fields are absent', () => {
  const resolved = __postbackTest.resolveIdentityFromPayload({
    type: 'checkout.session.completed',
    data: {
      object: {
        metadata: {
          prefilled_email: 'Buyer@Pit.dev',
          checkout_source: 'hero-founder-index',
        },
      },
    },
  })

  assert.equal(resolved.email, 'buyer@pit.dev')
  assert.equal(resolved.source, 'hero-founder-index')
})

test('postback identity prefers explicit source over metadata source', () => {
  const resolved = __postbackTest.resolveIdentityFromPayload({
    type: 'checkout.session.completed',
    source: 'manual-postback',
    metadata: {
      source: 'metadata-source',
      email: 'fallback@pit.dev',
    },
  })

  assert.equal(resolved.source, 'manual-postback')
  assert.equal(resolved.email, 'fallback@pit.dev')
})
