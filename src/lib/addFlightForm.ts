import { parseFlightNumber } from '~/lib/utils';

/** What the Add flight form holds. Date is shared: both ways of searching need it. */
export interface AddFlightFields {
  flightNumber: string;
  /** Chosen airline code, used only when the flight number is bare digits. */
  airlineCode: string;
  date: string;
  origin: string;
  dest: string;
  /** Local departure time, "HH:MM". */
  departureTime: string;
}

export type AddFlightPlan =
  | { kind: 'number'; airline: string; number: string }
  | { kind: 'route'; origin: string; dest: string; departureTime: string }
  | { kind: 'error'; message: string };

export const NEITHER_MESSAGE = 'Enter a flight number, or choose From, To and a departure time.';

/**
 * Either-or check: a flight number (A) OR From + To + departure time (B), plus the shared date.
 * When both are filled the flight number wins. A typed but unusable flight number is reported
 * as such rather than silently falling back to the route.
 */
export function planAddFlight(f: AddFlightFields): AddFlightPlan {
  const typed = f.flightNumber.trim();
  const origin = f.origin.trim().toUpperCase();
  const dest = f.dest.trim().toUpperCase();
  const route = origin.length === 3 && dest.length === 3 && !!f.departureTime;
  const routeStarted = !!origin || !!dest || !!f.departureTime;

  let plan: AddFlightPlan;
  if (typed) {
    const parsed = parseFlightNumber(typed) ?? (/^\d{1,4}[A-Za-z]?$/.test(typed) && f.airlineCode
      ? { airlineCode: f.airlineCode, number: typed.replace(/[A-Za-z]$/, '') } : null);
    if (parsed) {
      plan = { kind: 'number', airline: parsed.airlineCode, number: parsed.number };
    } else if (/^\d{1,4}[A-Za-z]?$/.test(typed)) {
      return { kind: 'error', message: 'Choose the airline for that flight number.' };
    } else {
      return { kind: 'error', message: 'Enter a valid flight number, e.g. DL1234 or B6 123.' };
    }
  } else if (route) {
    plan = { kind: 'route', origin, dest, departureTime: f.departureTime };
  } else if (routeStarted) {
    const missing = [
      origin.length === 3 ? '' : 'From',
      dest.length === 3 ? '' : 'To',
      f.departureTime ? '' : 'a departure time',
    ].filter(Boolean);
    const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0];
    return { kind: 'error', message: `Add ${list} to search by route, or enter a flight number instead.` };
  } else {
    return { kind: 'error', message: NEITHER_MESSAGE };
  }

  if (!f.date) return { kind: 'error', message: 'Pick the flight date.' };
  return plan;
}

/** "HH:MM" shifted by `minutes`, clamped to the same day. */
export function shiftClock(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
