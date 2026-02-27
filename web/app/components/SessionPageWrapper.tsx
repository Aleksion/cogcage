import { useState, useEffect } from 'react'
import SessionRoom from './SessionRoom'

/**
 * Client-side wrapper for the SessionRoom component.
 * Fetches the session data from the API before rendering SessionRoom.
 * Replaces the server-side session fetch that was in the Astro page.
 */
export function SessionPageWrapper({
  sessionId,
  participantId,
}: {
  sessionId: string
  participantId: string
}) {
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session not found')
        return res.json()
      })
      .then((data) => setSession(data))
      .catch((err) => setError(err.message))
  }, [sessionId])

  if (error) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: '4rem auto',
          padding: '2rem',
          textAlign: 'center',
          color: '#f6f7ff',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Session Not Found
        </h1>
        <p style={{ color: '#d0d5ef' }}>{error}</p>
        <a
          href="/play"
          style={{ color: '#8a8fff', textDecoration: 'underline' }}
        >
          Back to Play
        </a>
      </div>
    )
  }

  if (!session) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: '#f6f7ff',
        }}
      >
        Loading session...
      </div>
    )
  }

  return <SessionRoom session={session} participantId={participantId} />
}
