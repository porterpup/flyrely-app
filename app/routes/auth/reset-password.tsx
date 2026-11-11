import React, { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'
import { Alert, Button, PasswordInput } from '~/components/ui'
import { buttonSizeClasses, buttonVariantClasses } from '~/components/ui/Button'
import { cn } from '~/lib/utils'
import { AuthLayout } from '~/components/auth/AuthLayout'
import { arrivedWithRecoveryLink, hasRecoveryLink } from '~/lib/recoveryLink'

export const Route = createFileRoute('/auth/reset-password')({
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { updatePassword, configured, recoveryReady } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)
  // null until we have looked at the URL (avoids flashing the expired message on first paint)
  const [linkPresent, setLinkPresent] = useState<boolean | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    setLinkPresent(arrivedWithRecoveryLink() || hasRecoveryLink(window.location.search, window.location.hash))
    const get = (k: string) => hash.get(k) ?? params.get(k)
    if (get('error_code') === 'otp_expired' || get('error') === 'access_denied') {
      setLinkExpired(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setError(error)
    else navigate({ to: '/' })
  }

  if (linkPresent === null && !recoveryReady && !linkExpired) return null

  if (linkExpired || (!linkPresent && !recoveryReady)) {
    return (
      <AuthLayout title="Reset link expired">
        <p className="text-body-lg text-ink-caption">This reset link has expired. Request a new one.</p>
        <Link
          to="/auth/forgot-password"
          className={cn(
            'inline-flex w-full items-center justify-center',
            buttonVariantClasses.primary,
            buttonSizeClasses.default,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent focus-visible:ring-offset-2'
          )}
        >
          Go to forgot password
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set a new password">
      {!configured && <Alert status="warning" lineOne="Sign-in isn't configured" />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordInput
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        {error && <Alert status="error" lineOne={error} />}
        <Button fullWidth type="submit" loading={busy} disabled={!configured}>
          {busy ? 'Saving...' : 'Update password'}
        </Button>
      </form>
      <Link to="/auth/login" className="text-body-md font-medium text-surface-accent">Back to sign in</Link>
    </AuthLayout>
  )
}
