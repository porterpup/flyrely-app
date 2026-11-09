import type { Flight } from '~/types';
import { naturalKey } from '~/lib/syncEngine';

/**
 * Old on-device flights that are not already in the account: skip any with the same id, or the same
 * flight number + origin + departure.
 */
export function chooseLegacyToImport(legacy: Flight[], existing: Flight[]): Flight[] {
  const ids = new Set(existing.map((f) => f.id));
  const keys = new Set(existing.map(naturalKey));
  const out: Flight[] = [];
  for (const f of legacy) {
    if (!f || typeof f.id !== 'string' || !f.flightNumber || !f.origin?.code) continue;
    const key = naturalKey(f);
    if (ids.has(f.id) || keys.has(key)) continue;
    ids.add(f.id);
    keys.add(key);
    out.push(f);
  }
  return out;
}
