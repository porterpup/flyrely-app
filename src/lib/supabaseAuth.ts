// Minimal Supabase auth helper (frontend)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const NOT_CONFIGURED_MESSAGE = "Sign-in isn't configured"

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

// Created lazily so the app (and predictions) still load when auth isn't configured
let client: SupabaseClient | null = null

/** Throws when env is missing; callers must check isSupabaseConfigured() first. */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  }
  return (client ??= createClient(SUPABASE_URL, SUPABASE_KEY))
}

export async function signInWithPassword(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return getSupabase().auth.signUp({ email, password })
}

export async function signOut() {
  return getSupabase().auth.signOut()
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/login` : undefined
  return getSupabase().auth.resetPasswordForEmail(email, { redirectTo })
}
