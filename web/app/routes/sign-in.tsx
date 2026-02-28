import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useState } from 'react'

export const Route = createFileRoute('/sign-in')({
  head: () => ({
    meta: [{ title: 'The Molt Pit — Sign In' }],
  }),
  component: SignInPage,
})

function SignInPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#d0d5ef' }}>Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>You're signed in</h1>
        <Link to="/" style={{ color: '#8a8fff', textDecoration: 'underline' }}>
          Back to homepage
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Sign In</h1>
      <p style={{ color: '#d0d5ef', marginBottom: '2rem' }}>
        Sign in to save your shells and compete on the ladder.
      </p>
      <GitHubSignIn />
      <div style={{ margin: '1.5rem 0', color: '#666', fontSize: '0.9rem' }}>or</div>
      <EmailOTPForm />
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" style={{ color: '#8a8fff', textDecoration: 'underline' }}>
          Back to homepage
        </Link>
      </div>
    </div>
  )
}

function GitHubSignIn() {
  const { signIn } = useAuthActions()
  return (
    <button
      onClick={() => void signIn('github')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: '#24292e',
        border: '1px solid #444',
        borderRadius: '8px',
        cursor: 'pointer',
      }}
    >
      Sign in with GitHub
    </button>
  )
}

function EmailOTPForm() {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSendCode = async () => {
    setError('')
    try {
      await signIn('resend-otp', { email })
      setSent(true)
    } catch (e: any) {
      setError(e.message || 'Failed to send code')
    }
  }

  const handleVerify = async () => {
    setError('')
    try {
      await signIn('resend-otp', { email, code })
    } catch (e: any) {
      setError(e.message || 'Invalid code')
    }
  }

  if (!sent) {
    return (
      <div>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            borderRadius: '8px',
            border: '1px solid #444',
            backgroundColor: '#1a1a2e',
            color: '#fff',
            width: '100%',
            maxWidth: 300,
            marginBottom: '0.75rem',
          }}
        />
        <br />
        <button
          onClick={handleSendCode}
          disabled={!email}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#fff',
            backgroundColor: '#4a4aff',
            border: 'none',
            borderRadius: '8px',
            cursor: email ? 'pointer' : 'not-allowed',
            opacity: email ? 1 : 0.5,
          }}
        >
          Send magic link
        </button>
        {error && <p style={{ color: '#ff6b6b', marginTop: '0.5rem' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <p style={{ color: '#d0d5ef', marginBottom: '0.75rem' }}>
        Check your email for a verification code.
      </p>
      <input
        type="text"
        placeholder="Enter code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{
          padding: '0.75rem',
          fontSize: '1rem',
          borderRadius: '8px',
          border: '1px solid #444',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          width: '100%',
          maxWidth: 300,
          marginBottom: '0.75rem',
        }}
      />
      <br />
      <button
        onClick={handleVerify}
        disabled={!code}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: '#fff',
          backgroundColor: '#4a4aff',
          border: 'none',
          borderRadius: '8px',
          cursor: code ? 'pointer' : 'not-allowed',
          opacity: code ? 1 : 0.5,
        }}
      >
        Verify
      </button>
      {error && <p style={{ color: '#ff6b6b', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
