import { describe, it, expect, beforeEach } from 'vitest';
import { installMemStorage, makeFlight } from './memStorage';

describe('switching users on one device', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = installMemStorage({
      'flyrely_cache:userA': JSON.stringify({ flights: [makeFlight({ id: 'a1' })], trips: [] }),
      'flyrely_outbox:userA': '[{"seq":1}]',
      'flyrely_tripdismiss:userA': '["k"]',
      'flyrely_cache:userB': JSON.stringify({ flights: [makeFlight({ id: 'b1' })], trips: [] }),
      other: 'keep',
    });
  });

  it("clearOtherUsersData removes everyone else's cache, queue and dismissed list", async () => {
    const { clearOtherUsersData } = await import('../flightStore');
    clearOtherUsersData('userB');
    expect(store['flyrely_cache:userA']).toBeUndefined();
    expect(store['flyrely_outbox:userA']).toBeUndefined();
    expect(store['flyrely_tripdismiss:userA']).toBeUndefined();
    expect(store['flyrely_cache:userB']).toBeDefined();
    expect(store.other).toBe('keep');
  });

  it("user B never sees user A's flights after the switch", async () => {
    const fs = await import('../flightStore');
    fs.setActiveUser('userA');
    expect(fs.getFlights().map((f) => f.id)).toEqual(['a1']);
    fs.clearOtherUsersData('userB');
    fs.setActiveUser('userB');
    expect(fs.getFlights().map((f) => f.id)).toEqual(['b1']);
    fs.setActiveUser(null);
    expect(fs.getFlights()).toEqual([]);
  });

  it('writes are refused while nobody is signed in', async () => {
    const fs = await import('../flightStore');
    fs.setActiveUser(null);
    expect(() => fs.saveFlight(makeFlight())).toThrow(/not signed in/);
  });
});
