import React, { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'

export const Route = createFileRoute('/auth/signup')({
  component: SignupRoute,
})

function SignupRoute() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [busy, setBusy] = useState(false)

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
    if (error) setError(error)
    else if (signedIn) navigate({ to: '/' })
    else setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Check your email</h1>
        <p className="text-sm text-gray-700">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Open it to
          finish creating your account, then sign in.
        </p>
        <Link to="/auth/login" className="mt-4 inline-block text-sm text-primary-600">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign up</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            className="mt-1 block w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Password</span>
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
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-4 text-sm">
        Already have an account? <Link to="/auth/login" className="text-primary-600">Sign in</Link>
      </p>
    </div>
  )
}
