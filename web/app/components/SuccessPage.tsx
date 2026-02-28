import { useEffect } from 'react'

const PAID_KEY = 'moltpit_paid_conversions'
const PENDING_KEY = 'moltpit_pending_paid_conversions'

function rememberPaidConversion(id: string) {
  const known = JSON.parse(localStorage.getItem(PAID_KEY) || '[]')
  if (!known.includes(id)) {
    known.push(id)
    localStorage.setItem(PAID_KEY, JSON.stringify(known.slice(-200)))
  }
}

function hasPaidConversion(id: string) {
  const known = JSON.parse(localStorage.getItem(PAID_KEY) || '[]')
  return known.includes(id)
}

function rememberPending(payload: any) {
  if (!payload?.eventId) return
  const queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  const deduped = queue.filter((entry: any) => entry?.eventId !== payload.eventId)
  deduped.push(payload)
  localStorage.setItem(PENDING_KEY, JSON.stringify(deduped.slice(-50)))
}

function clearPending(eventId: string) {
  const queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  const next = queue.filter((entry: any) => entry?.eventId !== eventId)
  localStorage.setItem(PENDING_KEY, JSON.stringify(next))
}

async function postConversion(payload: any) {
  const body = JSON.stringify(payload)
  try {
    const response = await fetch('/api/checkout-success', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Accept: 'application/json' },
      body,
      keepalive: true,
    })
    if (response.ok) return true
  } catch {
    // Fall through to beacon.
  }
  try {
    return navigator.sendBeacon(
      '/api/checkout-success',
      new Blob([body], { type: 'application/json' }),
    )
  } catch {
    return false
  }
}

async function flushPendingConversions() {
  const queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]')
  if (!Array.isArray(queue) || queue.length === 0) return
  for (const payload of queue) {
    if (!payload?.eventId || hasPaidConversion(payload.eventId)) {
      clearPending(payload?.eventId)
      continue
    }
    const ok = await postConversion(payload)
    if (ok) {
      rememberPaidConversion(payload.eventId)
      clearPending(payload.eventId)
    }
  }
}

async function trackPaidConversion() {
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get('session_id') || params.get('checkout_session_id')
  const email =
    params.get('prefilled_email') ||
    localStorage.getItem('moltpit_email') ||
    undefined
  const conversionId =
    sessionId ||
    `success:${window.location.pathname}:${new Date().toISOString().slice(0, 10)}`
  if (hasPaidConversion(conversionId)) return

  const checkoutSource =
    localStorage.getItem('moltpit_last_founder_checkout_source') || 'stripe-success'
  const checkoutIntentSource =
    localStorage.getItem('moltpit_last_founder_intent_source') || undefined

  const payload = {
    eventId: conversionId,
    page: window.location.pathname,
    href: window.location.href,
    source: checkoutSource,
    tier: 'founder',
    email,
    meta: { sessionId, url: window.location.href, checkoutSource, checkoutIntentSource },
  }

  const ok = await postConversion(payload)
  if (ok) {
    rememberPaidConversion(conversionId)
    clearPending(conversionId)
    return
  }
  rememberPending(payload)
}

export function SuccessPage() {
  useEffect(() => {
    flushPendingConversions().finally(() => trackPaidConversion())
  }, [])

  return (
    <main
      style={{ maxWidth: 920, margin: '0 auto', padding: '1.75rem 1.25rem 4rem' }}
    >
      <section
        style={{
          marginTop: '2rem',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '1rem',
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.03)',
          maxWidth: 760,
        }}
      >
        <p
          style={{
            color: '#9ca5ff',
            fontSize: '0.78rem',
            letterSpacing: '0.12em',
            fontWeight: 700,
          }}
        >
          PAYMENT CONFIRMED
        </p>
        <h1
          style={{
            margin: '0.4rem 0 1rem',
            lineHeight: 1.12,
            fontSize: 'clamp(1.9rem, 4.2vw, 3rem)',
          }}
        >
          You're in — Founder spot reserved.
        </h1>
        <p style={{ color: '#d0d5ef', lineHeight: 1.55 }}>
          Thanks for backing The Molt Pit early. We're preparing your founder
          onboarding email with alpha queue details, rank-season kickoff timing,
          and tournament invite priority.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.85rem',
            margin: '1.4rem 0',
          }}
        >
          <article
            style={{
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: '0.8rem',
              padding: '0.85rem',
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.3rem' }}>
              1) Check your inbox
            </strong>
            <span
              style={{ color: '#c8cdea', fontSize: '0.92rem', lineHeight: 1.45 }}
            >
              Look for your Stripe receipt + The Molt Pit onboarding within 24
              hours.
            </span>
          </article>
          <article
            style={{
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: '0.8rem',
              padding: '0.85rem',
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.3rem' }}>
              2) Join waitlist backup
            </strong>
            <span
              style={{ color: '#c8cdea', fontSize: '0.92rem', lineHeight: 1.45 }}
            >
              If checkout used a different email, submit your preferred inbox on
              the homepage.
            </span>
          </article>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <a
            href="/"
            style={{
              border: 0,
              textDecoration: 'none',
              borderRadius: 999,
              padding: '0.72rem 1.2rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #8a8fff 0%, #5d6bff 100%)',
              color: 'white',
            }}
          >
            Back to homepage
          </a>
          <a
            href="/#join"
            style={{
              border: '1px solid rgba(255,255,255,0.16)',
              textDecoration: 'none',
              borderRadius: 999,
              padding: '0.72rem 1.2rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              color: '#f4f5ff',
            }}
          >
            Add backup email
          </a>
        </div>

        <p
          style={{
            marginTop: '0.9rem',
            color: '#acb2d9',
            fontSize: '0.84rem',
          }}
        >
          Need help? Reply to your Stripe receipt and we'll fix your founder
          access manually.
        </p>
      </section>
    </main>
  )
}
