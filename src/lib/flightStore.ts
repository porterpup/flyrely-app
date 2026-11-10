import type { Flight, Trip } from '~/types';
import { stripLegacy, validateFlightForCloud } from '~/lib/cloudFlights';
import {
  CACHE_PREFIX,
  DISMISS_PREFIX,
  LEGACY_KEY,
  OUTBOX_PREFIX,
  allKeys,
  cacheKey,
  readJson,
  removeKey,
  writeJson,
} from '~/lib/storageKeys';
import { configureEngine, dropEngineState, enqueue, mergeCloudWithOutbox, setEngineUser } from '~/lib/syncEngine';

/** Older versions stored invented values (scheduledArrival, delayMinutes, ...). Never show them. */
export function stripLegacyFields(raw: unknown): Flight | null {
  return stripLegacy(raw);
}

// ── State ───────────────────────────────────────────────────────────────────
// Pages stay synchronous: these functions read an in-memory copy of the signed-in user's flights, which is mirrored
// to a per-user localStorage cache. Writes update it at once and queue an upload (see syncEngine.ts).

export interface StoreSnapshot {
  flights: Flight[];
  trips: Trip[];
  /** First download for this user finished (or failed): "no flights" / "not found" can now be believed. */
  ready: boolean;
  /** The first download succeeded this session. */
  downloaded: boolean;
}

const EMPTY: StoreSnapshot = { flights: [], trips: [], ready: false, downloaded: false };

let activeUser: string | null = null;
let snapshot: StoreSnapshot = EMPTY;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function persistCache(): void {
  if (activeUser) {
    writeJson(cacheKey(activeUser), { flights: snapshot.flights, trips: snapshot.trips, pulledAt: Date.now() });
  }
}

function setData(flights: Flight[], trips: Trip[]): void {
  snapshot = { ...snapshot, flights, trips };
  persistCache();
  emit();
}

configureEngine({
  host: {
    applyCloud: (d) => setData(d.flights, d.trips),
    markReady: (downloaded) => {
      snapshot = { ...snapshot, ready: true, downloaded: snapshot.downloaded || downloaded };
      emit();
    },
    notify: emit,
  },
});

/** Called by AuthContext when the signed-in user changes (null = signed out). */
export function setActiveUser(userId: string | null): void {
  if (userId === activeUser) return;
  activeUser = userId;
  if (!userId) {
    snapshot = EMPTY;
    setEngineUser(null);
    emit();
    return;
  }
  const cached = readJson<{ flights?: unknown; trips?: unknown }>(cacheKey(userId));
  const flights = Array.isArray(cached?.flights)
    ? cached.flights.map(stripLegacyFields).filter((f): f is Flight => f !== null)
    : [];
  const trips = Array.isArray(cached?.trips) ? (cached.trips as Trip[]) : [];
  snapshot = { flights, trips, ready: false, downloaded: false };
  setEngineUser(userId);
  emit();
}

