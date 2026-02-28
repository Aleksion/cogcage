import { useState, useEffect } from 'react'

export function OpsLogPage() {
  const [data, setData] = useState<any>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const key = '' // In production, set via env or query
    const url = new URL('/api/ops', window.location.origin)
    if (key) url.searchParams.set('key', key)

    fetch(url.toString(), {
      headers: key ? { 'x-ops-key': key } : {},
    })
      .then((res) => {
        if (res.status === 401)
          throw new Error('Unauthorized — set MOLTPIT_OPS_KEY env var.')
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch((e) => setFetchError(e.message))
  }, [])

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
        }}
      >
        OPS LOG{' '}
        <span style={{ float: 'right', color: '#888', fontSize: 11 }}>
          auto-refresh:{' '}
          <a href="/ops-log" style={{ color: '#27d9e8' }}>
            refresh
          </a>
        </span>
      </h1>

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
