// Pure logic for the sign-in gate (kept free of React so it is easy to test).

/** Accept only same-origin relative paths: start with "/" but not "//" (or "/\"). */
export function sanitizeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  // Control characters (tab/newline are stripped by browsers and could re-form "//").
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null
  return value
}

export function isAuthPath(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/')
}

export type GateInput = {
  pathname: string
  /** Raw search string including the leading "?" (or empty). */
  search: string
  loading: boolean
  signedIn: boolean
}

export type GateDecision =
  | { kind: 'allow' }
  | { kind: 'loading' }
  | { kind: 'redirect'; to: string }

export function loginUrl(pathname: string, search: string): string {
  const original = sanitizeRedirect(pathname + search)
  // Don't bother carrying "/" along.
  if (!original || original === '/') return '/auth/login'
  return `/auth/login?redirect=${encodeURIComponent(original)}`
}

export function decideGate({ pathname, search, loading, signedIn }: GateInput): GateDecision {
  if (isAuthPath(pathname)) {
    if (signedIn && (pathname === '/auth/login' || pathname === '/auth/signup')) {
      const redirect = new URLSearchParams(search).get('redirect')
      return { kind: 'redirect', to: sanitizeRedirect(redirect) ?? '/' }
    }
    // Auth pages render immediately; reset-password must work with a recovery session.
    return { kind: 'allow' }
  }
  if (loading) return { kind: 'loading' }
  if (signedIn) return { kind: 'allow' }
  return { kind: 'redirect', to: loginUrl(pathname, search) }
}
