import { describe, it, expect, beforeEach } from 'vitest';
import { installMemStorage, makeFlight } from './memStorage';
import { configureEngine, resetEngineForTests } from '../syncEngine';
import type { Flight } from '~/types';

const ap = (code: string) => ({ code, name: code, city: code });
const fl = (id: string, from: string, to: string, dep: string, arr: string): Flight =>
  makeFlight({ id, flightNumber: `UA${id.replace(/\D/g, '')}`, origin: ap(from), destination: ap(to), scheduledDeparture: dep, scheduledArrivalLocal: arr });

async function setup() {
  resetEngineForTests();
  installMemStorage();
  const store = await import('../flightStore');
  // keep the real host registered by flightStore, but never hit the network
  configureEngine({ autoFlush: false });
  store.setActiveUser(null);
  store.setActiveUser('u1');
  return store;
}

const f1 = fl('f1', 'SFO', 'DEN', '2030-12-03T07:00:00', '2030-12-03T10:00:00');
const f2 = fl('f2', 'DEN', 'BNA', '2030-12-03T11:00:00', '2030-12-03T14:00:00');
const f3 = fl('f3', 'BNA', 'ATL', '2030-12-03T15:00:00', '2030-12-03T16:00:00');

describe('trip operations', () => {
  let s: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    s = await setup();
    s.saveFlight(f1);
    s.saveFlight(f2);
    s.saveFlight(f3);
  });

  it('creates a trip with legs in order', () => {
    const r = s.createTrip(['f1', 'f2']);
    expect(r.ok).toBe(true);
    expect(s.getFlightById('f1')).toMatchObject({ legIndex: 0 });
    expect(s.getFlightById('f2')).toMatchObject({ legIndex: 1 });
    expect(s.getTrips()).toHaveLength(1);
  });

  it('refuses flights that do not connect', () => {
    expect(s.createTrip(['f1', 'f3']).ok).toBe(false);
    expect(s.getTrips()).toHaveLength(0);
  });

  it('refuses a 5th leg', () => {
    const extra = [
      fl('f4', 'ATL', 'MIA', '2030-12-03T17:00:00', '2030-12-03T18:00:00'),
      fl('f5', 'MIA', 'JFK', '2030-12-03T19:00:00', '2030-12-03T21:00:00'),
    ];
    extra.forEach(s.saveFlight);
    const r = s.createTrip(['f1', 'f2']);
    if (!r.ok) throw new Error('setup');
    expect(s.appendLeg(r.tripId, 'f3').ok).toBe(true);
    expect(s.appendLeg(r.tripId, 'f4').ok).toBe(true);
    const fifth = s.appendLeg(r.tripId, 'f5');
    expect(fifth.ok).toBe(false);
    expect(s.getFlightById('f5')?.tripId).toBeUndefined();
  });

  it('deleting a middle leg of a 3-leg trip ungroups it', () => {
    const r = s.createTrip(['f1', 'f2']);
    if (!r.ok) throw new Error('setup');
    s.appendLeg(r.tripId, 'f3');
    expect(s.removeFlight('f2')).toBe('ungrouped_not_connected');
    expect(s.getTrips()).toHaveLength(0);
    expect(s.getFlights().map((f) => f.tripId)).toEqual([undefined, undefined]);
  });

  it('deleting the last leg of a 2-leg trip dissolves it', () => {
    const r = s.createTrip(['f1', 'f2']);
    if (!r.ok) throw new Error('setup');
    expect(s.removeFlight('f2')).toBe('dissolved');
    expect(s.getTrips()).toHaveLength(0);
    expect(s.getFlightById('f1')?.tripId).toBeUndefined();
  });

  it('deleting the last leg of a 3-leg trip keeps a 2-leg trip', () => {
    const r = s.createTrip(['f1', 'f2']);
    if (!r.ok) throw new Error('setup');
    s.appendLeg(r.tripId, 'f3');
    expect(s.removeFlight('f3')).toBe('updated');
    expect(s.getTrips()).toHaveLength(1);
  });

  it('removing a leg from a 2-leg trip dissolves it; ungroup frees the flights', () => {
    const r = s.createTrip(['f1', 'f2']);
    if (!r.ok) throw new Error('setup');
    expect(s.removeLeg(r.tripId, 'f1')).toBe('dissolved');
    expect(s.getFlights()).toHaveLength(3);
    const r2 = s.createTrip(['f1', 'f2']);
    if (!r2.ok) throw new Error('setup');
    s.ungroupTrip(r2.tripId);
    expect(s.getTrips()).toHaveLength(0);
  });

  it('an edit built from an older copy does not undo trip membership', () => {
    s.createTrip(['f1', 'f2']);
    s.saveFlight({ ...f1, gate: 'B2' }); // f1 as it was before grouping
    expect(s.getFlightById('f1')).toMatchObject({ gate: 'B2', legIndex: 0 });
    expect(s.getFlightById('f1')?.tripId).toBeDefined();
  });

  it('editing a leg so it no longer connects ungroups the trip; a valid edit keeps it', () => {
    s.createTrip(['f1', 'f2']);
    const tripId = s.getFlightById('f1')!.tripId!;
    s.saveFlight({ ...s.getFlightById('f2')!, scheduledDeparture: '2030-12-03T12:00:00' });
    expect(s.revalidateTrip(tripId)).toBeNull();
    expect(s.getFlightById('f2')!.tripId).toBe(tripId);
    // departs before the first leg lands
    s.saveFlight({ ...s.getFlightById('f2')!, scheduledDeparture: '2030-12-03T09:00:00' });
    expect(s.revalidateTrip(tripId)).toBe('ungrouped_not_connected');
    expect(s.getFlightById('f1')!.tripId).toBeUndefined();
    expect(s.getFlightById('f2')!.tripId).toBeUndefined();
    expect(s.getTrips()).toHaveLength(0);
  });

  it('renames within 80 characters and remembers dismissed suggestions', () => {
    const r = s.createTrip(['f1', 'f2']);
    if (!r.ok) throw new Error('setup');
    expect(s.renameTrip(r.tripId, 'Home')).toBe(true);
    expect(s.getTripById(r.tripId)?.name).toBe('Home');
    expect(s.renameTrip(r.tripId, 'x'.repeat(81))).toBe(false);
    s.dismissSuggestion([f2, f3]);
    expect(s.getSnapshot().dismissed).toEqual(['f2>f3']);
  });
});
