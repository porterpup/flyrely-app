// localStorage keys for cloud-synced flights. Everything except LEGACY_KEY is per user.
export const LEGACY_KEY = 'flyrely_flights';
export const CACHE_PREFIX = 'flyrely_cache:';
export const OUTBOX_PREFIX = 'flyrely_outbox:';
export const DISMISS_PREFIX = 'flyrely_tripdismiss:';

export const cacheKey = (userId: string) => `${CACHE_PREFIX}${userId}`;
export const outboxKey = (userId: string) => `${OUTBOX_PREFIX}${userId}`;
export const dismissKey = (userId: string) => `${DISMISS_PREFIX}${userId}`;

/** Safe localStorage access: null when storage is unavailable (SSR, blocked site data). */
export function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // quota or blocked storage: the in-memory copy still works for this session
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // nothing to remove
  }
}

/** Every key currently in localStorage. */
export function allKeys(): string[] {
  const s = storage();
  if (!s) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k !== null) keys.push(k);
    }
  } catch {
    // ignore
  }
  return keys;
}
