import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'

export default function LoginRoute() {
  const { signInWithMagicLink, signInWithProvider } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const nav = useNavigate()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Sending sign-in link...')
    const { error } = await signInWithMagicLink(email)
    if (error) setStatus('Failed to send link. Check email and try again.')
    else setStatus('Check your inbox — sign-in link sent.')
  }

  async function handleGoogle() {
    try {
      await signInWithProvider('google')
      // provider will redirect; don't navigate here
    } catch (e) {
      setStatus('Google sign-in failed')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={handleMagicLink} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            className="mt-1 block w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">Send sign-in link</button>
          <button type="button" className="btn-outline" onClick={handleGoogle}>Google</button>
        </div>
      </form>
      {status && <p className="mt-3 text-sm text-gray-700">{status}</p>}
    </div>
  )
}
