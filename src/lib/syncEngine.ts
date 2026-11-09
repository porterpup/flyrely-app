// Sync engine: moves changes between the per-user local cache and Supabase.
//
// Writes are optimistic: flightStore updates the cache first, then queues a Change here (the "outbox").
// The outbox is stored per user, uploaded first-in first-out, and merged per record.
// Downloads fetch everything (the data is tiny) and re-apply any still-queued changes on top.
import type { Flight, Trip } from '~/types';
import {
  CloudError,
  flightToImportRow,
  flightToRow,
  rowToFlight,
  rowToTrip,
  supabaseCloudApi,
  tripToRow,
  validateFlightForCloud,
  normalizeLocal,
} from '~/lib/cloudFlights';
import type { CloudApi } from '~/lib/cloudFlights';
import { LEGACY_KEY, outboxKey, readJson, removeKey, writeJson } from '~/lib/storageKeys';

// ── Changes ─────────────────────────────────────────────────────────────────

export type Change =
  | { seq: number; type: 'upsertFlight'; flight: Flight; at: string }
  | { seq: number; type: 'deleteFlight'; id: string; at: string }
  | { seq: number; type: 'upsertTrip'; trip: Trip }
  | { seq: number; type: 'setTripLegs'; tripId: string; flightIds: string[]; at: string }
  | { seq: number; type: 'importFlights'; flights: Flight[]; at: string };

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type NewChange = DistributiveOmit<Change, 'seq'>;

/** Adds a change, replacing earlier queued changes for the same record. Pure. */
export function addToOutbox(outbox: Change[], change: Change): Change[] {
  const rest = outbox.filter((c) => {
    switch (change.type) {
      case 'upsertFlight':
        return !(c.type === 'upsertFlight' && c.flight.id === change.flight.id);
      case 'deleteFlight':
        return !(
          (c.type === 'upsertFlight' && c.flight.id === change.id) ||
          (c.type === 'deleteFlight' && c.id === change.id)
        );
      case 'upsertTrip':
        return !(c.type === 'upsertTrip' && c.trip.id === change.trip.id);
      case 'setTripLegs':
        return !(c.type === 'setTripLegs' && c.tripId === change.tripId);
      default:
        return true;
    }
  });
  return [...rest, change];
}

/** Same flight added on two devices: flight number + origin + departure. */
export function naturalKey(f: Pick<Flight, 'flightNumber' | 'origin' | 'scheduledDeparture'>): string {
  return `${f.flightNumber.toUpperCase()}|${f.origin.code.toUpperCase()}|${normalizeLocal(f.scheduledDeparture) ?? f.scheduledDeparture}`;
}

/** Applies a trip's leg list to flights/trips. Fewer than 2 legs dissolves the trip. Pure. */
export function applySetTripLegs(
  flights: Flight[],
  trips: Trip[],
  tripId: string,
  flightIds: string[]
): { flights: Flight[]; trips: Trip[] } {
  const ids = new Set(flightIds);
  const next = flights.map((f) => {
    if (f.tripId !== tripId && !ids.has(f.id)) return f;
    const copy = { ...f };
    delete copy.tripId;
    delete copy.legIndex;
    delete copy.connectMctOverride;
    return copy;
  });
  if (flightIds.length < 2) return { flights: next, trips: trips.filter((t) => t.id !== tripId) };
  flightIds.forEach((id, i) => {
    const idx = next.findIndex((f) => f.id === id);
    if (idx >= 0) next[idx] = { ...next[idx], tripId, legIndex: i };
  });
  return { flights: next, trips };
}

/** The cloud rows become the cache, then every still-queued change is applied on top. Pure. */
export function mergeCloudWithOutbox(
  cloud: { flights: Flight[]; trips: Trip[] },
  outbox: Change[]
): { flights: Flight[]; trips: Trip[] } {
  let flights = cloud.flights.slice();
  let trips = cloud.trips.slice();
  for (const c of outbox) {
    if (c.type === 'upsertFlight') {
      const i = flights.findIndex((f) => f.id === c.flight.id);
      if (i >= 0) flights[i] = c.flight;
      else flights.push(c.flight);
    } else if (c.type === 'deleteFlight') {
      flights = flights.filter((f) => f.id !== c.id);
    } else if (c.type === 'upsertTrip') {
      const i = trips.findIndex((t) => t.id === c.trip.id);
      if (i >= 0) trips[i] = c.trip;
      else trips.push(c.trip);
    } else if (c.type === 'setTripLegs') {
      ({ flights, trips } = applySetTripLegs(flights, trips, c.tripId, c.flightIds));
    } else if (c.type === 'importFlights') {
      const ids = new Set(flights.map((f) => f.id));
      const keys = new Set(flights.map(naturalKey));
      for (const f of c.flights) {
        if (ids.has(f.id) || keys.has(naturalKey(f))) continue;
        flights.push(f);
        ids.add(f.id);
        keys.add(naturalKey(f));
      }
    }
  }
  return { flights, trips };
}

