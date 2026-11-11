import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'
import { Check } from 'lucide-react'
import { Alert, Button, Input, PasswordInput } from '~/components/ui'
import { validationErrors } from '~/components/ui/InputError'
import { AuthLayout } from '~/components/auth/AuthLayout'
import { friendlyAuthError } from '~/lib/authErrors'
import { sanitizeRedirect } from '~/lib/authGate'

export const Route = createFileRoute('/auth/signup')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeRedirect(search.redirect)
    return redirect ? { redirect } : {}
  },
  component: SignupRoute,
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SignupRoute() {
  const { signUp, configured } = useAuth()
  const { redirect } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const passwordOk = password.length >= 6

  const search = redirect ? { redirect } : {}

  // When a session is returned, AuthGate sends the user on to `redirect` (or "/").
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError(validationErrors.email.invalid)
      return
    }
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
    <AuthLayout title="Create account" subtitle="Free while we are in private beta.">
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
          <Link to="/auth/login" search={search} className="text-body-md font-medium text-surface-accent">
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
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError(null)
              }}
              onBlur={() => {
                if (email.trim() && !EMAIL_PATTERN.test(email.trim())) setEmailError(validationErrors.email.invalid)
              }}
              error={emailError ?? undefined}
              autoComplete="email"
              required
            />
            <div className="flex flex-col gap-1.5">
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p
              className={`flex items-center gap-1.5 px-1 text-body-sm ${passwordOk ? 'text-status-success-text' : 'text-ink-caption'}`}
            >
              {passwordOk && <Check className="h-4 w-4" aria-hidden />}
              At least 6 characters
            </p>
            </div>
            {error && <Alert status="error" lineOne={error} />}
            <Button fullWidth type="submit" loading={busy} disabled={!configured}>
              {busy ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-body-md text-ink-caption">
            <span>
              Have an account?{' '}
              <Link to="/auth/login" search={search} className="whitespace-nowrap text-body-md font-medium text-surface-accent">Sign in</Link>
            </span>
            <Link to="/auth/forgot-password" className="whitespace-nowrap text-body-md font-medium text-surface-accent">Forgot password?</Link>
          </div>
        </>
      )}
    </AuthLayout>
  )
}
