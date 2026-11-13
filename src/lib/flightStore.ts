import type { Flight, SelfReportAnswer, Trip } from '~/types';
import { dismissKeysFor, legsOf, tripErrorMessage, validateTripLegs, MAX_LEGS } from '~/lib/tripGrouping';
import { newUuid } from '~/lib/utils';
import { departureMs, isDeparted } from '~/lib/flightTime';
import { stripLegacy, validateFlightForCloud } from '~/lib/cloudFlights';
import {
  CACHE_PREFIX,
  DISMISS_PREFIX,
  LEGACY_KEY,
  OUTBOX_PREFIX,
  allKeys,
  cacheKey,
  dismissKey,
  readJson,
  removeKey,
  writeJson,
} from '~/lib/storageKeys';
import { applySetTripLegs, configureEngine, dropEngineState, enqueue, mergeCloudWithOutbox, setEngineUser } from '~/lib/syncEngine';

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
  /** Trip suggestions the user dismissed ("Not a trip"), as pair keys. Device-local. */
  dismissed: string[];
}

const EMPTY: StoreSnapshot = { flights: [], trips: [], ready: false, downloaded: false, dismissed: [] };

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
  const dismissed = readJson<string[]>(dismissKey(userId));
  snapshot = { flights, trips, ready: false, downloaded: false, dismissed: Array.isArray(dismissed) ? dismissed : [] };
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
  const now = Date.now();
  return flights.filter((f) => !isDeparted(f, now)).sort((a, b) => departureMs(a) - departureMs(b));
}

/** Completed = departure in the past, newest first. */
export function selectCompleted(flights: Flight[]): Flight[] {
  const now = Date.now();
  return flights.filter((f) => isDeparted(f, now)).sort((a, b) => departureMs(b) - departureMs(a));
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
  // Trip membership changes only through the trip operations below; an edit built from an older copy must not undo it.
  const prev = i >= 0 ? snapshot.flights[i] : undefined;
  delete clean.tripId;
  delete clean.legIndex;
  delete clean.connectMctOverride;
  if (prev?.tripId !== undefined) clean.tripId = prev.tripId;
  if (prev?.legIndex !== undefined) clean.legIndex = prev.legIndex;
  if (prev?.connectMctOverride !== undefined) clean.connectMctOverride = prev.connectMctOverride;
  const flights = snapshot.flights.slice();
  if (i >= 0) flights[i] = clean;
  else flights.push(clean);
  setData(flights, snapshot.trips);
  enqueue({ type: 'upsertFlight', flight: clean, at: nowIso() });
}

export function removeFlight(id: string): TripChange | null {
  requireUser();
  const gone = snapshot.flights.find((f) => f.id === id);
  setData(
    snapshot.flights.filter((f) => f.id !== id),
    snapshot.trips
  );
  enqueue({ type: 'deleteFlight', id, at: nowIso() });
  // Deleting a leg re-links the trip, or dissolves it.
  return gone?.tripId ? relinkTrip(gone.tripId) : null;
}

/** Record (or, with null, withdraw) the traveller's "Were you delayed?" answer. Queued to send; see flightReport.ts. */
export function setSelfReport(id: string, answer: SelfReportAnswer | null): void {
  requireUser();
  const current = getFlightById(id);
  if (!current) return;
  if (answer === null && !current.selfReport) return; // nothing to withdraw
  let answeredAt = nowIso();
  // answeredAt is the identity of an answer: two answers in the same millisecond must still differ.
  if (current.selfReport && answeredAt <= current.selfReport.answeredAt) {
    answeredAt = new Date(Date.parse(current.selfReport.answeredAt) + 1).toISOString();
  }
  saveFlight({ ...current, selfReport: { answer, answeredAt, sent: false } });
}

