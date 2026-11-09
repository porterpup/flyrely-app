// Cloud storage for flights and trips (Supabase Postgres via PostgREST, protected by row level security).
// Pure mappers and format checks live here too, so they can be tested without a network.
import type { Flight, Trip } from '~/types';
import { getSupabase } from '~/lib/supabaseAuth';

// ── Rows (match migrations/005_user_flights_trips.sql) ──────────────────────

export interface FlightRow {
  user_id?: string;
  id: string;
  airline_code: string;
  flight_number: string;
  origin: string;
  destination: string;
  scheduled_departure_local: string;
  scheduled_arrival_local: string | null;
  trip_id: string | null;
  leg_index: number | null;
  connect_mct_override: number | null;
  data: Record<string, unknown>;
  client_updated_at: string;
  deleted_at?: string | null;
}

export interface TripRow {
  user_id?: string;
  id: string;
  name: string | null;
  client_updated_at: string;
  deleted_at?: string | null;
}

/** Row shape sent to import_flights (no trip columns: imported flights are ungrouped). */
export type ImportRow = Pick<
  FlightRow,
  | 'id'
  | 'airline_code'
  | 'flight_number'
  | 'origin'
  | 'destination'
  | 'scheduled_departure_local'
  | 'scheduled_arrival_local'
  | 'data'
  | 'client_updated_at'
>;

// ── Local-time helpers ──────────────────────────────────────────────────────

/** `YYYY-MM-DDTHH:MM[:SS[.fff]]` (or with a space) -> `YYYY-MM-DDTHH:MM:SS`; null when not a local timestamp. */
export function normalizeLocal(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/.exec(value);
  if (!m) return null;
  return `${m[1]}T${m[2]}:${m[3] ?? '00'}`;
}

// ── App-side format checks (mirror the SQL CHECK constraints) ───────────────

/** Returns a plain-English reason this flight can't be saved to the account, or null when it is fine. */
export function validateFlightForCloud(f: Flight): string | null {
  if (!f || typeof f !== 'object') return 'not a flight';
  if (typeof f.id !== 'string' || f.id.length < 1 || f.id.length > 64) return 'bad flight id';
  const airline = f.airline?.code?.toUpperCase();
  if (!airline || !/^[A-Z0-9]{2,3}$/.test(airline)) return 'bad airline code';
  const num = typeof f.flightNumber === 'string' ? f.flightNumber.toUpperCase() : '';
  if (num.length < 2 || num.length > 10) return 'bad flight number';
  const o = f.origin?.code?.toUpperCase();
  const d = f.destination?.code?.toUpperCase();
  if (!o || !/^[A-Z0-9]{3,4}$/.test(o)) return 'bad origin airport';
  if (!d || !/^[A-Z0-9]{3,4}$/.test(d)) return 'bad destination airport';
  if (o === d) return 'origin and destination are the same';
  if (!normalizeLocal(f.scheduledDeparture)) return 'bad departure time';
  if (f.scheduledArrivalLocal && !normalizeLocal(f.scheduledArrivalLocal)) return 'bad arrival time';
  if (f.connectMctOverride != null && (f.connectMctOverride < 10 || f.connectMctOverride > 240)) {
    return 'bad minimum connect time';
  }
  if (f.legIndex != null && (f.legIndex < 0 || f.legIndex > 3)) return 'bad leg position';
  if (JSON.stringify(f).length > 30000) return 'flight data too large';
  return null;
}

// ── Mappers ─────────────────────────────────────────────────────────────────

/** Drops the legacy keys older builds stored. Kept here (not flightStore) to avoid an import cycle. */
const LEGACY_FIELDS = ['scheduledArrival', 'delayMinutes', 'predictedDeparture', 'predictedArrival', 'airlineStatus'];

export function stripLegacy(raw: unknown): Flight | null {
  if (!raw || typeof raw !== 'object') return null;
  const copy = { ...(raw as Record<string, unknown>) };
  for (const key of LEGACY_FIELDS) delete copy[key];
  return copy as unknown as Flight;
}

