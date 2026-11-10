// Small user profile kept in Supabase user metadata (no table): home airport + preferred airline.
import { AIRLINES } from '~/lib/airports';
import type { AirlineInfo } from '~/lib/airports';
import { getAirportRef } from '~/lib/airportRef';

export interface Profile {
  homeAirport: string | null;
  preferredAirline: string | null;
}

export const EMPTY_PROFILE: Profile = { homeAirport: null, preferredAirline: null };

/** Spirit has stopped flying; Hawaiian now flies as Alaska, so HA is not offered either. */
const EXCLUDED = new Set(['NK', 'HA']);

export const PROFILE_AIRLINES: AirlineInfo[] = AIRLINES.filter((a) => !EXCLUDED.has(a.code));

/** Normalise an airline code for profile use: uppercase, HA becomes AS. Null if not a supported airline. */
export function normalizeAirline(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  let c = code.trim().toUpperCase();
  if (c === 'HA') c = 'AS';
  return PROFILE_AIRLINES.some((a) => a.code === c) ? c : null;
}

/** A 3-letter US airport code from our reference list, uppercase; null otherwise. */
export function normalizeAirport(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const c = code.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) && getAirportRef(c) ? c : null;
}

/** Message for an airport the user typed, or null if it is fine (or empty). */
export function airportError(code: string): string | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  return normalizeAirport(c) ? null : `We don't recognise "${c}". FlyRely covers US airports only.`;
}

/** Read the profile out of Supabase user_metadata, ignoring anything invalid. */
export function profileFromMetadata(meta: unknown): Profile {
  const m = (meta && typeof meta === 'object' ? meta : {}) as Record<string, unknown>;
  return { homeAirport: normalizeAirport(m.home_airport), preferredAirline: normalizeAirline(m.preferred_airline) };
}

/** The metadata object to send to supabase.auth.updateUser({ data }). Empty values clear the field. */
export function profileToMetadata(p: Profile): { home_airport: string | null; preferred_airline: string | null } {
  return { home_airport: p.homeAirport, preferred_airline: p.preferredAirline };
}
