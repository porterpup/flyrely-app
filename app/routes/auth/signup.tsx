import React, { useState } from 'react'
import { supabase } from '~/lib/supabaseAuth'

export default function SignupRoute() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Creating account...')
    const res = await supabase.auth.signUp({ email, password: undefined })
    if (res.error) setStatus('Signup failed: ' + res.error.message)
    else setStatus('Check your email for a sign-in link (magic link).')
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign up</h1>
      <form onSubmit={handleSignUp} className="space-y-3">
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
        <div>
          <button className="btn-primary" type="submit">Create account</button>
        </div>
      </form>
      {status && <p className="mt-3 text-sm text-gray-700">{status}</p>}
    </div>
  )
}
