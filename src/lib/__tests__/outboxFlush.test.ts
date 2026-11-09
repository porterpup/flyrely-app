import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudError } from '../cloudFlights';
import type { CloudApi } from '../cloudFlights';
import {
  configureEngine,
  enqueue,
  flushOutbox,
  getSyncStatus,
  onNotice,
  pendingCount,
  resetEngineForTests,
  setEngineUser,
} from '../syncEngine';
import { installMemStorage, makeFlight } from './memStorage';

function makeApi(over: Partial<CloudApi> = {}) {
  const calls: string[] = [];
  const api: CloudApi = {
    fetchAll: vi.fn(async () => {
      calls.push('fetchAll');
      return { flights: [], trips: [] };
    }),
    upsertFlight: vi.fn(async (_u, row) => void calls.push(`upsert:${row.id}`)),
    softDeleteFlight: vi.fn(async (_u, id) => void calls.push(`delete:${id}`)),
    upsertTrip: vi.fn(async (_u, row) => void calls.push(`trip:${row.id}`)),
    setTripLegs: vi.fn(async (id) => void calls.push(`legs:${id}`)),
    importFlights: vi.fn(async (rows) => {
      calls.push(`import:${rows.length}`);
      return rows.length;
    }),
    ...over,
  };
  return { api, calls };
}

const host = () => ({ applyCloud: vi.fn(), markReady: vi.fn(), notify: vi.fn() });

describe('flushOutbox', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    resetEngineForTests();
    store = installMemStorage();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('keeps the change on a network error', async () => {
    const { api } = makeApi({ upsertFlight: vi.fn(async () => { throw new CloudError('retry'); }) });
    configureEngine({ api, host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'upsertFlight', flight: makeFlight(), at: 't' });
    await flushOutbox();
    expect(pendingCount()).toBe(1);
    expect(getSyncStatus()).toEqual({ pending: 1, state: 'offline' });
    expect(JSON.parse(store['flyrely_outbox:u1'])).toHaveLength(1);
  });

  it('treats an unexpected exception like a network error', async () => {
    const { api } = makeApi({ upsertFlight: vi.fn(async () => { throw new TypeError('boom'); }) });
    configureEngine({ api, host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'upsertFlight', flight: makeFlight(), at: 't' });
    await flushOutbox();
    expect(pendingCount()).toBe(1);
  });

  it('on 23505 drops the change, raises a notice and downloads again', async () => {
    const { api, calls } = makeApi({ upsertFlight: vi.fn(async () => { throw new CloudError('unique', '23505'); }) });
    const h = host();
    configureEngine({ api, host: h, autoFlush: false });
    const notices: string[] = [];
    onNotice((m) => notices.push(m));
    setEngineUser('u1');
    enqueue({ type: 'upsertFlight', flight: makeFlight(), at: 't' });
    await flushOutbox();
    expect(pendingCount()).toBe(0);
    expect(notices).toEqual(['You already track this flight.']);
    expect(calls).toContain('fetchAll');
    expect(h.applyCloud).toHaveBeenCalled();
  });

  it('on a CHECK error drops the change so the queue cannot get stuck', async () => {
    const { api, calls } = makeApi({
      upsertFlight: vi.fn(async (_u, row) => {
        if (row.id === 'bad') throw new CloudError('rejected', '23514');
        calls.push(`upsert:${row.id}`);
      }),
    });
    configureEngine({ api, host: host(), autoFlush: false });
    const notices: string[] = [];
    onNotice((m) => notices.push(m));
    setEngineUser('u1');
    enqueue({ type: 'upsertFlight', flight: makeFlight({ id: 'bad' }), at: 't' });
    enqueue({ type: 'upsertFlight', flight: makeFlight({ id: 'good', flightNumber: 'UA2' }), at: 't' });
    await flushOutbox();
    expect(pendingCount()).toBe(0);
    expect(calls).toContain('upsert:good');
    expect(notices).toEqual(["Couldn't save one change."]);
  });

  it('uploads first-in, first-out (trip before its legs)', async () => {
    const { api, calls } = makeApi();
    configureEngine({ api, host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'upsertFlight', flight: makeFlight({ id: 'a' }), at: 't' });
    enqueue({ type: 'upsertTrip', trip: { id: 't1', clientUpdatedAt: 'x' } });
    enqueue({ type: 'setTripLegs', tripId: 't1', flightIds: ['a', 'b'], at: 't' });
    enqueue({ type: 'deleteFlight', id: 'z', at: 't' });
    await flushOutbox();
    expect(calls.filter((c) => c !== 'fetchAll')).toEqual(['upsert:a', 'trip:t1', 'legs:t1', 'delete:z']);
    expect(pendingCount()).toBe(0);
    expect(getSyncStatus().state).toBe('synced');
  });

  it('reloads the persisted outbox for the user after a restart', async () => {
    const { api } = makeApi({ upsertFlight: vi.fn(async () => { throw new CloudError('retry'); }) });
    configureEngine({ api, host: host(), autoFlush: false });
    setEngineUser('u1');
    enqueue({ type: 'upsertFlight', flight: makeFlight(), at: 't' });
    resetEngineForTests();
    configureEngine({ api: makeApi().api, host: host(), autoFlush: false });
    setEngineUser('u1');
    expect(pendingCount()).toBe(1);
    setEngineUser('u2');
    expect(pendingCount()).toBe(0);
  });
});
