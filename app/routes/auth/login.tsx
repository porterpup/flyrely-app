import React, { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'

export const Route = createFileRoute('/auth/login')({
  component: LoginRoute,
})

function LoginRoute() {
  const { signIn, user, configured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate({ to: '/' })
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error)
    else navigate({ to: '/' })
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {!configured && (
        <p className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Sign-in isn't configured
        </p>
      )}
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
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn-primary w-full" type="submit" disabled={busy || !configured}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/auth/forgot-password" className="text-primary-600">Forgot password?</Link>
        <Link to="/auth/signup" className="text-primary-600">Create account</Link>
      </div>
    </div>
  )
}
