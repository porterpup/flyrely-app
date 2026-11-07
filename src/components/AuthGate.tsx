import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { useAuth } from '~/context/AuthContext'
import { decideGate } from '~/lib/authGate'

/**
 * Client-side sign-in gate. Supabase keeps the session in browser storage, so the
 * server can't see it: SSR and the first client render show a neutral loading state
 * and protected content only renders once we know the user is signed in.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { pathname, search } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.searchStr }),
  })
  const decision = decideGate({ pathname, search, loading, signedIn: Boolean(user) })
  const target = decision.kind === 'redirect' ? decision.to : null

  useEffect(() => {
    if (target) router.history.replace(target)
  }, [target, router])

  if (decision.kind === 'allow') return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-primary-600" />
    </div>
  )
}