/** Drop the report locally with no network call (the server has nothing to delete). */
export function clearSelfReport(id: string): void {
  requireUser();
  const current = getFlightById(id);
  if (!current?.selfReport) return;
  const { selfReport: _removed, ...rest } = current;
  void _removed;
  saveFlight(rest);
}

/**
 * The flight changed, so the answer no longer applies. An accepted answer queues a withdrawal; an answer the server
 * never got (unsent or rejected) is just removed. A withdrawal already queued is left alone.
 */
export function withdrawSelfReport(id: string): void {
  const sr = getFlightById(id)?.selfReport;
  if (!sr || sr.answer === null) return;
  if (sr.sent && !sr.rejected) setSelfReport(id, null);
  else clearSelfReport(id);
}

/**
 * The API accepted the answer made at `answeredAt`. Does nothing when that answer was replaced meanwhile, even by an
 * identical value (A, Undo, A: the first A's 200 must not mark the second A as sent). A sent withdrawal removes the
 * report entirely. Quietly does nothing when signed out.
 */
export function markReportSent(id: string, answeredAt: string): void {
  if (!activeUser) return;
  const current = getFlightById(id);
  if (!current?.selfReport || current.selfReport.answeredAt !== answeredAt) return;
  if (current.selfReport.answer === null) clearSelfReport(id);
  else if (!current.selfReport.sent) saveFlight({ ...current, selfReport: { ...current.selfReport, sent: true } });
}

/** The API will never accept the answer made at `answeredAt`: stop retrying it. Same matching rules as markReportSent. */
export function markReportRejected(id: string, answeredAt: string): void {
  if (!activeUser) return;
  const current = getFlightById(id);
  if (!current?.selfReport || current.selfReport.answeredAt !== answeredAt) return;
  if (current.selfReport.answer === null) clearSelfReport(id);
  else saveFlight({ ...current, selfReport: { ...current.selfReport, sent: true, rejected: true } });
}

/**
 * Auto-marks any flight whose departure was more than 2 hours ago as
 * 'completed' and saves it. Call this on app mount to keep the upcoming
 * list clean without requiring manual removal.
 */
