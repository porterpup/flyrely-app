// On-device copilot preferences (plan §8). Stored only in localStorage under one key.
// Nothing here is sent anywhere except the home airport, which the caller passes to
// /copilot/options for that request only. All storage access is try/catch-wrapped, and
// every read falls back to defaults, so a private window or blocked storage just means
// "no saved preferences".

export const PREFS_KEY = 'flyrely_copilot_v1';

/** The user's own disruption state for one flight. The API's `state` is derived from this in the panel. */
export type UserFlightState = 'cancelled' | 'rebooked_today' | 'rebooked_later' | 'not_cancelled';

const USER_FLIGHT_STATES: readonly UserFlightState[] = [
  'cancelled',
  'rebooked_today',
  'rebooked_later',
  'not_cancelled',
];

export interface CopilotPrefs {
  /** IATA code, uppercase, or null when not set. */
  homeAirport: string | null;
  /** Keyed by client flight id (the app's Flight.id). */
  flights: Record<string, UserFlightState>;
}

const IATA_PATTERN = /^[A-Z]{3}$/;

function emptyPrefs(): CopilotPrefs {
  return { homeAirport: null, flights: {} };
}

function isUserFlightState(value: unknown): value is UserFlightState {
  return typeof value === 'string' && (USER_FLIGHT_STATES as readonly string[]).includes(value);
}

function parsePrefs(raw: string | null): CopilotPrefs {
  if (!raw) return emptyPrefs();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return emptyPrefs();
    const record = data as { homeAirport?: unknown; flights?: unknown };

    const homeAirport =
      typeof record.homeAirport === 'string' && IATA_PATTERN.test(record.homeAirport)
        ? record.homeAirport
        : null;

    const flights: Record<string, UserFlightState> = {};
    if (typeof record.flights === 'object' && record.flights !== null) {
      for (const [id, state] of Object.entries(record.flights as Record<string, unknown>)) {
        if (isUserFlightState(state)) flights[id] = state;
      }
    }
    return { homeAirport, flights };
  } catch {
    // Corrupt JSON: treat as empty. The next write replaces it.
    return emptyPrefs();
  }
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null; // SSR / non-browser
  try {
    return window.localStorage ?? null;
  } catch {
    // Accessing localStorage can throw (blocked site data, sandboxed iframe).
    return null;
  }
}

export function loadPrefs(): CopilotPrefs {
  const storage = getStorage();
  if (!storage) return emptyPrefs();
  try {
    return parsePrefs(storage.getItem(PREFS_KEY));
  } catch {
    return emptyPrefs();
  }
}

/** Returns false when nothing could be saved (no storage, quota, or storage blocked). */
function savePrefs(prefs: CopilotPrefs): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function getHomeAirport(): string | null {
  return loadPrefs().homeAirport;
}

/**
 * Save the home airport (case-insensitive IATA code), or pass null to clear it.
 * Returns false when the code is not three letters or nothing could be saved.
 */
export function setHomeAirport(code: string | null): boolean {
  let value: string | null = null;
  if (code !== null) {
    value = code.trim().toUpperCase();
    if (!IATA_PATTERN.test(value)) return false;
  }
  const prefs = loadPrefs();
  return savePrefs({ ...prefs, homeAirport: value });
}

export function getFlightState(flightId: string): UserFlightState | null {
  return loadPrefs().flights[flightId] ?? null;
}

/** Set a flight's user state, or pass null to clear it. Returns false if nothing could be saved. */
export function setFlightState(flightId: string, state: UserFlightState | null): boolean {
  const prefs = loadPrefs();
  if (state === null) {
    if (!(flightId in prefs.flights)) return true; // nothing to clear
    const rest = { ...prefs.flights };
    delete rest[flightId];
    return savePrefs({ ...prefs, flights: rest });
  }
  return savePrefs({ ...prefs, flights: { ...prefs.flights, [flightId]: state } });
}

/** Drop a flight's state when the flight is removed. A no-op (no write) if there is nothing stored. */
export function clearFlightPrefs(flightId: string): boolean {
  return setFlightState(flightId, null);
}
