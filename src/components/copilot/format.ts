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

/** "2026-08-31" or "2026-08" -> "Aug 2026". */
export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

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
