import { clearAllFlights, clearOtherUsersData, getActiveUser, setActiveUser } from '~/lib/flightStore'
import { download, flushOutbox, pendingCount, startSyncListeners } from '~/lib/syncEngine'
import type { SyncStatus } from '~/lib/syncEngine'
import { useSyncStatus } from '~/hooks/useFlights'
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
  /** True once Supabase has accepted a password-recovery link in this tab. */
  recoveryReady: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  /**
   * Uploads waiting changes (up to 5 s). If some are still waiting and `force` is not set, nothing is signed out
   * and `signedOut` is false so the caller can ask the user to confirm.
   */
  signOut: (opts?: { force?: boolean }) => Promise<{ signedOut: boolean; pending: number }>
  syncStatus: SyncStatus
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
  const [recoveryReady, setRecoveryReady] = useState(false)
  const syncStatus = useSyncStatus()

  /** Point the flight store at this user (clearing anyone else's data first), then start syncing. */
  function applyUser(u: { id: string; email?: string | null } | null | undefined) {
    if (u) {
      if (getActiveUser() !== u.id) {
        clearOtherUsersData(u.id)
        setActiveUser(u.id)
        startSyncListeners()
        void download(true)
      }
      setUser({ id: u.id, email: u.email })
    } else {
      setActiveUser(null)
      setUser(null)
    }
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    let mounted = true
    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      applyUser(data.session?.user)
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      applyUser(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true)
        navigate({ to: '/auth/reset-password' })
      }
      applyUser(session?.user)
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

  async function signOut(opts?: { force?: boolean }): Promise<{ signedOut: boolean; pending: number }> {
    if (!configured) return { signedOut: true, pending: 0 }
    // Try to save waiting changes first; ask the caller before throwing any away.
    await flushOutbox(5000)
    const pending = pendingCount()
    if (pending > 0 && !opts?.force) return { signedOut: false, pending }
    await supabaseSignOut()
    // Flights live in this browser's localStorage; don't leave them for the next person to sign in here.
    // They stay in the account and come back on the next sign-in.
    clearAllFlights()
    setActiveUser(null)
    setUser(null)
    return { signedOut: true, pending }
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
    <AuthContext.Provider value={{ user, loading, configured, recoveryReady, signIn, signUp, signOut, syncStatus, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
