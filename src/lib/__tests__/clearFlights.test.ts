import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('clearAllFlights', () => {
  beforeEach(() => {
    const d: Record<string, string> = { flyrely_flights: '[{"id":"a"}]', other: 'keep' };
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => d[k] ?? null,
      setItem: (k: string, v: string) => void (d[k] = v),
      removeItem: (k: string) => void delete d[k],
    });
  });
  it('removes tracked flights only', async () => {
    const { clearAllFlights, getFlights } = await import('../flightStore');
    expect(getFlights()).toHaveLength(1);
    clearAllFlights();
    expect(getFlights()).toHaveLength(0);
    expect(localStorage.getItem('other')).toBe('keep');
  });
});
