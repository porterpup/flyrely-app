import { describe, expect, it } from 'vitest';
import { NEITHER_MESSAGE, planAddFlight, shiftClock } from '../addFlightForm';
import type { AddFlightFields } from '../addFlightForm';

const blank: AddFlightFields = { flightNumber: '', airlineCode: '', date: '2026-11-17', origin: '', dest: '', departureTime: '' };
const plan = (over: Partial<AddFlightFields>) => planAddFlight({ ...blank, ...over });

describe('planAddFlight (either-or)', () => {
  it('passes with a flight number only', () => {
    expect(plan({ flightNumber: 'UA648' })).toEqual({ kind: 'number', airline: 'UA', number: '648' });
  });

  it('passes with bare digits once an airline is chosen', () => {
    expect(plan({ flightNumber: '648', airlineCode: 'UA' })).toEqual({ kind: 'number', airline: 'UA', number: '648' });
  });

  it('passes with route and departure time only', () => {
    expect(plan({ origin: 'EWR', dest: 'SFO', departureTime: '12:30' })).toEqual({
      kind: 'route', origin: 'EWR', dest: 'SFO', departureTime: '12:30',
    });
  });

  it('uses the flight number when both are filled', () => {
    expect(plan({ flightNumber: 'UA648', origin: 'EWR', dest: 'SFO', departureTime: '12:30' }).kind).toBe('number');
  });

  it('fails with neither, naming both options', () => {
    expect(plan({})).toEqual({ kind: 'error', message: NEITHER_MESSAGE });
    expect(NEITHER_MESSAGE).toBe('Enter a flight number, or choose From, To and a departure time.');
  });

  it('fails a partial route and names what is missing', () => {
    expect(plan({ origin: 'EWR', dest: 'SFO' })).toEqual({
      kind: 'error', message: 'Add a departure time to search by route, or enter a flight number instead.',
    });
    expect(plan({ origin: 'EWR', departureTime: '12:30' })).toMatchObject({ kind: 'error', message: expect.stringContaining('Add To ') });
    expect(plan({ departureTime: '12:30' })).toMatchObject({ kind: 'error', message: expect.stringContaining('Add From and To ') });
  });

  it('does not treat a half-typed airport as filled', () => {
    expect(plan({ origin: 'EW', dest: 'SFO', departureTime: '12:30' }).kind).toBe('error');
  });

  it('flags an unusable flight number instead of falling back to the route', () => {
    const route = { origin: 'EWR', dest: 'SFO', departureTime: '12:30' };
    expect(plan({ flightNumber: 'ZZZ', ...route })).toMatchObject({ kind: 'error', message: expect.stringContaining('valid flight number') });
    expect(plan({ flightNumber: '648', ...route })).toMatchObject({ kind: 'error', message: expect.stringContaining('Choose the airline') });
  });

  it('needs the shared date for either way', () => {
    expect(plan({ flightNumber: 'UA648', date: '' })).toEqual({ kind: 'error', message: 'Pick the flight date.' });
    expect(plan({ origin: 'EWR', dest: 'SFO', departureTime: '12:30', date: '' })).toEqual({ kind: 'error', message: 'Pick the flight date.' });
  });
});

describe('planAddFlight extras', () => {
  it('requires a 2-character code for "Other airline"', () => {
    expect(plan({ flightNumber: '648', airlineCode: 'Q', otherAirline: true })).toEqual({
      kind: 'error', message: 'Enter the 2-character airline code, e.g. HA.',
    });
    expect(plan({ flightNumber: '648', airlineCode: 'QX', otherAirline: true })).toEqual({ kind: 'number', airline: 'QX', number: '648' });
  });

  it('lets a connecting flight search by route without a time', () => {
    expect(plan({ origin: 'EWR', dest: 'SFO', timeOptional: true })).toEqual({ kind: 'route', origin: 'EWR', dest: 'SFO', departureTime: '' });
    expect(plan({ origin: 'EWR', timeOptional: true })).toMatchObject({ kind: 'error', message: expect.stringContaining('Add To') });
    expect(plan({ origin: 'EWR', dest: 'SFO' }).kind).toBe('error');
  });
});

describe('shiftClock', () => {
  it('shifts and clamps within the day', () => {
    expect(shiftClock('12:30', -60)).toBe('11:30');
    expect(shiftClock('12:30', 60)).toBe('13:30');
    expect(shiftClock('00:20', -60)).toBe('00:00');
    expect(shiftClock('23:40', 60)).toBe('23:59');
  });
});
