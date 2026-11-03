import React, { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'

export const Route = createFileRoute('/auth/reset-password')({
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { updatePassword, configured } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
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

  if (linkExpired) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Reset link expired</h1>
        <p className="text-sm text-gray-700">
          This reset link has expired. Request a new one.
        </p>
        <p className="mt-4 text-sm">
          <Link to="/auth/forgot-password" className="text-primary-600">Request a new reset link</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Set a new password</h1>
      {!configured && (
        <p className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Sign-in isn't configured
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">New password</span>
          <input
            type="password"
            className="mt-1 block w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Confirm new password</span>
          <input
            type="password"
            className="mt-1 block w-full rounded border px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <button className="btn-primary w-full" type="submit" disabled={busy || !configured}>
          {busy ? 'Saving...' : 'Update password'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-4 text-sm">
        <Link to="/auth/login" className="text-primary-600">Back to sign in</Link>
      </p>
    </div>
  )
}
