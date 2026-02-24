import type { Flight } from '~/types';

const STORAGE_KEY = 'flyrely_flights';

export function getFlights(): Flight[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Flight[]) : [];
  } catch {
    return [];
  }
}

export function saveFlight(flight: Flight): void {
  const flights = getFlights();
  const existing = flights.findIndex((f) => f.id === flight.id);
  if (existing >= 0) {
    flights[existing] = flight;
  } else {
    flights.push(flight);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

export function removeFlight(id: string): void {
  const flights = getFlights().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
}

export function getFlightById(id: string): Flight | undefined {
  return getFlights().find((f) => f.id === id);
}

export function getUpcomingFlights(): Flight[] {
  const now = new Date();
  return getFlights()
    .filter((f) => new Date(f.scheduledDeparture) >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledDeparture).getTime() -
        new Date(b.scheduledDeparture).getTime()
    );
}

/** Returns flights whose scheduled departure is in the past, newest first. */
export function getCompletedFlights(): Flight[] {
  const now = new Date();
  return getFlights()
    .filter((f) => new Date(f.scheduledDeparture) < now)
    .sort(
      (a, b) =>
        new Date(b.scheduledDeparture).getTime() -
        new Date(a.scheduledDeparture).getTime()
    );
}

/**
 * Auto-marks any flight whose departure was more than 2 hours ago as
 * 'completed' and saves it. Call this on app mount to keep the upcoming
 * list clean without requiring manual removal.
 */
export function autoCompleteOldFlights(): void {
  if (typeof window === 'undefined') return;
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  const flights = getFlights();
  let changed = false;
  for (const f of flights) {
    if (new Date(f.scheduledDeparture) < cutoff && f.status !== 'completed') {
      f.status = 'completed';
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
  }
}

/** Permanently removes all past (completed) flights from storage. */
export function clearCompletedFlights(): void {
  if (typeof window === 'undefined') return;
  const upcoming = getFlights().filter(
    (f) => new Date(f.scheduledDeparture) >= new Date()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(upcoming));
}

/**
 * Returns true if a flight is due for a prediction refresh.
 * Schedule:
 *   - More than 48hrs until departure: refresh if last checked > 24hrs ago (or never)
 *   - 2–48hrs until departure: refresh if last checked > 2hrs ago
 *   - < 2hrs until departure: always refresh (user is about to fly)
 *   - Past departure: never refresh
 */
export function shouldRefreshFlight(flight: Flight): boolean {
  const now = Date.now();
  const depMs = new Date(flight.scheduledDeparture).getTime();
  const hoursUntilDep = (depMs - now) / 3600000;

  // Past departure — don't refresh
  if (hoursUntilDep < 0) return false;

  const lastChecked = (flight as Flight & { lastCheckedAt?: number }).lastCheckedAt ?? 0;
  const hoursSinceCheck = (now - lastChecked) / 3600000;

  if (hoursUntilDep > 48) return hoursSinceCheck > 24;
  if (hoursUntilDep > 2) return hoursSinceCheck > 2;
  return true; // < 2hrs: always refresh
}

/** Stamp a flight with the current check time and save. */
export function stampFlightChecked(flight: Flight): Flight {
  const stamped = { ...flight, lastCheckedAt: Date.now() } as Flight & { lastCheckedAt: number };
  saveFlight(stamped as unknown as Flight);
  return stamped as unknown as Flight;
}
