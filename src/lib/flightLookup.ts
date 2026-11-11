import { API_BASE_URL } from '~/lib/api';
import { fetchWithTimeout, isTimeoutError, TIMEOUT_MESSAGE } from '~/lib/fetchWithTimeout';

/** One leg of a flight number, from GET /flights/lookup (flyrely-api flight_lookup.py). Times are local "HH:MM". */
export interface LookupLeg {
  origin: string;
  dest: string;
  dep_time: string;
  arr_time: string;
  arr_next_day: boolean;
  operating_airline: string;
  operating_airline_name: string;
  operating_flight_number: string;
  days_seen: number;
}

export interface LookupResponse {
  flight: string;
  airline: string;
  flight_number: string;
  date: string;
  matches: LookupLeg[];
  source: string;
  confidence: string;
  schedule_as_of: string | null;
  note: string;
}

/** The lookup did not produce legs: no match (404), defunct airline (410), bad input (422), or a network/server fault. */
export class LookupError extends Error {
  constructor(public status: number, public reason: string, message: string) {
    super(message);
    this.name = 'LookupError';
  }
}

const FALLBACK = "We couldn't look that flight up right now.";
export const NOT_FOUND_COPY =
  "We couldn't find this flight. FlyRely currently covers US domestic flights only. If it's a domestic flight, you can enter the details manually.";

export async function lookupFlight(
  airline: string,
  number: string,
  date: string,
  fetchImpl: typeof fetch = fetch,
  base: string = API_BASE_URL
): Promise<LookupResponse> {
  const qs = new URLSearchParams({ flight: `${airline}${number}`, date });
  let res: Response;
  try {
    res = await fetchWithTimeout(`${base}/flights/lookup?${qs}`, undefined, undefined, fetchImpl);
  } catch (err) {
    if (isTimeoutError(err)) throw new LookupError(0, 'timeout', TIMEOUT_MESSAGE);
    throw new LookupError(0, 'network', FALLBACK);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const d = body?.detail;
    throw new LookupError(res.status, d?.reason ?? 'error', typeof d?.message === 'string' ? d.message : FALLBACK);
  }
  const body = (await res.json()) as LookupResponse;
  if (!Array.isArray(body?.matches) || body.matches.length === 0) {
    throw new LookupError(404, 'not_found', NOT_FOUND_COPY);
  }
  return body;
}

/** "06:00" -> "6:00 AM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "UA648 · EWR → SFO · 6:00 AM → 9:31 AM" */
export function legLabel(flight: string, leg: LookupLeg): string {
  return `${flight} · ${leg.origin} → ${leg.dest} · ${formatClock(leg.dep_time)} → ${formatClock(leg.arr_time)}`;
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Circular distance on a 24h clock, in minutes. */
export function clockDiffMinutes(a: string, b: string): number {
  const d = Math.abs(minutesOfDay(a) - minutesOfDay(b));
  return Math.min(d, 1440 - d);
}

export const TIME_WARN_MINUTES = 60;

/**
 * Warning text when a hand-entered departure differs from the schedule by more than 60 minutes, else null.
 * Legs are narrowed to the entered route when both airports are given and one of the legs flies it.
 */
export function scheduleWarning(
  lookup: Pick<LookupResponse, 'flight' | 'matches' | 'schedule_as_of'>,
  origin: string,
  dest: string,
  time: string
): string | null {
  if (!time || !lookup.matches.length) return null;
  const o = origin.toUpperCase();
  const d = dest.toUpperCase();
  let legs = lookup.matches;
  if (o.length === 3 && d.length === 3) {
    const onRoute = legs.filter((l) => l.origin === o && l.dest === d);
    if (onRoute.length === 0) {
      const flies = legs.map((l) => `${l.origin} → ${l.dest}`).join(', ');
      return `${lookup.flight} usually flies ${flies}, not ${o} → ${d}. Double-check the airports.`;
    }
    legs = onRoute;
  }
  const times = legs.map((l) => l.dep_time);
  const nearest = times.reduce((best, t) => (clockDiffMinutes(t, time) < clockDiffMinutes(best, time) ? t : best));
  if (clockDiffMinutes(nearest, time) <= TIME_WARN_MINUTES) return null;
  const asOf = lookup.schedule_as_of ? ` (typical schedule as of ${lookup.schedule_as_of})` : '';
  return `${lookup.flight} usually departs at ${times.map(formatClock).join(' or ')}${asOf}, not ${formatClock(time)}. Check your booking.`;
}

/** Local departure ISO for a leg on a date, as /predict expects (no offset). */
export function legDepartureISO(date: string, leg: LookupLeg): string {
  return `${date}T${leg.dep_time}:00`;
}

/** Local arrival ISO (no offset) for a leg departing on `date`, adding a day when the leg lands the next day. */
export function legArrivalISO(date: string, leg: Pick<LookupLeg, 'arr_time' | 'arr_next_day'>): string {
  let day = date;
  if (leg.arr_next_day) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    day = d.toISOString().slice(0, 10);
  }
  return `${day}T${leg.arr_time}:00`;
}

/** One scheduled flight on a route, with its delay prediction, from GET /flights/search. */
export interface SearchFlight extends LookupLeg {
  flight: string;          // "UA648"
  airline: string;         // marketing code
  airline_name: string;
  flight_number: string;   // "648"
  delay_probability: number;
  risk_level: 'low' | 'medium' | 'high';
  /** Plain-language reasons, most important first. Absent on older API versions. */
  risk_factors?: string[];
}

export interface SearchResponse {
  origin: string;
  dest: string;
  date: string;
  flights: SearchFlight[];
  source: string;
  schedule_as_of: string | null;
  note: string;
}

export const SCHEDULE_LABEL = 'Based on recent schedules';
export const SCHEDULE_TOOLTIP = 'Airlines change times from season to season. Confirm the time on your booking.';

export async function searchFlights(
  origin: string,
  dest: string,
  date: string,
  window: { after?: string; before?: string } = {},
  fetchImpl: typeof fetch = fetch,
  base: string = API_BASE_URL
): Promise<SearchResponse> {
  const qs = new URLSearchParams({ origin, dest, date });
  if (window.after) qs.set('after', window.after);
  if (window.before) qs.set('before', window.before);
  let res: Response;
  try {
    res = await fetchWithTimeout(`${base}/flights/search?${qs}`, undefined, undefined, fetchImpl);
  } catch (err) {
    if (isTimeoutError(err)) throw new LookupError(0, 'timeout', TIMEOUT_MESSAGE);
    throw new LookupError(0, 'network', FALLBACK);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const d = body?.detail;
    throw new LookupError(res.status, d?.reason ?? 'error', typeof d?.message === 'string' ? d.message : FALLBACK);
  }
  const body = (await res.json()) as SearchResponse;
  if (!Array.isArray(body?.flights) || body.flights.length === 0) {
    throw new LookupError(404, 'not_found', "We found no flights on that route and date. Check the airports, or enter the details manually.");
  }
  return body;
}

/** Departure-time order, then flight number: the list order users see. */
export function sortByDeparture<T extends { dep_time: string; flight: string }>(flights: T[]): T[] {
  return [...flights].sort((a, b) => a.dep_time.localeCompare(b.dep_time) || a.flight.localeCompare(b.flight));
}

/** Index of the lowest-delay-chance flight (first on ties), or -1 when empty. */
export function mostReliableIndex(flights: { delay_probability: number }[]): number {
  let best = -1;
  flights.forEach((f, i) => {
    if (best < 0 || f.delay_probability < flights[best].delay_probability) best = i;
  });
  return best;
}