// ── Status ──────────────────────────────────────────────────────────────────

export interface SyncStatus {
  /** Changes waiting to upload. */
  pending: number;
  state: 'synced' | 'pending' | 'offline';
}

export interface EngineHost {
  /** Replace the local cache with merged cloud data. */
  applyCloud(data: { flights: Flight[]; trips: Trip[] }): void;
  /** First download finished: `downloaded` is true only when it succeeded. */
  markReady(downloaded: boolean): void;
  /** Something observable changed (status or outbox). */
  notify(): void;
}

// ── Engine state ────────────────────────────────────────────────────────────

const DOWNLOAD_THROTTLE_MS = 15_000;
const FLUSH_DELAY_MS = 300;
const RETRY_DELAY_MS = 30_000;

let api: CloudApi = supabaseCloudApi;
let host: EngineHost | null = null;
let autoFlush = true;

let userId: string | null = null;
let outbox: Change[] = [];
let seqCounter = 1;
let flushing: Promise<void> | null = null;
let downloading: Promise<boolean> | null = null;
let lastDownloadAt = 0;
/** Bumped whenever an upload succeeds or a change is dropped, so a download that raced it can be retried. */
let uploadSeq = 0;
let failing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let statusSnap: SyncStatus = { pending: 0, state: 'synced' };
let listenersStarted = false;
const noticeListeners = new Set<(message: string) => void>();

export function configureEngine(opts: { api?: CloudApi; host?: EngineHost | null; autoFlush?: boolean }): void {
  if (opts.api) api = opts.api;
  if (opts.host !== undefined) host = opts.host;
  if (opts.autoFlush !== undefined) autoFlush = opts.autoFlush;
}

/** Test helper: back to a clean slate. */
export function resetEngineForTests(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  userId = null;
  outbox = [];
  seqCounter = 1;
  flushing = null;
  downloading = null;
  lastDownloadAt = 0;
  uploadSeq = 0;
  failing = false;
  statusSnap = { pending: 0, state: 'synced' };
  noticeListeners.clear();
  api = supabaseCloudApi;
  host = null;
  autoFlush = true;
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function refreshStatus(): void {
  const state: SyncStatus['state'] = !isOnline() || failing ? 'offline' : outbox.length > 0 ? 'pending' : 'synced';
  if (state !== statusSnap.state || outbox.length !== statusSnap.pending) {
    statusSnap = { pending: outbox.length, state };
  }
  host?.notify();
}

export function getSyncStatus(): SyncStatus {
  return statusSnap;
}

export function pendingCount(): number {
  return outbox.length;
}

export function onNotice(cb: (message: string) => void): () => void {
  noticeListeners.add(cb);
  return () => noticeListeners.delete(cb);
}

function notice(message: string): void {
  for (const cb of noticeListeners) cb(message);
}

function persistOutbox(): void {
  if (userId) writeJson(outboxKey(userId), outbox);
}

/** Switch the active user (null on sign-out). Loads that user's persisted outbox. */
export function setEngineUser(id: string | null): void {
  if (id === userId) return;
  userId = id;
  flushing = null;
  downloading = null;
  lastDownloadAt = 0;
  failing = false;
  const stored = id ? readJson<Change[]>(outboxKey(id)) : null;
  outbox = Array.isArray(stored) ? stored.filter((c) => c && typeof c === 'object' && 'type' in c) : [];
  seqCounter = outbox.reduce((m, c) => Math.max(m, c.seq ?? 0), 0) + 1;
  refreshStatus();
  if (id && outbox.length > 0) scheduleFlush();
}

/** Forget queued changes in memory (the caller removes the stored keys). Used by sign-out. */
export function dropEngineState(): void {
  outbox = [];
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  failing = false;
  refreshStatus();
}

export function enqueue(change: NewChange): void {
  if (!userId) throw new Error('not signed in');
  outbox = addToOutbox(outbox, { ...change, seq: seqCounter++ } as Change);
  persistOutbox();
  refreshStatus();
  scheduleFlush();
}

function scheduleFlush(delay = FLUSH_DELAY_MS): void {
  if (!autoFlush || typeof window === 'undefined') return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushOutbox();
  }, delay);
  (flushTimer as { unref?: () => void }).unref?.();
}

