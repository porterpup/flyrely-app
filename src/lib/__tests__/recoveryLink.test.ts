import { describe, expect, it } from 'vitest'
import { hasRecoveryLink } from '../recoveryLink'

describe('hasRecoveryLink', () => {
  it('accepts hash and query recovery links', () => {
    expect(hasRecoveryLink('', '#access_token=abc&refresh_token=x&type=recovery')).toBe(true)
    expect(hasRecoveryLink('?code=pkce123', '')).toBe(true)
    expect(hasRecoveryLink('?token_hash=h&type=recovery', '')).toBe(true)
  })
  it('rejects a bare visit and error links', () => {
    expect(hasRecoveryLink('', '')).toBe(false)
    expect(hasRecoveryLink('?foo=1', '#section')).toBe(false)
    expect(hasRecoveryLink('', '#error=access_denied&error_code=otp_expired')).toBe(false)
  })
})
