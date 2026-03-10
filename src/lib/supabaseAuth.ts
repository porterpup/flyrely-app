// Minimal Supabase auth helper (frontend)
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}
