// Minimum connection times (MCT): a purely time-based check. No prediction, no percentage.
//
// Copied from the approved defaults in flyrely-api (porterpup/flyrely-api, origin/master):
//   models/mct_defaults.csv and flyrely_dist/mct.py (frozen in backtest/PROTOCOL_ARRIVAL_CONNECTIONS.md, D1, 2026-11-09).
// They are FlyRely estimates by airport size, not airline-published times. If the API table changes, update this file.
import { formatLayover } from '~/lib/tripGrouping';

const words = (s: string) => s.split(' ');

/** 50 min. */
export const LARGE_CAMPUS = new Set(words('ATL ORD DFW DEN LAX JFK EWR IAH SFO CLT'));
/** 40 min (large-campus airports excluded: they win). */
const TOP30 = new Set(words('ORD ATL DEN DFW CLT PHX LAX LAS SEA IAH LGA MCO SFO DCA BOS DTW EWR MSP JFK PHL SLC MIA BNA SAN BWI IAD AUS FLL TPA PDX'));
/** 35 min. Every other airport is 30 min (the API's DEFAULT_MCT). */
const MID = new Set(words('MDW DAL STL RDU SMF HNL HOU IND MSY MCI SJC CMH PIT SNA CLE CVG SAT'));

export const DEFAULT_MCT_MINUTES = 30;
/** Added when the two legs are on different airlines (API CROSS_NETWORK_EXTRA). */
export const SEPARATE_AIRLINES_EXTRA_MINUTES = 30;
/** Layovers within this many minutes above the MCT get the "short" caution. */
export const SHORT_MARGIN_MINUTES = 15;

export function airportMct(code: string): number {
  const c = code.toUpperCase();
  if (LARGE_CAMPUS.has(c)) return 50;
  if (TOP30.has(c)) return 40;
  if (MID.has(c)) return 35;
  return DEFAULT_MCT_MINUTES;
}

/** Hawaiian flies as Alaska, so HA and AS are one airline. */
function network(airline: string | undefined): string {
  const c = (airline ?? '').toUpperCase();
  return c === 'HA' ? 'AS' : c;
}

/** True only when both airlines are known and differ. */
export function isSeparateAirlines(a: string | undefined, b: string | undefined): boolean {
  const x = network(a);
  const y = network(b);
  return x !== '' && y !== '' && x !== y;
}

export function minConnectMinutes(hub: string, prevAirline?: string, nextAirline?: string): number {
  return airportMct(hub) + (isSeparateAirlines(prevAirline, nextAirline) ? SEPARATE_AIRLINES_EXTRA_MINUTES : 0);
}

export type ConnectionLevel = 'tight' | 'short' | 'ok' | 'unknown';

export interface ConnectionAssessment {
  level: ConnectionLevel;
  mct: number;
  separateAirlines: boolean;
  /** Headline for tight / short connections; null otherwise. */
  message: string | null;
  /** Extra line when the legs are on different airlines. */
  separateNote: string | null;
}

export const SEPARATE_AIRLINES_NOTE =
  "Separate airlines: if your first flight is late, the second won't wait. Allow at least 2\u20133 hours.";

/** `place` is the hub's display name. `minutes` is null when the arrival time is unknown. */
export function assessConnection(
  minutes: number | null,
  hub: string,
  place: string,
  prevAirline?: string,
  nextAirline?: string
): ConnectionAssessment {
  const separateAirlines = isSeparateAirlines(prevAirline, nextAirline);
  const mct = minConnectMinutes(hub, prevAirline, nextAirline);
  const separateNote = separateAirlines ? SEPARATE_AIRLINES_NOTE : null;
  if (minutes === null) return { level: 'unknown', mct, separateAirlines, message: null, separateNote };
  if (minutes < mct) {
    return {
      level: 'tight', mct, separateAirlines, separateNote,
      message: `Tight connection: ${formatLayover(minutes)} in ${place}. We recommend at least ${formatLayover(mct)} here.`,
    };
  }
  if (minutes < mct + SHORT_MARGIN_MINUTES) {
    return {
      level: 'short', mct, separateAirlines, separateNote,
      message: `Short connection: ${formatLayover(minutes)} in ${place}. Usually OK if your first flight is on time.`,
    };
  }
  return { level: 'ok', mct, separateAirlines, message: null, separateNote };
}