// ── Upload ──────────────────────────────────────────────────────────────────

async function apply(uid: string, c: Change): Promise<void> {
  switch (c.type) {
    case 'upsertFlight': {
      if (validateFlightForCloud(c.flight)) throw new CloudError('rejected', 'client_validation');
      return api.upsertFlight(uid, flightToRow(c.flight, c.at));
    }
    case 'deleteFlight':
      return api.softDeleteFlight(uid, c.id, c.at);
    case 'upsertTrip':
      return api.upsertTrip(uid, tripToRow(c.trip));
    case 'setTripLegs':
      return api.setTripLegs(c.tripId, c.flightIds, c.at);
    case 'importFlights': {
      const rows = c.flights.filter((f) => !validateFlightForCloud(f)).map((f) => flightToImportRow(f, c.at));
      for (let i = 0; i < rows.length; i += 500) await api.importFlights(rows.slice(i, i + 500));
      // Only now is it safe to forget the old on-device copy.
      removeKey(LEGACY_KEY);
      return;
    }
  }
}

async function runFlush(): Promise<void> {
  const uid = userId;
  if (!uid) return;
  if (!isOnline()) {
    refreshStatus();
    return;
  }
  let finished = 0;
  let sawFailure = false;
  while (userId === uid) {
    const change = outbox[0];
    if (!change) break;
    try {
      await apply(uid, change);
      failing = false;
    } catch (e) {
      const kind = e instanceof CloudError ? e.kind : 'retry';
      if (kind === 'retry') {
        failing = true;
        sawFailure = true;
        break;
      }
      // Permanent failure: drop the change so the queue can never get stuck. Log the type only (no flight data).
      console.warn('sync: dropped a change', change.type, kind, e instanceof CloudError ? e.code ?? '' : '');
      notice(kind === 'unique' ? 'You already track this flight.' : "Couldn't save one change.");
    }
    if (userId !== uid) return;
    outbox = outbox.filter((c) => c.seq !== change.seq);
    persistOutbox();
    uploadSeq++;
    finished++;
    refreshStatus();
  }
  refreshStatus();
  if (sawFailure) {
    scheduleFlush(RETRY_DELAY_MS);
  } else if (finished > 0 && userId === uid) {
    await download(true);
  }
}

/** Upload queued changes. Resolves when done, or after `timeoutMs` (the upload keeps going in the background). */
export function flushOutbox(timeoutMs?: number): Promise<void> {
  if (!flushing) {
    const run = runFlush().finally(() => {
      if (flushing === run) flushing = null;
    });
    flushing = run;
  }
  const current = flushing;
  if (timeoutMs === undefined) return current;
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    (timer as { unref?: () => void }).unref?.();
    current.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      }
    );
  });
}

// ── Download ────────────────────────────────────────────────────────────────

/** Fetch everything and merge. Throttled to once per 15 s unless `force`. Resolves true when the cache was updated. */
export function download(force = false): Promise<boolean> {
  const uid = userId;
  if (!uid) return Promise.resolve(false);
  if (downloading) return downloading;
  if (!force && Date.now() - lastDownloadAt < DOWNLOAD_THROTTLE_MS) return Promise.resolve(false);
  const run: Promise<boolean> = (async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const before = uploadSeq;
        const cloud = await api.fetchAll();
        if (userId !== uid) return false;
        if (uploadSeq !== before) continue; // an upload finished mid-fetch: this snapshot may be stale
        const merged = mergeCloudWithOutbox(
          { flights: cloud.flights.map(rowToFlight), trips: cloud.trips.map(rowToTrip) },
          outbox
        );
        host?.applyCloud(merged);
        lastDownloadAt = Date.now();
        failing = false;
        host?.markReady(true);
        refreshStatus();
        return true;
      }
      return false;
    } catch {
      failing = true;
      host?.markReady(false);
      refreshStatus();
      return false;
    } finally {
      downloading = null;
    }
  })();
  downloading = run;
  return run;
}

/** Upload anything queued, then download (throttled unless `force`). */
export async function syncNow(force = false): Promise<void> {
  if (!userId) return;
  if (outbox.length > 0) await flushOutbox();
  await download(force);
}

/** Re-sync on reconnect and when the app comes back to the foreground. Safe to call more than once. */
export function startSyncListeners(): void {
  if (listenersStarted || typeof window === 'undefined' || typeof document === 'undefined') return;
  listenersStarted = true;
  window.addEventListener('online', () => {
    failing = false;
    refreshStatus();
    void syncNow(true);
  });
  window.addEventListener('offline', () => refreshStatus());
  window.addEventListener('focus', () => void syncNow(false));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow(false);
  });
}
