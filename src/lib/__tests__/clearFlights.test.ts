import { describe, it, expect, beforeEach } from 'vitest';
import { installMemStorage, makeFlight } from './memStorage';

describe('clearAllFlights', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = installMemStorage({
      flyrely_flights: '[{"id":"a"}]',
      'flyrely_cache:u1': JSON.stringify({ flights: [makeFlight()], trips: [] }),
      'flyrely_outbox:u1': '[]',
      'flyrely_tripdismiss:u1': '[]',
      'flyrely_cache:u2': '{}',
      other: 'keep',
    });
  });
  it('removes the old key and every per-user cache, queue and dismissed list; leaves other keys', async () => {
    const { clearAllFlights, getFlights, setActiveUser, readLegacyFlights } = await import('../flightStore');
    setActiveUser('u1');
    expect(getFlights()).toHaveLength(1);
    expect(readLegacyFlights()).toHaveLength(1);
    clearAllFlights();
    expect(getFlights()).toHaveLength(0);
    expect(Object.keys(store)).toEqual(['other']);
    setActiveUser(null);
  });
});