export function flightToRow(flight: Flight, clientUpdatedAt: string): FlightRow {
  const clean = stripLegacy(flight) as Flight;
  const arrival = normalizeLocal(clean.scheduledArrivalLocal);
  return {
    id: clean.id,
    airline_code: clean.airline.code.toUpperCase(),
    flight_number: clean.flightNumber.toUpperCase(),
    origin: clean.origin.code.toUpperCase(),
    destination: clean.destination.code.toUpperCase(),
    scheduled_departure_local: normalizeLocal(clean.scheduledDeparture) as string,
    scheduled_arrival_local: arrival,
    trip_id: clean.tripId ?? null,
    leg_index: clean.legIndex ?? null,
    connect_mct_override: clean.connectMctOverride ?? null,
    data: clean as unknown as Record<string, unknown>,
    client_updated_at: clientUpdatedAt,
  };
}

export function rowToFlight(row: FlightRow): Flight {
  const data = (stripLegacy(row.data ?? {}) ?? {}) as unknown as Partial<Flight>;
  const flight = { ...data } as Flight;
  flight.id = row.id;
  flight.flightNumber = row.flight_number;
  flight.airline = { name: row.airline_code, ...(data.airline ?? {}), code: row.airline_code } as Flight['airline'];
  flight.origin = { name: row.origin, city: row.origin, ...(data.origin ?? {}), code: row.origin } as Flight['origin'];
  flight.destination = {
    name: row.destination,
    city: row.destination,
    ...(data.destination ?? {}),
    code: row.destination,
  } as Flight['destination'];
  flight.scheduledDeparture = normalizeLocal(row.scheduled_departure_local) ?? row.scheduled_departure_local;
  const arrival = normalizeLocal(row.scheduled_arrival_local);
  if (arrival) flight.scheduledArrivalLocal = arrival;
  else delete flight.scheduledArrivalLocal;
  if (row.trip_id) flight.tripId = row.trip_id;
  else delete flight.tripId;
  if (row.leg_index != null) flight.legIndex = row.leg_index;
  else delete flight.legIndex;
  if (row.connect_mct_override != null) flight.connectMctOverride = row.connect_mct_override;
  else delete flight.connectMctOverride;
  return flight;
}

export function tripToRow(trip: Trip): TripRow {
  return { id: trip.id, name: trip.name ?? null, client_updated_at: trip.clientUpdatedAt };
}

export function rowToTrip(row: TripRow): Trip {
  return { id: row.id, ...(row.name ? { name: row.name } : {}), clientUpdatedAt: row.client_updated_at };
}

export function flightToImportRow(flight: Flight, clientUpdatedAt: string): ImportRow {
  const r = flightToRow(flight, clientUpdatedAt);
  return {
    id: r.id,
    airline_code: r.airline_code,
    flight_number: r.flight_number,
    origin: r.origin,
    destination: r.destination,
    scheduled_departure_local: r.scheduled_departure_local,
    scheduled_arrival_local: r.scheduled_arrival_local,
    data: r.data,
    client_updated_at: r.client_updated_at,
  };
}

// ── Errors ──────────────────────────────────────────────────────────────────

/**
 * retry    = network error, 5xx or auth hiccup: keep the change and try again later
 * unique   = Postgres 23505, "you already track this flight": drop the change, cloud wins
 * rejected = any other 4xx (CHECK / format error): drop the change so the queue can't get stuck
 */
export class CloudError extends Error {
  constructor(
    public kind: 'retry' | 'unique' | 'rejected',
    public code?: string
  ) {
    super(`cloud ${kind}${code ? ` ${code}` : ''}`);
    this.name = 'CloudError';
  }
}

interface SbError {
  code?: string;
  message?: string;
}