export function autoCompleteOldFlights(): void {
  if (typeof window === 'undefined' || !activeUser) return;
  const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
  for (const f of snapshot.flights.slice()) {
    if (isDeparted(f, cutoff) && f.status !== 'completed') {
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
  const now = Date.now();
  const gone = snapshot.flights.filter((f) => isDeparted(f, now));
  for (const f of gone) removeFlight(f.id);
}

// ── Trips ───────────────────────────────────────────────────────────────────

export type TripResult =
  | { ok: true; tripId: string }
  | { ok: false; reason: string };

/** What happened to a trip when a leg went away. */
export type TripChange = 'updated' | 'dissolved' | 'ungrouped_not_connected';

/** Local change + queued upload for a trip's leg list (fewer than 2 legs dissolves the trip). */
function applyLegs(tripId: string, flightIds: string[]): void {
  const at = nowIso();
  const next = applySetTripLegs(snapshot.flights, snapshot.trips, tripId, flightIds);
  setData(next.flights, next.trips);
  enqueue({ type: 'setTripLegs', tripId, flightIds, at });
}

function legIdsOf(tripId: string): string[] {
  return legsOf({ id: tripId }, snapshot.flights).map((f) => f.id);
}

/** After a leg is deleted or removed, re-link the remaining legs, or dissolve the trip. */
function relinkTrip(tripId: string): TripChange {
  const legs = legsOf({ id: tripId }, snapshot.flights);
  if (legs.length < 2) {
    applyLegs(tripId, []);
    return 'dissolved';
  }
  if (!validateTripLegs(legs).ok) {
    applyLegs(tripId, []);
    return 'ungrouped_not_connected';
  }
  applyLegs(tripId, legs.map((f) => f.id)); // close any gap in the leg numbers
  return 'updated';
}

/**
 * After a leg was edited (route or times): if the legs no longer connect, ungroup the trip.
 * Returns null when the trip is still valid (nothing is queued then).
 */
export function revalidateTrip(tripId: string): TripChange | null {
  requireUser();
  const legs = legsOf({ id: tripId }, snapshot.flights);
  if (legs.length >= 2 && validateTripLegs(legs).ok) return null;
  return relinkTrip(tripId);
}

/** Make a new trip from flights in travel order. Refuses flights that already belong to a trip. */
export function createTrip(flightIds: string[]): TripResult {
  requireUser();
  const legs = flightIds.map((id) => getFlightById(id));
  if (legs.some((f) => !f)) return { ok: false, reason: 'Flight not found.' };
  const flights = legs as Flight[];
  if (flights.some((f) => f.tripId)) return { ok: false, reason: 'A flight is already part of a trip.' };
  const v = validateTripLegs(flights);
  if (!v.ok) return { ok: false, reason: tripErrorMessage(v.reason, flights, v.index) };
  const trip: Trip = { id: newUuid(), clientUpdatedAt: nowIso() };
  setData(snapshot.flights, [...snapshot.trips, trip]);
  enqueue({ type: 'upsertTrip', trip });
  applyLegs(trip.id, flightIds);
  return { ok: true, tripId: trip.id };
}

/** Add a flight as the next leg of an existing trip. */
export function appendLeg(tripId: string, flightId: string): TripResult {
  requireUser();
  const flight = getFlightById(flightId);
  if (!flight || !getTripById(tripId)) return { ok: false, reason: 'Trip or flight not found.' };
  if (flight.tripId) return { ok: false, reason: 'That flight is already part of a trip.' };
  const legs = [...legsOf({ id: tripId }, snapshot.flights), flight];
  if (legs.length > MAX_LEGS) return { ok: false, reason: tripErrorMessage('too_many') };
  const v = validateTripLegs(legs);
  if (!v.ok) return { ok: false, reason: tripErrorMessage(v.reason, legs, v.index) };
  applyLegs(tripId, legs.map((f) => f.id));
  return { ok: true, tripId };
}

/** Take one flight out of its trip (the flight stays tracked). */
export function removeLeg(tripId: string, flightId: string): TripChange {
  requireUser();
  const rest = legIdsOf(tripId).filter((id) => id !== flightId);
  const remaining = rest.map((id) => getFlightById(id)).filter((f): f is Flight => Boolean(f));
  if (remaining.length < 2) {
    applyLegs(tripId, []);
    return 'dissolved';
  }
  if (!validateTripLegs(remaining).ok) {
    applyLegs(tripId, []);
    return 'ungrouped_not_connected';
  }
  applyLegs(tripId, rest);
  return 'updated';
}

/** Dissolve a trip; its flights stay tracked on their own. */
export function ungroupTrip(tripId: string): void {
  requireUser();
  applyLegs(tripId, []);
}

/** Rename a trip (1-80 characters; empty clears the name and uses the automatic title). */
export function renameTrip(tripId: string, name: string): boolean {
  requireUser();
  const trimmed = name.trim();
  if (trimmed.length > 80) return false;
  const trip = getTripById(tripId);
  if (!trip) return false;
  const next: Trip = { id: trip.id, clientUpdatedAt: nowIso(), ...(trimmed ? { name: trimmed } : {}) };
  setData(snapshot.flights, snapshot.trips.map((t) => (t.id === tripId ? next : t)));
  enqueue({ type: 'upsertTrip', trip: next });
  return true;
}

/** "Not a trip": remember these pairs so they are not suggested again. Stored on this device only. */
export function dismissSuggestion(legs: Flight[]): void {
  if (!activeUser) return;
  const dismissed = [...new Set([...snapshot.dismissed, ...dismissKeysFor(legs)])];
  snapshot = { ...snapshot, dismissed };
  writeJson(dismissKey(activeUser), dismissed);
  emit();
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
  const depMs = departureMs(flight);
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
