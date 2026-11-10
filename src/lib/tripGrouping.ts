// Pure trip logic. A trip is 2-4 connecting flights in one direction; each layover is more than 0 and at most 24 hours.
// These are the same rules as the itinerary endpoint (not_connected / invalid_layover), so a trip that passes here is
// accepted there.
import type { Flight, Trip } from '~/types';
import { normalizeLocal } from '~/lib/cloudFlights';

export const MIN_LEGS = 2;
export const MAX_LEGS = 4;
export const MAX_LAYOVER_MINUTES = 24 * 60;
/** Suggestion window: next flight leaves within this long after the previous one lands. */
export const SUGGEST_AFTER_ARRIVAL_MINUTES = 6 * 60;
/** Same, when the arrival time is unknown: measured from the previous departure instead. */
export const SUGGEST_AFTER_DEPARTURE_MINUTES = 12 * 60;

/** Local wall-clock `YYYY-MM-DDTHH:MM[:SS]` as minutes. Only differences between times in the same zone are meaningful. */
export function localMinutes(iso: string | undefined | null): number | null {
  const n = normalizeLocal(iso);
  if (!n) return null;
  const ms = Date.parse(`${n}Z`);
  return Number.isNaN(ms) ? null : ms / 60000;
}

/**
 * Minutes between landing of `prev` and departure of `next`, both in the hub's local time.
 * Null when the previous flight's arrival time is unknown.
 */
export function layoverMinutes(prev: Flight, next: Flight): number | null {
  const arr = localMinutes(prev.scheduledArrivalLocal);
  const dep = localMinutes(next.scheduledDeparture);
  if (arr === null || dep === null) return null;
  return Math.round(dep - arr);
}

export type TripError = 'too_few' | 'too_many' | 'not_connected' | 'invalid_layover';

export type TripValidation = { ok: true } | { ok: false; reason: TripError; index?: number };

/** Legs must be in travel order. Layover is only checked when the arrival time is known. */
export function validateTripLegs(legs: Flight[]): TripValidation {
  if (legs.length < MIN_LEGS) return { ok: false, reason: 'too_few' };
  if (legs.length > MAX_LEGS) return { ok: false, reason: 'too_many' };
  for (let i = 0; i < legs.length - 1; i++) {
    const a = legs[i];
    const b = legs[i + 1];
    if (a.destination.code !== b.origin.code) return { ok: false, reason: 'not_connected', index: i };
    const layover = layoverMinutes(a, b);
    if (layover !== null) {
      if (layover <= 0 || layover > MAX_LAYOVER_MINUTES) return { ok: false, reason: 'invalid_layover', index: i };
    }
    // Arrival unknown: the layover can't be checked yet (the connection row asks for the arrival time).
  }
  return { ok: true };
}

/** Plain-English copy for a validation failure. */
export function tripErrorMessage(reason: TripError, legs: Flight[] = [], index = 0): string {
  switch (reason) {
    case 'too_few':
      return 'A trip needs at least 2 flights.';
    case 'too_many':
      return `A trip can have at most ${MAX_LEGS} flights.`;
    case 'not_connected':
      return legs[index + 1]
        ? `${legs[index + 1].flightNumber} needs to leave from ${legs[index].destination.code}, where ${legs[index].flightNumber} lands.`
        : 'These flights do not connect.';
    case 'invalid_layover':
      return 'The connection must be more than 0 and at most 24 hours.';
  }
}

export function legsOf(trip: Pick<Trip, 'id'>, flights: Flight[]): Flight[] {
  return flights
    .filter((f) => f.tripId === trip.id)
    .sort((a, b) => (a.legIndex ?? 0) - (b.legIndex ?? 0));
}

/** "SFO → DEN → BNA" */
export function chainLabel(legs: Flight[]): string {
  if (legs.length === 0) return '';
  return [legs[0].origin.code, ...legs.map((l) => l.destination.code)].join(' → ');
}