export function classifyError(error: SbError | null | undefined, status?: number): CloudError {
  const code = error?.code;
  if (code === '23505') return new CloudError('unique', code);
  if (status === undefined || status === 0 || status >= 500 || status === 401 || status === 408 || status === 429) {
    return new CloudError('retry', code);
  }
  if (code && code.startsWith('PGRST3')) return new CloudError('retry', code); // JWT problems
  if (!code && status >= 400 && /fetch|network|timeout/i.test(error?.message ?? '')) return new CloudError('retry');
  return new CloudError('rejected', code);
}

// ── API (injectable so the sync engine can be tested with a mock) ───────────

export interface CloudApi {
  fetchAll(): Promise<{ flights: FlightRow[]; trips: TripRow[] }>;
  upsertFlight(userId: string, row: FlightRow): Promise<void>;
  softDeleteFlight(userId: string, id: string, clientUpdatedAt: string): Promise<void>;
  upsertTrip(userId: string, row: TripRow): Promise<void>;
  setTripLegs(tripId: string, flightIds: string[], clientUpdatedAt: string): Promise<void>;
  importFlights(rows: ImportRow[]): Promise<number>;
}

const FLIGHT_COLUMNS =
  'id,airline_code,flight_number,origin,destination,scheduled_departure_local,scheduled_arrival_local,trip_id,leg_index,connect_mct_override,data,client_updated_at';
const TRIP_COLUMNS = 'id,name,client_updated_at';

function check(res: { error: SbError | null; status?: number }): void {
  if (res.error) throw classifyError(res.error, res.status);
}

/** Wraps a Supabase call so thrown network errors become CloudError('retry'). */
async function guard<T>(fn: () => PromiseLike<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CloudError) throw e;
    throw new CloudError('retry');
  }
}

export const supabaseCloudApi: CloudApi = {
  async fetchAll() {
    return guard(async () => {
      const sb = getSupabase();
      const [f, t] = await Promise.all([
        sb.from('user_flights').select(FLIGHT_COLUMNS).is('deleted_at', null).limit(1000),
        sb.from('user_trips').select(TRIP_COLUMNS).is('deleted_at', null).limit(1000),
      ]);
      check(f);
      check(t);
      return { flights: (f.data ?? []) as FlightRow[], trips: (t.data ?? []) as TripRow[] };
    });
  },

  async upsertFlight(userId, row) {
    // Trip columns are owned by set_trip_legs; leaving them out keeps an edit from undoing a regroup.
    const { trip_id: _t, leg_index: _l, connect_mct_override: _c, ...rest } = row;
    void _t;
    void _l;
    void _c;
    await guard(async () => {
      const res = await getSupabase()
        .from('user_flights')
        .upsert({ ...rest, user_id: userId, deleted_at: null }, { onConflict: 'user_id,id' });
      check(res);
    });
  },

  async softDeleteFlight(userId, id, clientUpdatedAt) {
    await guard(async () => {
      const res = await getSupabase()
        .from('user_flights')
        .update({ deleted_at: new Date().toISOString(), client_updated_at: clientUpdatedAt })
        .eq('user_id', userId)
        .eq('id', id);
      check(res);
    });
  },

  async upsertTrip(userId, row) {
    await guard(async () => {
      const res = await getSupabase()
        .from('user_trips')
        .upsert({ ...row, user_id: userId }, { onConflict: 'user_id,id' });
      check(res);
    });
  },

  async setTripLegs(tripId, flightIds, clientUpdatedAt) {
    await guard(async () => {
      const res = await getSupabase().rpc('set_trip_legs', {
        p_trip_id: tripId,
        p_flight_ids: flightIds,
        p_client_updated_at: clientUpdatedAt,
      });
      check(res);
    });
  },

  async importFlights(rows) {
    return guard(async () => {
      const res = await getSupabase().rpc('import_flights', { p_rows: rows });
      check(res);
      return typeof res.data === 'number' ? res.data : 0;
    });
  },
};
