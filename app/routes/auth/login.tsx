import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'
import { Alert, Button, Input } from '~/components/ui'
import { friendlyAuthError } from '~/lib/authErrors'
import { sanitizeRedirect } from '~/lib/authGate'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeRedirect(search.redirect)
    return redirect ? { redirect } : {}
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { signIn, configured } = useAuth()
  const { redirect } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Navigation after sign-in is handled by AuthGate (signed-in users on /auth/login
  // are sent to `redirect`, or "/").
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(friendlyAuthError(error))
  }

  const search = redirect ? { redirect } : {}

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">FlyRely</h1>
        <p className="text-sm text-ink-caption">Private beta</p>
      </div>
      <h2 className="text-xl font-semibold text-navy-900">Sign in</h2>
      {!configured && (
        <Alert status="warning" lineOne={friendlyAuthError("Sign-in isn't configured")} />
      )}
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
          autoComplete="current-password"
          required
        />
        {error && <Alert status="error" lineOne={error} />}
        <Button fullWidth type="submit" loading={busy} disabled={!configured}>
          {busy ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link to="/auth/forgot-password" className="text-primary-600">Forgot password?</Link>
        <Link to="/auth/signup" search={search} className="text-primary-600">Create account</Link>
      </div>
    </div>
  )
}
