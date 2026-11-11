import type { Flight } from '~/types';
import { AIRPORT_TZ } from '~/lib/airportTz';

const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Offset (ms) of `tz` from UTC at the given instant. */
function offsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Converts a wall-clock "YYYY-MM-DDTHH:mm[:ss]" in `tz` to a UTC epoch ms. NaN when unparseable. */
export function localToUtcMs(local: string, tz: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(local);
  if (!m) return NaN;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  // Two passes: the offset at the first guess may differ from the offset at the true instant across a DST change.
  const first = naive - offsetMs(naive, tz);
  return naive - offsetMs(first, tz);
}

function zoneFor(code: string, fallbackTz?: string): string {
  return AIRPORT_TZ[code] ?? fallbackTz ?? deviceTz();
}

export function originTz(f: Flight, fallbackTz?: string): string {
  return zoneFor(f.origin.code, fallbackTz);
}

/** Departure as a real instant. The schedule is the origin airport's wall-clock; unknown airports use the device zone. */
export function departureMs(f: Flight, fallbackTz?: string): number {
  return localToUtcMs(f.scheduledDeparture, originTz(f, fallbackTz));
}

export function arrivalMs(f: Flight, fallbackTz?: string): number | undefined {
  if (!f.scheduledArrivalLocal) return undefined;
  const ms = localToUtcMs(f.scheduledArrivalLocal, zoneFor(f.destination.code, fallbackTz));
  return Number.isNaN(ms) ? undefined : ms;
}

export function isDeparted(f: Flight, nowMs: number, fallbackTz?: string): boolean {
  return departureMs(f, fallbackTz) < nowMs;
}

function localDay(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

/** Friendly time-to-departure line for the ticket eyebrow. */
export function formatCountdown(departureMs: number, nowMs: number, originTz?: string): string {
  const diff = departureMs - nowMs;
  if (diff <= 0) return 'Departed';
  const HOUR = 3600_000;
  if (diff > 48 * HOUR) return `In ${Math.floor(diff / (24 * HOUR))} days`;
  const tz = originTz ?? deviceTz();
  const tomorrow = localDay(nowMs + 24 * HOUR, tz);
  // Within 12 h a countdown reads better than "Tomorrow at 1:00 AM" for a late-night flight.
  if (diff > 12 * HOUR && localDay(departureMs, tz) === tomorrow) {
    const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(departureMs));
    return `Tomorrow at ${time}`;
  }
  const totalMin = Math.floor(diff / 60_000);
  if (totalMin < 60) return `Leaves in ${Math.max(totalMin, 1)} min`;
  if (diff <= 24 * HOUR) return `Leaves in ${Math.floor(totalMin / 60)} h ${totalMin % 60} min`;
  return `In ${Math.max(2, Math.round(diff / (24 * HOUR)))} days`;
}
