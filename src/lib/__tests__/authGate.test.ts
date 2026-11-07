import { describe, expect, it } from 'vitest'
import { decideGate, isAuthPath, loginUrl, sanitizeRedirect } from '../authGate'
import { friendlyAuthError } from '../authErrors'

describe('sanitizeRedirect', () => {
  it('accepts same-origin relative paths', () => {
    expect(sanitizeRedirect('/')).toBe('/')
    expect(sanitizeRedirect('/flights/add?x=1#h')).toBe('/flights/add?x=1#h')
  })
  it.each([
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    'http://evil.com/x',
    'javascript:alert(1)',
    'evil.com',
    '',
    '/\t/evil.com',
    '/\n/evil.com',
  ])('rejects %j', (v) => {
    expect(sanitizeRedirect(v)).toBeNull()
  })
  it('rejects non-strings', () => {
    expect(sanitizeRedirect(undefined)).toBeNull()
    expect(sanitizeRedirect(null)).toBeNull()
    expect(sanitizeRedirect(['/a'])).toBeNull()
  })
})

describe('isAuthPath', () => {
  it('matches /auth/* only', () => {
    expect(isAuthPath('/auth/login')).toBe(true)
    expect(isAuthPath('/auth/reset-password')).toBe(true)
    expect(isAuthPath('/authors')).toBe(false)
    expect(isAuthPath('/')).toBe(false)
  })
})

describe('loginUrl', () => {
  it('encodes the original path and query', () => {
    expect(loginUrl('/flights/add', '?a=1&b=2')).toBe('/auth/login?redirect=%2Fflights%2Fadd%3Fa%3D1%26b%3D2')
  })
  it('omits redirect for the home page', () => {
    expect(loginUrl('/', '')).toBe('/auth/login')
  })
})

describe('decideGate', () => {
  const base = { pathname: '/', search: '', loading: false, signedIn: false }
  it('shows neutral loading while auth state is unknown', () => {
    expect(decideGate({ ...base, loading: true })).toEqual({ kind: 'loading' })
  })
  it('redirects signed-out visitors to login with the original path', () => {
    expect(decideGate({ ...base, pathname: '/trips' })).toEqual({
      kind: 'redirect',
      to: '/auth/login?redirect=%2Ftrips',
    })
  })
  it('allows signed-in users', () => {
    expect(decideGate({ ...base, pathname: '/trips', signedIn: true })).toEqual({ kind: 'allow' })
  })
  it('allows auth pages when signed out, even while loading', () => {
    for (const p of ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']) {
      expect(decideGate({ ...base, pathname: p, loading: true })).toEqual({ kind: 'allow' })
    }
  })
  it('sends signed-in users away from login to / or a safe redirect', () => {
    const si = { ...base, pathname: '/auth/login', signedIn: true }
    expect(decideGate(si)).toEqual({ kind: 'redirect', to: '/' })
    expect(decideGate({ ...si, search: '?redirect=%2Ftrips' })).toEqual({ kind: 'redirect', to: '/trips' })
    expect(decideGate({ ...si, search: '?redirect=%2F%2Fevil.com' })).toEqual({ kind: 'redirect', to: '/' })
  })
  it('lets a signed-in recovery session reach reset-password', () => {
    expect(decideGate({ ...base, pathname: '/auth/reset-password', signedIn: true })).toEqual({ kind: 'allow' })
  })
})

describe('friendlyAuthError', () => {
  it('maps known Supabase errors', () => {
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/wrong email or password/i)
    expect(friendlyAuthError('Email not confirmed')).toMatch(/confirm your email/i)
    expect(friendlyAuthError('email rate limit exceeded')).toMatch(/too many emails/i)
    expect(friendlyAuthError("Sign-in isn't configured")).toMatch(/isn't set up/i)
  })
  it('passes unknown messages through', () => {
    expect(friendlyAuthError('Something odd')).toBe('Something odd')
  })
})
