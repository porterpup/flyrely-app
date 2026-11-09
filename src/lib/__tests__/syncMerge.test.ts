import { describe, it, expect } from 'vitest';
import { addToOutbox, applySetTripLegs, mergeCloudWithOutbox } from '../syncEngine';
import type { Change } from '../syncEngine';
import { makeFlight } from './memStorage';

const up = (seq: number, flight = makeFlight()): Change => ({ seq, type: 'upsertFlight', flight, at: 't' });
const del = (seq: number, id: string): Change => ({ seq, type: 'deleteFlight', id, at: 't' });

describe('mergeCloudWithOutbox', () => {
  it('keeps a queued upsert that the download does not have yet', () => {
    const local = makeFlight({ id: 'new' });
    const m = mergeCloudWithOutbox({ flights: [makeFlight({ id: 'old' })], trips: [] }, [up(1, local)]);
    expect(m.flights.map((f) => f.id).sort()).toEqual(['new', 'old']);
  });

  it('queued edit wins over the cloud copy of the same flight', () => {
    const m = mergeCloudWithOutbox(
      { flights: [makeFlight({ gate: 'A1' })], trips: [] },
      [up(1, makeFlight({ gate: 'B2' }))]
    );
    expect(m.flights).toHaveLength(1);
    expect(m.flights[0].gate).toBe('B2');
  });

  it('a flight deleted remotely disappears (missing from cloud, not queued)', () => {
    const m = mergeCloudWithOutbox({ flights: [makeFlight({ id: 'kept' })], trips: [] }, []);
    expect(m.flights.map((f) => f.id)).toEqual(['kept']);
  });

  it('a queued delete hides the cloud row', () => {
    const m = mergeCloudWithOutbox({ flights: [makeFlight({ id: 'a' }), makeFlight({ id: 'b' })], trips: [] }, [del(1, 'a')]);
    expect(m.flights.map((f) => f.id)).toEqual(['b']);
  });

  it('applies a queued trip regroup and dissolves with fewer than 2 legs', () => {
    const flights = [makeFlight({ id: 'a' }), makeFlight({ id: 'b' })];
    const trips = [{ id: 't', clientUpdatedAt: 'x' }];
    const grouped = mergeCloudWithOutbox({ flights, trips }, [
      { seq: 1, type: 'setTripLegs', tripId: 't', flightIds: ['b', 'a'], at: 'x' },
    ]);
    expect(grouped.flights.find((f) => f.id === 'b')).toMatchObject({ tripId: 't', legIndex: 0 });
    expect(grouped.flights.find((f) => f.id === 'a')).toMatchObject({ tripId: 't', legIndex: 1 });
    const solo = applySetTripLegs(grouped.flights, trips, 't', ['a']);
    expect(solo.trips).toEqual([]);
    expect(solo.flights.every((f) => f.tripId === undefined)).toBe(true);
  });

  it('an import adds only flights not already present (by id or flight+origin+departure)', () => {
    const m = mergeCloudWithOutbox({ flights: [makeFlight({ id: 'a' })], trips: [] }, [
      { seq: 1, type: 'importFlights', at: 'x', flights: [makeFlight({ id: 'a' }), makeFlight({ id: 'dup' }), makeFlight({ id: 'z', flightNumber: 'UA1' })] },
    ]);
    expect(m.flights.map((f) => f.id).sort()).toEqual(['a', 'z']);
  });
});

describe('addToOutbox (merge per record)', () => {
  it('latest upsert replaces earlier upserts of the same flight', () => {
    let q: Change[] = [];
    q = addToOutbox(q, up(1, makeFlight({ gate: 'A' })));
    q = addToOutbox(q, up(2, makeFlight({ id: 'other' })));
    q = addToOutbox(q, up(3, makeFlight({ gate: 'C' })));
    expect(q.map((c) => c.seq)).toEqual([2, 3]);
  });

  it('a delete replaces queued upserts and earlier deletes', () => {
    let q: Change[] = [];
    q = addToOutbox(q, up(1));
    q = addToOutbox(q, del(2, 'flight-1'));
    q = addToOutbox(q, del(3, 'flight-1'));
    expect(q.map((c) => c.seq)).toEqual([3]);
  });

  it('keeps first-in first-out order across records and trips', () => {
    let q: Change[] = [];
    q = addToOutbox(q, { seq: 1, type: 'upsertTrip', trip: { id: 't', clientUpdatedAt: 'a' } });
    q = addToOutbox(q, { seq: 2, type: 'setTripLegs', tripId: 't', flightIds: ['a', 'b'], at: 'a' });
    q = addToOutbox(q, { seq: 3, type: 'setTripLegs', tripId: 't', flightIds: ['b', 'a'], at: 'b' });
    expect(q.map((c) => c.seq)).toEqual([1, 3]);
  });
});
