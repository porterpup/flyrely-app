// Pure string formatting for copilot components. Parses ISO strings by hand so there is
// no timezone conversion: times are already airport-local.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-15T14:30:00" -> "2:30 PM". Returns the input if it can't be parsed. */
export function formatLocalTime(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${suffix}`;
}

export { formatMonthYear } from '~/lib/utils';

/** "2026-11-15" -> "Nov 15". */
export function formatShortDate(iso: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[1]) - 1] ?? m[1]} ${Number(m[2])}`;
}

/** Chance as shown everywhere in the app: a percent, never minutes. */
export function formatChance(probability: number): string {
  return `${Math.round(probability * 100)}% chance of a 15+ min delay`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Where the alternatives list sits in time: "today", "tomorrow", or "on Sat, Nov 15".
 * `dateIso` is `alternatives.date` (the origin's local date). The app has no airport time
 * zones, so "today" is the device's date, which matches the origin for someone at the airport.
 */
export function formatAlternativesWhen(dateIso: string, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso);
  if (!m) return 'today';
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (date === localDateString(now)) return 'today';
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (date === localDateString(next)) return 'tomorrow';
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()];
  return `on ${weekday}, ${formatShortDate(date)}`;
}
