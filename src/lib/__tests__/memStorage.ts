import { vi } from 'vitest';

/** In-memory localStorage stand-in (with key()/length) installed as a global for the test. */
export function installMemStorage(initial: Record<string, string> = {}): Record<string, string> {
  const d: Record<string, string> = { ...initial };
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in d ? d[k] : null),
    setItem: (k: string, v: string) => void (d[k] = v),
    removeItem: (k: string) => void delete d[k],
    key: (i: number) => Object.keys(d)[i] ?? null,
    get length() {
      return Object.keys(d).length;
    },
  });
  return d;
}

import type { Flight } from '~/types';

export function makeFlight(over: Partial<Flight> = {}): Flight {
  return {
    id: 'flight-1',
    flightNumber: 'UA648',
    airline: { code: 'UA', name: 'United' },
    origin: { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco' },
    destination: { code: 'DEN', name: 'Denver Intl', city: 'Denver' },
    scheduledDeparture: '2026-12-01T08:00:00',
    status: 'scheduled',
    riskLevel: 'low',
    ...over,
  };
}
