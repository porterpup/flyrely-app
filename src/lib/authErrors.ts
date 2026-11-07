import { NOT_CONFIGURED_MESSAGE } from '~/lib/supabaseAuth'

/** Turn a raw Supabase auth error message into something a tester can act on. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (message === NOT_CONFIGURED_MESSAGE || m.includes('not configured')) {
    return "Sign-in isn't set up on this server yet. Please tell the FlyRely team."
  }
  if (m.includes('invalid login credentials')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the confirmation link.'
  }
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_email_send_rate_limit')) {
    return 'Too many emails sent recently. Please wait an hour and try again.'
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That email already has an account. Try signing in.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return "Can't reach the sign-in service. Check your connection and try again."
  }
  return message
}
