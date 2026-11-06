import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Store = Map<string, string>;

function fakeStorage(store: Store, overrides: Partial<Storage> = {}): Storage {
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
    ...overrides,
  } as Storage;
}

async function loadPrefs() {
  vi.resetModules();
  return import('../prefs');
}

describe('copilot prefs', () => {
  let store: Store;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('window', { localStorage: fakeStorage(store) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when nothing is stored', async () => {
    const p = await loadPrefs();
    expect(p.getHomeAirport()).toBeNull();
    expect(p.getFlightState('flight-1')).toBeNull();
    expect(p.loadPrefs()).toEqual({ homeAirport: null, flights: {} });
  });

  it('saves and reads the home airport, uppercased and trimmed', async () => {
    const p = await loadPrefs();
    expect(p.setHomeAirport(' bos ')).toBe(true);
    expect(p.getHomeAirport()).toBe('BOS');
    expect(JSON.parse(store.get('flyrely_copilot_v1') as string).homeAirport).toBe('BOS');
  });

  it('rejects anything that is not three letters', async () => {
    const p = await loadPrefs();
    expect(p.setHomeAirport('BOSTON')).toBe(false);
    expect(p.setHomeAirport('B0S')).toBe(false);
    expect(p.setHomeAirport('')).toBe(false);
    expect(p.getHomeAirport()).toBeNull();
    expect(store.size).toBe(0);
  });

  it('clears the home airport with null', async () => {
    const p = await loadPrefs();
    p.setHomeAirport('JFK');
    expect(p.setHomeAirport(null)).toBe(true);
    expect(p.getHomeAirport()).toBeNull();
  });

  it('keeps per-flight state independent of the home airport', async () => {
    const p = await loadPrefs();
    p.setHomeAirport('SFO');
    expect(p.setFlightState('flight-1', 'cancelled')).toBe(true);
    expect(p.setFlightState('flight-2', 'rebooked_later')).toBe(true);
    expect(p.getFlightState('flight-1')).toBe('cancelled');
    expect(p.getFlightState('flight-2')).toBe('rebooked_later');
    expect(p.getHomeAirport()).toBe('SFO');
  });

  it('overwrites a flight state and clears it with null', async () => {
    const p = await loadPrefs();
    p.setFlightState('flight-1', 'cancelled');
    p.setFlightState('flight-1', 'rebooked_today');
    expect(p.getFlightState('flight-1')).toBe('rebooked_today');
    p.setFlightState('flight-1', null);
    expect(p.getFlightState('flight-1')).toBeNull();
  });

  it('clearFlightPrefs removes one flight and is a no-op for an unknown flight', async () => {
    const p = await loadPrefs();
    p.setFlightState('flight-1', 'not_cancelled');
    p.setFlightState('flight-2', 'cancelled');
    expect(p.clearFlightPrefs('flight-1')).toBe(true);
    expect(p.getFlightState('flight-1')).toBeNull();
    expect(p.getFlightState('flight-2')).toBe('cancelled');

    const before = store.get('flyrely_copilot_v1');
    expect(p.clearFlightPrefs('never-saved')).toBe(true);
    expect(store.get('flyrely_copilot_v1')).toBe(before);
  });

  it('treats corrupt JSON as empty and recovers on the next write', async () => {
    store.set('flyrely_copilot_v1', '{not json');
    const p = await loadPrefs();
    expect(p.getHomeAirport()).toBeNull();
    expect(p.setHomeAirport('LAX')).toBe(true);
    expect(p.getHomeAirport()).toBe('LAX');
  });

  it('drops malformed stored values instead of trusting them', async () => {
    store.set(
      'flyrely_copilot_v1',
      JSON.stringify({ homeAirport: 'bad', flights: { a: 'cancelled', b: 'exploded', c: 7 } }),
    );
    const p = await loadPrefs();
    expect(p.getHomeAirport()).toBeNull();
    expect(p.loadPrefs().flights).toEqual({ a: 'cancelled' });
  });

  it('treats a non-object JSON value as empty', async () => {
    store.set('flyrely_copilot_v1', '"just a string"');
    const p = await loadPrefs();
    expect(p.loadPrefs()).toEqual({ homeAirport: null, flights: {} });
  });

  it('does not throw when localStorage access throws', async () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    const p = await loadPrefs();
    expect(p.getHomeAirport()).toBeNull();
    expect(p.getFlightState('flight-1')).toBeNull();
    expect(p.setHomeAirport('JFK')).toBe(false);
    expect(p.setFlightState('flight-1', 'cancelled')).toBe(false);
    expect(p.clearFlightPrefs('flight-1')).toBe(true); // nothing stored, nothing to clear
  });

  it('does not throw when setItem throws (quota exceeded)', async () => {
    vi.stubGlobal('window', {
      localStorage: fakeStorage(store, {
        setItem: () => {
          throw new DOMException('full', 'QuotaExceededError');
        },
      }),
    });
    const p = await loadPrefs();
    expect(p.setHomeAirport('JFK')).toBe(false);
    expect(p.getHomeAirport()).toBeNull();
  });

  it('is SSR-safe when there is no window', async () => {
    vi.unstubAllGlobals();
    const p = await loadPrefs();
    expect(p.getHomeAirport()).toBeNull();
    expect(p.getFlightState('flight-1')).toBeNull();
    expect(p.setHomeAirport('JFK')).toBe(false);
    expect(p.setFlightState('flight-1', 'cancelled')).toBe(false);
  });
});
