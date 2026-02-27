import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in')({
  head: () => ({
    meta: [{ title: 'The Molt Pit — Sign In' }],
  }),
  component: SignInPage,
})

function SignInPage() {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '4rem auto',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Sign In</h1>
      <p style={{ color: '#d0d5ef', marginBottom: '1.5rem' }}>
        Authentication is coming soon (TASK-020). For now, a cookie-based
        anonymous player ID is used automatically.
      </p>
      <Link to="/" style={{ color: '#8a8fff', textDecoration: 'underline' }}>
        Back to homepage
      </Link>
    </div>
  )
}
