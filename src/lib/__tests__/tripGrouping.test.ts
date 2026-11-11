import { describe, it, expect } from 'vitest';
import {
  canChain,
  dismissKeysFor,
  formatLayover,
  layoverMinutes,
  suggestTrips,
  tripTitle,
  tripToItineraryRequest,
  validateTripLegs,
} from '../tripGrouping';
import { makeFlight } from './memStorage';
import type { Flight } from '~/types';

const ap = (code: string) => ({ code, name: code, city: code });

function fl(id: string, from: string, to: string, dep: string, arr?: string, over: Partial<Flight> = {}): Flight {
  return makeFlight({
    id,
    flightNumber: `UA${id.replace(/\D/g, '') || '1'}`,
    origin: ap(from),
    destination: ap(to),
    scheduledDeparture: dep,
    ...(arr ? { scheduledArrivalLocal: arr } : {}),
    ...over,
  });
}

const A = fl('f1', 'SFO', 'DEN', '2026-12-03T07:10:00', '2026-12-03T10:42:00');
const B = fl('f2', 'DEN', 'BNA', '2026-12-03T11:35:00', '2026-12-03T15:05:00');

describe('layover and validation', () => {
  it('measures layover in the hub local time', () => {
    expect(layoverMinutes(A, B)).toBe(53);
    expect(layoverMinutes(fl('x', 'SFO', 'DEN', '2026-12-03T07:10:00'), B)).toBeNull();
    expect(formatLayover(53)).toBe('53 min');
    expect(formatLayover(65)).toBe('1 h 5 min');
    expect(formatLayover(120)).toBe('2 h');
  });

  it('accepts a connected chain of 2-4 legs', () => {
    expect(validateTripLegs([A, B]).ok).toBe(true);
  });

  it('rejects not-connected, bad layovers and wrong leg counts', () => {
    expect(validateTripLegs([A])).toMatchObject({ ok: false, reason: 'too_few' });
    expect(validateTripLegs([A, fl('f3', 'ORD', 'BNA', '2026-12-03T12:00:00')])).toMatchObject({ ok: false, reason: 'not_connected', index: 0 });
    expect(validateTripLegs([A, fl('f3', 'DEN', 'BNA', '2026-12-03T10:00:00')])).toMatchObject({ ok: false, reason: 'invalid_layover' });
    expect(validateTripLegs([A, fl('f3', 'DEN', 'BNA', '2026-12-04T11:00:00')])).toMatchObject({ ok: false, reason: 'invalid_layover' });
    const five = [A, B, fl('f3', 'BNA', 'ATL', '2026-12-03T16:00:00'), fl('f4', 'ATL', 'MIA', '2026-12-03T18:00:00'), fl('f5', 'MIA', 'JFK', '2026-12-03T20:00:00')];
    expect(validateTripLegs(five)).toMatchObject({ ok: false, reason: 'too_many' });
  });

  it('allows a through flight (same number) as consecutive legs', () => {
    const t1 = fl('f1', 'SFO', 'DEN', '2026-12-03T07:10:00', '2026-12-03T10:42:00', { flightNumber: 'UA10' });
    const t2 = fl('f2', 'DEN', 'BNA', '2026-12-03T11:35:00', undefined, { flightNumber: 'UA10' });
    expect(validateTripLegs([t1, t2]).ok).toBe(true);
  });
});

