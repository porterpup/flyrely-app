import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chooseLegacyToImport } from '../legacyImport';
import { CloudError } from '../cloudFlights';
import type { CloudApi } from '../cloudFlights';
import { configureEngine, enqueue, flushOutbox, resetEngineForTests, setEngineUser } from '../syncEngine';
import { installMemStorage, makeFlight } from './memStorage';

describe('chooseLegacyToImport', () => {
  it('picks only flights missing by id or by flight number + origin + departure', () => {
    const existing = [makeFlight({ id: 'a' }), makeFlight({ id: 'b', flightNumber: 'DL5' })];
    const legacy = [
      makeFlight({ id: 'a', flightNumber: 'XX9' }), // same id
      makeFlight({ id: 'new-id' }), // same flight number + origin + departure as 'a'
      makeFlight({ id: 'c', flightNumber: 'UA1' }), // genuinely new
      makeFlight({ id: 'c2', flightNumber: 'UA1' }), // duplicate of c inside the legacy list
      makeFlight({ id: 'd', flightNumber: 'UA648', scheduledDeparture: '2026-12-02T08:00:00' }), // other day: new
    ];
    expect(chooseLegacyToImport(legacy, existing).map((f) => f.id)).toEqual(['c', 'd']);
  });
});

function apiWith(importFlights: CloudApi['importFlights']): CloudApi {
  return {
    fetchAll: async () => ({ flights: [], trips: [] }),
    upsertFlight: async () => {},
    softDeleteFlight: async () => {},
    upsertTrip: async () => {},
    setTripLegs: async () => {},
    importFlights,
  };
}

describe('import upload', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    resetEngineForTests();
    store = installMemStorage({ flyrely_flights: '[{"id":"x"}]' });
  });
  const host = () => ({ applyCloud: vi.fn(), markReady: vi.fn(), notify: vi.fn() });

  it('removes the old key only after the upload succeeds', async () => {
    const imp = vi.fn(async (rows: unknown[]) => rows.length);
    configureEngine({ api: apiWith(imp), host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'importFlights', flights: [makeFlight()], at: 't' });
    expect(store.flyrely_flights).toBeDefined();
    await flushOutbox();
    expect(imp).toHaveBeenCalledOnce();
    expect(store.flyrely_flights).toBeUndefined();
  });

  it('offline leaves the old key and keeps the import queued', async () => {
    const imp = vi.fn(async () => { throw new CloudError('retry'); });
    configureEngine({ api: apiWith(imp), host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'importFlights', flights: [makeFlight()], at: 't' });
    await flushOutbox();
    expect(store.flyrely_flights).toBeDefined();
    expect(JSON.parse(store['flyrely_outbox:u1'])).toHaveLength(1);
  });

  it('skips flights that fail the format checks', async () => {
    const imp = vi.fn(async (rows: unknown[]) => rows.length);
    configureEngine({ api: apiWith(imp), host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'importFlights', flights: [makeFlight(), makeFlight({ id: 'bad', flightNumber: 'X' })], at: 't' });
    await flushOutbox();
    expect((imp.mock.calls[0] as unknown[][])[0]).toHaveLength(1);
  });
});
