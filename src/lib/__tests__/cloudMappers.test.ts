import { describe, it, expect } from 'vitest';
import {
  classifyError,
  flightToRow,
  normalizeLocal,
  rowToFlight,
  rowToTrip,
  tripToRow,
  validateFlightForCloud,
} from '../cloudFlights';
import { makeFlight } from './memStorage';

describe('normalizeLocal', () => {
  it('pads to seconds and drops fractions/offsets-free text', () => {
    expect(normalizeLocal('2026-12-01T08:00')).toBe('2026-12-01T08:00:00');
    expect(normalizeLocal('2026-12-01T08:00:00')).toBe('2026-12-01T08:00:00');
    expect(normalizeLocal('2026-12-01 08:00:00.123')).toBe('2026-12-01T08:00:00');
    expect(normalizeLocal('nope')).toBeNull();
    expect(normalizeLocal(null)).toBeNull();
  });
});

describe('flight <-> row', () => {
  it('round trips a flight', () => {
    const f = makeFlight({ gate: 'B7', delayProbability: 0.2, scheduledArrivalLocal: '2026-12-01T11:30:00', arrivalSource: 'lookup' });
    const back = rowToFlight(flightToRow(f, '2026-11-09T10:00:00.000Z'));
    expect(back).toEqual(f);
  });

  it('uppercases flight number and airline code in columns', () => {
    const row = flightToRow(makeFlight({ flightNumber: 'ua648', airline: { code: 'ua', name: 'United' } }), 'x');
    expect(row.flight_number).toBe('UA648');
    expect(row.airline_code).toBe('UA');
  });

  it('strips legacy fields from data and keeps the scheduledArrivalLocal name', () => {
    const f = { ...makeFlight({ scheduledArrivalLocal: '2026-12-01T11:30:00' }), scheduledArrival: 'old', delayMinutes: 5 };
    const row = flightToRow(f, 'x');
    expect(row.data).not.toHaveProperty('scheduledArrival');
    expect(row.data).not.toHaveProperty('delayMinutes');
    expect(row.data).toHaveProperty('scheduledArrivalLocal', '2026-12-01T11:30:00');
    expect(row.scheduled_arrival_local).toBe('2026-12-01T11:30:00');
  });

  it('column values beat stale values inside data', () => {
    const row = flightToRow(makeFlight({ tripId: 't1', legIndex: 0 }), 'x');
    row.trip_id = null;
    row.leg_index = null;
    row.origin = 'OAK';
    row.scheduled_departure_local = '2026-12-02T09:15:00';
    const f = rowToFlight(row);
    expect(f.tripId).toBeUndefined();
    expect(f.legIndex).toBeUndefined();
    expect(f.origin.code).toBe('OAK');
    expect(f.origin.city).toBe('San Francisco'); // descriptive fields still come from data
    expect(f.scheduledDeparture).toBe('2026-12-02T09:15:00');
  });

  it('formats a short departure as seconds and rows with fractional seconds', () => {
    expect(flightToRow(makeFlight({ scheduledDeparture: '2026-12-01T08:00' }), 'x').scheduled_departure_local).toBe('2026-12-01T08:00:00');
    const row = flightToRow(makeFlight(), 'x');
    row.scheduled_departure_local = '2026-12-01T08:00:00.000';
    expect(rowToFlight(row).scheduledDeparture).toBe('2026-12-01T08:00:00');
  });

  it('rebuilds a flight from a row with empty data', () => {
    const f = rowToFlight({
      id: 'a', airline_code: 'DL', flight_number: 'DL1', origin: 'ATL', destination: 'JFK',
      scheduled_departure_local: '2026-12-01T08:00:00', scheduled_arrival_local: null, trip_id: 't', leg_index: 1,
      connect_mct_override: 45, data: {}, client_updated_at: 'x',
    });
    expect(f).toMatchObject({ id: 'a', flightNumber: 'DL1', tripId: 't', legIndex: 1, connectMctOverride: 45 });
    expect(f.airline.code).toBe('DL');
  });
});

describe('trip rows', () => {
  it('round trips', () => {
    const t = { id: 'abc', name: 'Home', clientUpdatedAt: '2026-11-09T10:00:00.000Z' };
    expect(rowToTrip(tripToRow(t))).toEqual(t);
    expect(rowToTrip({ id: 'x', name: null, client_updated_at: 'y' })).toEqual({ id: 'x', clientUpdatedAt: 'y' });
  });
});

describe('validateFlightForCloud', () => {
  it('accepts a normal flight', () => {
    expect(validateFlightForCloud(makeFlight())).toBeNull();
  });
  it('rejects what the database would reject', () => {
    expect(validateFlightForCloud(makeFlight({ id: '' }))).toMatch(/id/);
    expect(validateFlightForCloud(makeFlight({ flightNumber: 'X' }))).toMatch(/flight number/);
    expect(validateFlightForCloud(makeFlight({ origin: { code: 'SF', name: '', city: '' } }))).toMatch(/origin/);
    expect(validateFlightForCloud(makeFlight({ destination: { code: 'SFO', name: '', city: '' } }))).toMatch(/same/);
    expect(validateFlightForCloud(makeFlight({ scheduledDeparture: 'tomorrow' }))).toMatch(/departure/);
    expect(validateFlightForCloud(makeFlight({ connectMctOverride: 5 }))).toMatch(/connect/);
  });
});

describe('classifyError', () => {
  it('maps failures to retry / unique / rejected', () => {
    expect(classifyError({ message: 'Failed to fetch' }, undefined).kind).toBe('retry');
    expect(classifyError({ code: '' }, 503).kind).toBe('retry');
    expect(classifyError({ code: '' }, 401).kind).toBe('retry');
    expect(classifyError({ code: '23505' }, 409).kind).toBe('unique');
    expect(classifyError({ code: '23514' }, 400).kind).toBe('rejected');
    expect(classifyError({ code: '42501' }, 403).kind).toBe('rejected');
  });
});
