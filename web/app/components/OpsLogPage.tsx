import { useState, useEffect, useCallback, useRef } from 'react'

export function OpsLogPage() {
  const [data, setData] = useState<any>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now())
  const [secondsAgo, setSecondsAgo] = useState<number>(0)
  const keyRef = useRef<string>('')

  const fetchData = useCallback(async () => {
    const key = keyRef.current
    const url = new URL('/api/ops', window.location.origin)
    if (key) url.searchParams.set('key', key)

    try {
      const res = await fetch(url.toString(), {
        headers: key ? { 'x-ops-key': key } : {},
      })
      if (res.status === 401) throw new Error('Unauthorized — set MOLTPIT_OPS_KEY env var.')
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      setData(json)
      setFetchError(null)
      setLastRefreshed(Date.now())
      setSecondsAgo(0)
    } catch (e: any) {
      setFetchError(e.message)
    }
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    keyRef.current = searchParams.get('key') || hashParams.get('key') || ''

    void fetchData()

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => void fetchData(), 30_000)

    // Tick seconds-ago counter every second
    const tickInterval = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastRefreshed) / 1000))
    }, 1000)

    return () => {
      clearInterval(refreshInterval)
      clearInterval(tickInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep secondsAgo ticking against current lastRefreshed value
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastRefreshed) / 1000))
    }, 1000)
    return () => clearInterval(tickInterval)
  }, [lastRefreshed])

  const redisWaitlistCount =
    data?.redisCounts?.waitlistLeads ?? data?.redisFunnel?.waitlistLeads ?? null

  return (
    <div
      style={{
        background: '#0e0e0e',
        color: '#e0e0e0',
        fontFamily: "'Courier New', monospace",
        fontSize: 13,
        lineHeight: 1.5,
        padding: '1.5rem',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          fontSize: '1.1rem',
          color: '#ffd600',
          marginBottom: '1.2rem',
          letterSpacing: '0.05em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>OPS LOG</span>
        <span style={{ color: '#888', fontSize: 11, fontWeight: 400 }}>
          auto-refresh ·{' '}
          {secondsAgo < 5
            ? 'just now'
            : `${secondsAgo}s ago`}{' '}
          ·{' '}
          <button
            onClick={() => void fetchData()}
            style={{
              background: 'none',
              border: 'none',
              color: '#27d9e8',
              cursor: 'pointer',
              fontSize: 11,
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            refresh now
          </button>
        </span>
      </h1>

      {/* ── WS18 Product Core Sprint ── */}
      <div
        style={{
          background: '#0a0a1e',
          border: '1px solid #5d6bff',
          borderRadius: 6,
          padding: '1rem 1.5rem',
          marginBottom: '1.2rem',
        }}
      >
        <div style={{ color: '#5d6bff', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          WS18 PRODUCT CORE SPRINT — 2026-03-01
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 1.2rem', color: '#ccc', fontSize: 12, lineHeight: 1.8 }}>
          <li>Sign-in reliability for GitHub + Resend magic link with explicit loading/success/error states</li>
          <li>Persistent Convex auth logging (`/api/auth-event` → `authEvents`) exposed in `/api/ops`</li>
          <li>Shell persistence migration: local cache + Convex merge on `/shell` (server wins)</li>
          <li>Real demo loop on `/play` pre-auth: map movement + ATTACK/DEFEND/CHARGE/STUN + ticker + ~30s autoplay</li>
          <li>Founder checkout fallback placeholder when Stripe URL env is missing</li>
          <li>Purchases recording wired from `/api/checkout-success` and `/api/postback` into Convex</li>
        </ul>
      </div>

      {/* ── Signups (Redis) — primary durable count ── */}
      {redisWaitlistCount !== null && (
        <div
          style={{
            background: '#0a1a0a',
            border: '1px solid #2ecc71',
            borderRadius: 6,
            padding: '1rem 1.5rem',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Signups (Redis) — durable
            </div>
            <div style={{ fontSize: '2.5rem', color: '#2ecc71', fontWeight: 900, lineHeight: 1 }}>
              {redisWaitlistCount}
            </div>
          </div>
          <div style={{ color: '#555', fontSize: 11 }}>
            Source: Upstash Redis waitlist_leads key<br />
            Persists across Lambda invocations
          </div>
        </div>
      )}

      {fetchError ? (
        <div
          style={{
            background: '#2a1010',
            border: '1px solid #eb4d4b',
            borderRadius: 4,
            padding: '1rem',
            color: '#eb4d4b',
          }}
        >
          Error: {fetchError}
        </div>
      ) : !data ? (
        <div style={{ color: '#888' }}>Loading...</div>
      ) : (
        <>
          {/* ── Shipped Artifacts ── */}
          {data.recentCommits && data.recentCommits.length > 0 && (
            <>
              <h2
                style={{
                  fontSize: '0.85rem',
                  color: '#ffd600',
                  margin: '1.5rem 0 0.5rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Shipped Artifacts (last {data.recentCommits.length})
              </h2>
              <div
                style={{
                  background: '#1a1a0a',
                  border: '1px solid #2a2a10',
                  borderRadius: 4,
                  padding: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                {(data.recentCommits as { sha: string; msg: string }[]).map((c) => (
                  <div
                    key={c.sha}
                    style={{
                      padding: '3px 0',
                      borderBottom: '1px solid #1e1e10',
                    }}
                  >
                    <span style={{ color: '#27d9e8' }}>{c.sha}</span>{' '}
                    <span style={{ color: '#e0e0e0' }}>{c.msg}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Auth Reliability ── */}
          {data.authEvents && (
            <>
              <h2
                style={{
                  fontSize: '0.85rem',
                  color: '#27d9e8',
                  margin: '1.5rem 0 0.5rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Auth Reliability (Convex)
              </h2>
              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ color: '#9aa', marginBottom: 6, fontSize: 12 }}>
                  Last 24h: {data.authEvents.stats?.successes ?? 0} success · {data.authEvents.stats?.failures ?? 0} fail · {data.authEvents.stats?.total ?? 0} total
                </div>
                {(data.authEvents.recent as any[] | undefined)?.slice(0, 8).map((event, i) => (
                  <div key={String(event?._id ?? i)} style={{ color: '#d7d7d7', fontSize: 12, borderTop: i === 0 ? 'none' : '1px solid #232323', padding: '4px 0' }}>
                    <span style={{ color: '#888' }}>{event?.method}</span>
                    {' · '}
                    <span style={{ color: event?.success ? '#2ecc71' : '#eb4d4b' }}>{event?.success ? 'ok' : 'fail'}</span>
                    {event?.errorCode ? ` · ${event.errorCode}` : ''}
                    {' · '}
                    <span style={{ color: '#666' }}>{event?.timestamp ? new Date(event.timestamp).toISOString() : ''}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Purchases ── */}
          {Array.isArray(data.purchaseEvents) && data.purchaseEvents.length > 0 && (
            <>
              <h2
                style={{
                  fontSize: '0.85rem',
                  color: '#27d9e8',
                  margin: '1.5rem 0 0.5rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Purchases (Convex)
              </h2>
              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                {(data.purchaseEvents as any[]).slice(0, 10).map((purchase, i) => (
                  <div key={String(purchase?._id ?? i)} style={{ color: '#d7d7d7', fontSize: 12, borderTop: i === 0 ? 'none' : '1px solid #232323', padding: '4px 0' }}>
                    <span style={{ color: '#27d9e8' }}>{purchase?.stripeSessionId ?? 'session-missing'}</span>
                    {' · '}
                    <span style={{ color: '#ffd600' }}>{purchase?.amount ?? 0} {purchase?.currency ?? 'usd'}</span>
                    {' · '}
                    <span style={{ color: purchase?.status === 'completed' ? '#2ecc71' : '#f39c12' }}>{purchase?.status ?? 'pending'}</span>
                    {' · '}
                    <span style={{ color: '#666' }}>{purchase?.createdAt ? new Date(purchase.createdAt).toISOString() : ''}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Funnel ── */}
          <h2
            style={{
              fontSize: '0.85rem',
              color: '#27d9e8',
              margin: '1.5rem 0 0.5rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Funnel
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.2rem',
            }}
          >
            {[
              {
                label: 'Waitlist Leads',
                value:
                  data.funnel?.waitlistLeads ??
                  data.redisFunnel?.waitlistLeads ??
                  '—',
                color: '#2ecc71',
              },
              {
                label: 'Founder Intents',
                value:
                  data.funnel?.founderIntents ??
                  data.redisFunnel?.founderIntents ??
                  '—',
                color: '#ffd600',
              },
              {
                label: 'Conversions',
                value:
                  data.funnel?.conversionEvents ??
                  data.redisFunnel?.conversionEvents ??
                  '—',
                color: '#ffd600',
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '0.75rem 1rem',
                }}
              >
                <div
                  style={{
                    color: '#888',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: '1.4rem', marginTop: '0.15rem', color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Redis Ops Log ── */}
          {data.redisOpsLog && data.redisOpsLog.length > 0 && (
            <>
              <h2
                style={{
                  fontSize: '0.85rem',
                  color: '#27d9e8',
                  margin: '1.5rem 0 0.5rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Redis Ops Log (last {data.redisOpsLog.length})
              </h2>
              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  overflowX: 'auto',
                }}
              >
                {(data.redisOpsLog as string[]).map((line: string, i: number) => {
                  let parsed: any = null
                  try {
                    parsed = JSON.parse(line)
                  } catch {
                    /* raw */
                  }
                  const level = parsed?.level ?? 'info'
                  const ts = parsed?.ts ? parsed.ts.slice(11, 19) : ''
                  const rest = parsed
                    ? JSON.stringify({ ...parsed, ts: undefined, level: undefined })
                    : line
                  const levelColors: Record<string, string> = {
                    error: '#eb4d4b',
                    warn: '#ffd600',
                    info: '#e0e0e0',
                    debug: '#888',
                  }
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '2px 0',
                        borderBottom: '1px solid #1e1e1e',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: levelColors[level] || '#e0e0e0',
                      }}
                    >
                      <span style={{ color: '#888' }}>{ts} </span>
                      <span>[{level.toUpperCase()}] </span>
                      {rest}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
