import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useEffect, useState } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');

  .signin-root {
    min-height: 100vh;
    background: #1A1A1A;
    display: flex;
    flex-direction: column;
    font-family: 'Kanit', sans-serif;
    color: #f0f0f5;
  }

  .signin-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .signin-logo {
    font-family: 'Bangers', cursive;
    font-size: 1.6rem;
    color: #EB4D4B;
    text-decoration: none;
    text-shadow: 2px 2px 0 #000;
    letter-spacing: 1px;
  }

  .signin-back {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    text-decoration: none;
    letter-spacing: 0.5px;
    transition: color 0.15s;
  }
  .signin-back:hover { color: rgba(255,255,255,0.8); }

  .signin-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
  }

  .signin-card {
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    text-align: center;
  }

  .signin-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #FFD600;
    margin: 0 0 0.75rem;
  }

  .signin-title {
    font-family: 'Bangers', cursive;
    font-size: 3rem;
    letter-spacing: 2px;
    color: #fff;
    margin: 0 0 0.5rem;
    line-height: 1;
    text-shadow: 3px 3px 0 rgba(0,0,0,0.5);
  }

  .signin-sub {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.45);
    margin: 0 0 2rem;
    line-height: 1.5;
  }

  .signin-github-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.85rem 1.5rem;
    font-family: 'Kanit', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #fff;
    background: #EB4D4B;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .signin-github-btn:hover { background: #d93a38; transform: translateY(-1px); }
  .signin-github-btn:active { transform: translateY(0); }

  .signin-divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
    color: rgba(255,255,255,0.2);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 1px;
  }
  .signin-divider::before,
  .signin-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.1);
  }

  .signin-input {
    width: 100%;
    padding: 0.8rem 1rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.95rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: #fff;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
    margin-bottom: 0.75rem;
  }
  .signin-input::placeholder { color: rgba(255,255,255,0.25); }
  .signin-input:focus { border-color: #00E5FF; }

  .signin-email-btn {
    width: 100%;
    padding: 0.8rem 1.5rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1A1A1A;
    background: #00E5FF;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .signin-email-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .signin-email-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .signin-error {
    margin-top: 0.75rem;
    padding: 0.6rem 0.85rem;
    background: rgba(235, 77, 75, 0.12);
    border: 1px solid rgba(235, 77, 75, 0.3);
    border-radius: 6px;
    color: #EB4D4B;
    font-size: 0.85rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .signin-guest-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1.5rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.1s;
    margin-top: 0.75rem;
  }
  .signin-guest-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); transform: translateY(-1px); }
  .signin-guest-btn:active { transform: translateY(0); }

  .signin-success-note {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  .signin-success-note strong { color: #00E5FF; }

  .signin-logged-in-title {
    font-family: 'Bangers', cursive;
    font-size: 2.5rem;
    letter-spacing: 2px;
    color: #FFD600;
    margin: 0 0 0.5rem;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.4);
  }

  .signin-cta-btn {
    display: inline-block;
    padding: 0.85rem 2rem;
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    letter-spacing: 2px;
    color: #1A1A1A;
    background: #FFD600;
    border-radius: 10px;
    text-decoration: none;
    transition: transform 0.1s, background 0.15s;
    text-shadow: none;
  }
  .signin-cta-btn:hover { background: #f0c800; transform: translateY(-2px); }
`

export const Route = createFileRoute('/sign-in')({
  head: () => ({
    meta: [{ title: 'The Molt Pit — Enter the Pit' }],
  }),
  component: SignInPage,
})

function SignInPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      // Auto-redirect after a beat
      const t = setTimeout(() => navigate({ to: '/forge' }), 1200)
      return () => clearTimeout(t)
    }
  }, [isAuthenticated, navigate])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="signin-root">
        <nav className="signin-nav">
          <Link to="/" className="signin-logo">THE MOLT PIT</Link>
          <Link to="/" className="signin-back">← Back</Link>
        </nav>

        <div className="signin-body">
          {isLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', letterSpacing: 1 }}>
              LOADING...
            </div>
          ) : isAuthenticated ? (
            <div className="signin-card">
              <div className="signin-eyebrow">CRAWLER IDENTIFIED</div>
              <div className="signin-logged-in-title">YOU'RE IN.</div>
              <p className="signin-sub" style={{ marginBottom: '1.5rem' }}>Redirecting you to The Forge...</p>
              <Link to="/forge" className="signin-cta-btn">ENTER THE FORGE →</Link>
            </div>
          ) : (
            <div className="signin-card">
              <div className="signin-eyebrow">PLAYER AUTH</div>
              <h1 className="signin-title">ENTER THE PIT</h1>
              <p className="signin-sub">Sign in to save your shells and compete on the ladder.</p>

              <GitHubSignIn />

              <div className="signin-divider">or</div>

              <EmailOTPForm />

              {/* Guest auth is dev-only — only shown when VITE_ENABLE_GUEST_AUTH=true */}
              {import.meta.env.VITE_ENABLE_GUEST_AUTH === "true" && (
                <>
                  <div className="signin-divider">or</div>
                  <GuestSignIn />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function GitHubSignIn() {
  const { signIn } = useAuthActions()
  return (
    <button className="signin-github-btn" onClick={() => void signIn('github')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
      Continue with GitHub
    </button>
  )
}

function EmailOTPForm() {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendCode = async () => {
    setError('')
    setLoading(true)
    try {
      await signIn('resend-otp', { email })
      setSent(true)
    } catch (e: any) {
      setError(e.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setLoading(true)
    try {
      await signIn('resend-otp', { email, code })
    } catch (e: any) {
      setError(e.message || 'Invalid code — try again')
    } finally {
      setLoading(false)
    }
  }

  if (!sent) {
    return (
      <div>
        <input
          className="signin-input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && email && handleSendCode()}
        />
        <button
          className="signin-email-btn"
          onClick={handleSendCode}
          disabled={!email || loading}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
        {error && <div className="signin-error">{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <p className="signin-success-note">
        Code sent to <strong>{email}</strong>. Check your inbox.
      </p>
      <input
        className="signin-input"
        type="text"
        placeholder="Enter 6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && code && handleVerify()}
        autoFocus
      />
      <button
        className="signin-email-btn"
        onClick={handleVerify}
        disabled={!code || loading}
      >
        {loading ? 'Verifying...' : 'Verify & Enter'}
      </button>
      {error && <div className="signin-error">{error}</div>}
      <button
        onClick={() => { setSent(false); setCode(''); setError('') }}
        style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'Kanit', sans-serif" }}
      >
        ← Use a different email
      </button>
    </div>
  )
}

function GuestSignIn() {
  const { signIn } = useAuthActions()
  const [loading, setLoading] = useState(false)

  const handleGuestSignIn = async () => {
    setLoading(true)
    try {
      await signIn('anonymous')
    } catch (e) {
      // Anonymous auth shouldn't fail in practice
      console.error('Guest sign-in failed:', e)
      setLoading(false)
    }
  }

  return (
    <button className="signin-guest-btn" onClick={handleGuestSignIn} disabled={loading}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      {loading ? 'Entering...' : 'Continue as Guest'}
    </button>
  )
}