describe('suggestTrips', () => {
  it('chains A -> B', () => {
    const s = suggestTrips([B, A]);
    expect(s).toHaveLength(1);
    expect(s[0].legs.map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it('does not suggest a return flight (SFO-DEN, DEN-SFO)', () => {
    const back = fl('f9', 'DEN', 'SFO', '2026-12-03T12:00:00', '2026-12-03T13:30:00');
    expect(suggestTrips([A, back])).toEqual([]);
    expect(canChain(A, back)).toBe(false);
  });

  it('uses the 6 hour window after landing', () => {
    const at6 = fl('g', 'DEN', 'BNA', '2026-12-03T16:42:00'); // exactly 6 h after landing
    const over = fl('h', 'DEN', 'BNA', '2026-12-03T16:43:00');
    expect(canChain(A, at6)).toBe(true);
    expect(canChain(A, over)).toBe(false);
    expect(canChain(A, fl('i', 'DEN', 'BNA', '2026-12-03T10:42:00'))).toBe(false); // 0 layover
  });

  it('uses the 12 hour window after departure when the arrival is unknown', () => {
    const noArr = fl('n1', 'SFO', 'DEN', '2026-12-03T07:10:00');
    expect(canChain(noArr, fl('n2', 'DEN', 'BNA', '2026-12-03T19:10:00'))).toBe(true);
    expect(canChain(noArr, fl('n3', 'DEN', 'BNA', '2026-12-03T19:11:00'))).toBe(false);
  });

  it('handles an overnight arrival (arr_next_day)', () => {
    const red = fl('r1', 'SFO', 'JFK', '2026-12-03T22:00:00', '2026-12-04T06:30:00');
    const next = fl('r2', 'JFK', 'BOS', '2026-12-04T08:00:00');
    const tooEarly = fl('r3', 'JFK', 'BOS', '2026-12-03T23:00:00');
    expect(canChain(red, next)).toBe(true);
    expect(canChain(red, tooEarly)).toBe(false);
  });

  it('caps chains at 4 legs', () => {
    const legs = [
      fl('a1', 'AAA', 'BBB', '2026-12-03T06:00:00', '2026-12-03T07:00:00'),
      fl('a2', 'BBB', 'CCC', '2026-12-03T08:00:00', '2026-12-03T09:00:00'),
      fl('a3', 'CCC', 'DDD', '2026-12-03T10:00:00', '2026-12-03T11:00:00'),
      fl('a4', 'DDD', 'EEE', '2026-12-03T12:00:00', '2026-12-03T13:00:00'),
      fl('a5', 'EEE', 'FFF', '2026-12-03T14:00:00', '2026-12-03T15:00:00'),
    ];
    const s = suggestTrips(legs);
    expect(s[0].legs).toHaveLength(4);
    expect(s).toHaveLength(1); // the 5th flight alone is not a trip
  });

  it('respects dismissed pairs and ignores flights already in a trip', () => {
    expect(suggestTrips([A, B], dismissKeysFor([A, B]))).toEqual([]);
    expect(suggestTrips([A, { ...B, tripId: 't' }])).toEqual([]);
  });
});

describe('titles', () => {
  it('uses the name or lists every airport', () => {
    expect(tripTitle({}, [A, B])).toBe('SFO → DEN → BNA');
    expect(tripTitle({ name: 'Home for the holidays' }, [A, B])).toBe('Home for the holidays');
  });
});

describe('tripToItineraryRequest', () => {
  it('matches the POST /predict/itinerary JSON shape exactly', () => {
    const legs = [
      { ...B, legIndex: 1, connectMctOverride: 50 },
      { ...A, legIndex: 0 },
    ];
    expect(tripToItineraryRequest({ id: 'trip-123' }, legs)).toEqual({
      itinerary_id: 'trip-123',
      legs: [
        { flight_id: 'f1', flight_number: 'UA1', airline: 'UA', origin: 'SFO', destination: 'DEN',
          departure_time: '2026-12-03T07:10:00', arrival_time: '2026-12-03T10:42:00' },
        { flight_id: 'f2', flight_number: 'UA2', airline: 'UA', origin: 'DEN', destination: 'BNA',
          departure_time: '2026-12-03T11:35:00', arrival_time: '2026-12-03T15:05:00' },
      ],
      connections: [{ min_connect_minutes: 50 }],
    });
  });

  it('gives an empty connection object when there is no override', () => {
    const req = tripToItineraryRequest({ id: 't' }, [{ ...A, legIndex: 0 }, { ...B, legIndex: 1 }]);
    expect(req.connections).toEqual([{}]);
  });
});
