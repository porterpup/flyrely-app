import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  getSupabase,
  isSupabaseConfigured,
  NOT_CONFIGURED_MESSAGE,
  resetPasswordForEmail,
  signInWithPassword,
  signOut as supabaseSignOut,
  signUp as supabaseSignUp,
  updateUserPassword,
} from '~/lib/supabaseAuth'

type User = {
  id: string
  email?: string | null
}

type AuthResult = { error: string | null }
type SignUpResult = AuthResult & {
  /** True when a session was returned (email confirmation is off) */
  signedIn: boolean
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const notConfigured = (): AuthResult => ({ error: NOT_CONFIGURED_MESSAGE })

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    let mounted = true
    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      setUser(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') navigate({ to: '/auth/reset-password' })
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  async function signIn(email: string, password: string): Promise<AuthResult> {
    if (!configured) return notConfigured()
    const { error } = await signInWithPassword(email, password)
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string): Promise<SignUpResult> {
    if (!configured) return { ...notConfigured(), signedIn: false }
    const { data, error } = await supabaseSignUp(email, password)
    return { error: error?.message ?? null, signedIn: Boolean(data?.session) }
  }

  async function signOut() {
    if (!configured) return
    await supabaseSignOut()
    setUser(null)
  }

  async function resetPassword(email: string): Promise<AuthResult> {
    if (!configured) return notConfigured()
    const { error } = await resetPasswordForEmail(email)
    return { error: error?.message ?? null }
  }

  async function updatePassword(password: string): Promise<AuthResult> {
    if (!configured) return notConfigured()
    const { error } = await updateUserPassword(password)
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ user, loading, configured, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
