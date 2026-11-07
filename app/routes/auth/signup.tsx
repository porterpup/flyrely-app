import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'
import { Alert, Button, Input } from '~/components/ui'
import { friendlyAuthError } from '~/lib/authErrors'
import { sanitizeRedirect } from '~/lib/authGate'

export const Route = createFileRoute('/auth/signup')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeRedirect(search.redirect)
    return redirect ? { redirect } : {}
  },
  component: SignupRoute,
})

function SignupRoute() {
  const { signUp, configured } = useAuth()
  const { redirect } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const search = redirect ? { redirect } : {}

  // When a session is returned, AuthGate sends the user on to `redirect` (or "/").
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setBusy(true)
    const { error, signedIn } = await signUp(email, password)
    setBusy(false)
    if (error) setError(friendlyAuthError(error))
    else if (!signedIn) setConfirmationSent(true)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">FlyRely</h1>
        <p className="text-sm text-ink-caption">Private beta</p>
      </div>
      <h2 className="text-xl font-semibold text-navy-900">Create account</h2>
      {!configured && (
        <Alert status="warning" lineOne={friendlyAuthError("Sign-in isn't configured")} />
      )}
      {confirmationSent ? (
        <>
          <Alert
            status="success"
            lineOne="Check your email to confirm, then sign in."
            lineTwo={email}
          />
          <Link to="/auth/login" search={search} className="text-sm text-primary-600">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              hint="At least 6 characters"
              required
            />
            {error && <Alert status="error" lineOne={error} />}
            <Button fullWidth type="submit" loading={busy} disabled={!configured}>
              {busy ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <div className="flex justify-between text-sm">
            <span>
              Already have an account?{' '}
              <Link to="/auth/login" search={search} className="text-primary-600">Sign in</Link>
            </span>
            <Link to="/auth/forgot-password" className="text-primary-600">Forgot password?</Link>
          </div>
        </>
      )}
    </div>
  )
}
