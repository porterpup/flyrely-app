import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '~/lib/supabaseAuth'

type User = {
  id: string
  email?: string | null
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: unknown }>
  signInWithProvider: (provider: 'google') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null)
      setLoading(false)
    }

    init()

    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithMagicLink(email: string) {
    setLoading(true)
    const res = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    return { error: res.error }
  }

  async function signInWithProvider(provider: 'google') {
    // opens provider flow in new window
    await supabase.auth.signInWithOAuth({ provider })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithMagicLink, signInWithProvider, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