export function getActiveUser(): string | null {
  return activeUser;
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Stable between changes (for useSyncExternalStore). */
export function getSnapshot(): StoreSnapshot {
  return snapshot;
}

export function getServerSnapshot(): StoreSnapshot {
  return EMPTY;
}

export function isReady(): boolean {
  return snapshot.ready;
}

function requireUser(): void {
  if (!activeUser) throw new Error('not signed in');
}

const nowIso = () => new Date().toISOString();

// ── Reads ───────────────────────────────────────────────────────────────────

export function getFlights(): Flight[] {
  return snapshot.flights;
}

export function getTrips(): Trip[] {
  return snapshot.trips;
}

export function getTripById(id: string): Trip | undefined {
  return snapshot.trips.find((t) => t.id === id);
}

export function getFlightById(id: string): Flight | undefined {
  return snapshot.flights.find((f) => f.id === id);
}

/** Upcoming = departs now or later, soonest first. Pure, for components that already hold the flights. */
export function selectUpcoming(flights: Flight[]): Flight[] {
  const now = new Date();
  return flights
    .filter((f) => new Date(f.scheduledDeparture) >= now)
    .sort((a, b) => new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime());
}

/** Completed = departure in the past, newest first. */
export function selectCompleted(flights: Flight[]): Flight[] {
  const now = new Date();
  return flights
    .filter((f) => new Date(f.scheduledDeparture) < now)
    .sort((a, b) => new Date(b.scheduledDeparture).getTime() - new Date(a.scheduledDeparture).getTime());
}

export function getUpcomingFlights(): Flight[] {
  return selectUpcoming(getFlights());
}

/** Returns flights whose scheduled departure is in the past, newest first. */
export function getCompletedFlights(): Flight[] {
  return selectCompleted(getFlights());
}

// ── Writes (optimistic, queued for upload) ──────────────────────────────────

export function saveFlight(flight: Flight): void {
  requireUser();
  const clean = stripLegacyFields(flight) as Flight;
  const i = snapshot.flights.findIndex((f) => f.id === clean.id);
  const flights = snapshot.flights.slice();
  if (i >= 0) flights[i] = clean;
  else flights.push(clean);
  setData(flights, snapshot.trips);
  enqueue({ type: 'upsertFlight', flight: clean, at: nowIso() });
}

export function removeFlight(id: string): void {
  requireUser();
  setData(
    snapshot.flights.filter((f) => f.id !== id),
    snapshot.trips
  );
  enqueue({ type: 'deleteFlight', id, at: nowIso() });
}

/**
 * Auto-marks any flight whose departure was more than 2 hours ago as
 * 'completed' and saves it. Call this on app mount to keep the upcoming
 * list clean without requiring manual removal.
 */
export function autoCompleteOldFlights(): void {
  if (typeof window === 'undefined' || !activeUser) return;
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  for (const f of snapshot.flights.slice()) {
    if (new Date(f.scheduledDeparture) < cutoff && f.status !== 'completed') {
      saveFlight({ ...f, status: 'completed' });
    }
  }
}

/**
 * Removes every tracked flight from this browser (called on sign-out so the next person starts clean).
 * The flights stay in the account; they come back on the next sign-in.
 */
export function clearAllFlights(): void {
  if (typeof window === 'undefined') return;
  for (const key of allKeys()) {
    if (key === LEGACY_KEY || key.startsWith(CACHE_PREFIX) || key.startsWith(OUTBOX_PREFIX) || key.startsWith(DISMISS_PREFIX)) {
      removeKey(key);
    }
  }
  dropEngineState();
  snapshot = { ...EMPTY };
  emit();
}

/** A different user is signing in on this device: remove every other user's cache, queue and dismissed list. */
export function clearOtherUsersData(userId: string): void {
  for (const key of allKeys()) {
    for (const prefix of [CACHE_PREFIX, OUTBOX_PREFIX, DISMISS_PREFIX]) {
      if (key.startsWith(prefix) && key !== `${prefix}${userId}`) removeKey(key);
    }
  }
}

/** Removes all past (completed) flights. In the account they are soft-deleted. */
export function clearCompletedFlights(): void {
  requireUser();
  const now = new Date();
  const gone = snapshot.flights.filter((f) => new Date(f.scheduledDeparture) < now);
  for (const f of gone) removeFlight(f.id);
}

// ── Old on-device flights (pre-account), for the one-time import ────────────

export function readLegacyFlights(): Flight[] {
  const raw = readJson<unknown>(LEGACY_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.map(stripLegacyFields).filter((f): f is Flight => f !== null);
}

export function clearLegacyFlights(): void {
  removeKey(LEGACY_KEY);
}

/**
 * Queue the one-time import. Flights that fail the format checks are skipped and reported.
 * The old key is removed only after the upload succeeds (see syncEngine).
 */
export function queueLegacyImport(flights: Flight[]): { queued: number; skipped: { id: string; reason: string }[] } {
  requireUser();
  const good: Flight[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const f of flights) {
    const reason = validateFlightForCloud(f);
    if (reason) skipped.push({ id: String(f?.id ?? '?'), reason });
    else good.push(f);
  }
  if (good.length > 0) {
    setData(mergeCloudWithOutbox({ flights: snapshot.flights, trips: snapshot.trips }, [
      { seq: 0, type: 'importFlights', flights: good, at: nowIso() },
    ]).flights, snapshot.trips);
  }
  // Always queue (even when nothing is valid) so the old key is cleared after the call succeeds.
  enqueue({ type: 'importFlights', flights: good, at: nowIso() });
  return { queued: good.length, skipped };
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