/** The trip's name, or the automatic "SFO → BNA" title. */
export function tripTitle(trip: Pick<Trip, 'name'>, legs: Flight[]): string {
  if (trip.name) return trip.name;
  if (legs.length === 0) return 'Trip';
  return `${legs[0].origin.code} → ${legs[legs.length - 1].destination.code}`;
}

// ── Suggestions ─────────────────────────────────────────────────────────────

export interface TripSuggestion {
  /** Stable key for the whole chain. */
  key: string;
  legs: Flight[];
}

export const pairKey = (a: Flight, b: Flight) => `${a.id}>${b.id}`;

/** Does B plausibly continue A? Ignores whether either is already grouped. */
export function canChain(a: Flight, b: Flight): boolean {
  if (a.id === b.id) return false;
  if (a.destination.code !== b.origin.code) return false;
  if (b.destination.code === a.origin.code) return false; // flying straight back is its own trip
  const dep = localMinutes(b.scheduledDeparture);
  if (dep === null) return false;
  const arr = localMinutes(a.scheduledArrivalLocal);
  if (arr !== null) {
    const gap = dep - arr;
    return gap > 0 && gap <= SUGGEST_AFTER_ARRIVAL_MINUTES;
  }
  const prevDep = localMinutes(a.scheduledDeparture);
  if (prevDep === null) return false;
  const gap = dep - prevDep;
  return gap > 0 && gap <= SUGGEST_AFTER_DEPARTURE_MINUTES;
}

/**
 * Suggest groupings among upcoming flights that are not in a trip. Chains up to 4 legs; skips pairs the user
 * dismissed. Never groups on its own: the user must accept.
 */
export function suggestTrips(upcomingUngrouped: Flight[], dismissed: Iterable<string> = []): TripSuggestion[] {
  const skip = new Set(dismissed);
  const flights = upcomingUngrouped
    .filter((f) => !f.tripId)
    .sort((a, b) => (localMinutes(a.scheduledDeparture) ?? 0) - (localMinutes(b.scheduledDeparture) ?? 0) || a.id.localeCompare(b.id));
  const used = new Set<string>();
  const out: TripSuggestion[] = [];
  for (const start of flights) {
    if (used.has(start.id)) continue;
    const chain = [start];
    while (chain.length < MAX_LEGS) {
      const last = chain[chain.length - 1];
      const next = flights.find(
        (f) => !used.has(f.id) && !chain.includes(f) && canChain(last, f) && !skip.has(pairKey(last, f))
      );
      if (!next) break;
      chain.push(next);
    }
    if (chain.length >= MIN_LEGS && validateTripLegs(chain).ok) {
      chain.forEach((f) => used.add(f.id));
      out.push({ key: chain.map((f) => f.id).join('>'), legs: chain });
    }
  }
  return out;
}

/** Keys to store when the user taps "Not a trip": every consecutive pair in the chain. */
export function dismissKeysFor(legs: Flight[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i < legs.length - 1; i++) keys.push(pairKey(legs[i], legs[i + 1]));
  return keys;
}

// ── Hand-off to POST /predict/itinerary ─────────────────────────────────────

export interface ItineraryRequest {
  itinerary_id: string;
  legs: {
    flight_id: string;
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string | undefined;
  }[];
  connections: { min_connect_minutes?: number }[];
}

export function tripToItineraryRequest(trip: Pick<Trip, 'id'>, legs: Flight[]): ItineraryRequest {
  const sorted = legs.slice().sort((a, b) => (a.legIndex ?? 0) - (b.legIndex ?? 0));
  return {
    itinerary_id: trip.id,
    legs: sorted.map((f) => ({
      flight_id: f.id,
      flight_number: f.flightNumber,
      airline: f.airline.code,
      origin: f.origin.code,
      destination: f.destination.code,
      departure_time: f.scheduledDeparture,
      arrival_time: f.scheduledArrivalLocal,
    })),
    connections: sorted.slice(1).map((f) => (f.connectMctOverride ? { min_connect_minutes: f.connectMctOverride } : {})),
  };
}

/** 53 -> "53 min", 65 -> "1 h 5 min", 120 -> "2 h". */
export function formatLayover(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
