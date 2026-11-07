import { describe, expect, it, vi } from 'vitest';
import {
  clockDiffMinutes, formatClock, legDepartureISO, legLabel, lookupFlight, LookupError, scheduleWarning,
} from '../flightLookup';
import type { LookupLeg } from '../flightLookup';

const leg = (o: string, d: string, dep: string, arr: string, extra: Partial<LookupLeg> = {}): LookupLeg => ({
  origin: o, dest: d, dep_time: dep, arr_time: arr, arr_next_day: false, operating_airline: 'UA',
  operating_airline_name: 'United Airlines', operating_flight_number: 'UA648', days_seen: 50, ...extra,
});
const lookup = { flight: 'UA648', schedule_as_of: '2026-08', matches: [leg('EWR', 'SFO', '06:00', '09:31')] };

describe('formatting', () => {
  it('formats clock times', () => {
    expect(formatClock('06:00')).toBe('6:00 AM');
    expect(formatClock('00:05')).toBe('12:05 AM');
    expect(formatClock('12:00')).toBe('12:00 PM');
    expect(formatClock('23:45')).toBe('11:45 PM');
  });
  it('builds the card label', () => {
    expect(legLabel('UA648', lookup.matches[0])).toBe('UA648 · EWR → SFO · 6:00 AM → 9:31 AM');
    expect(legDepartureISO('2026-11-10', lookup.matches[0])).toBe('2026-11-10T06:00:00');
  });
  it('measures clock distance across midnight', () => {
    expect(clockDiffMinutes('23:30', '00:30')).toBe(60);
    expect(clockDiffMinutes('06:00', '07:00')).toBe(60);
  });
});

describe('scheduleWarning', () => {
  it('is silent within 60 minutes (inclusive)', () => {
    expect(scheduleWarning(lookup, 'EWR', 'SFO', '06:00')).toBeNull();
    expect(scheduleWarning(lookup, 'EWR', 'SFO', '07:00')).toBeNull();
    expect(scheduleWarning(lookup, '', '', '05:30')).toBeNull();
  });
  it('warns beyond 60 minutes and names the schedule', () => {
    const w = scheduleWarning(lookup, 'EWR', 'SFO', '07:01');
    expect(w).toContain('6:00 AM');
    expect(w).toContain('7:01 AM');
    expect(w).toContain('2026-08');
  });
  it('compares against the nearest frequency', () => {
    const two = { ...lookup, matches: [leg('JFK', 'LAX', '07:15', '10:40'), leg('JFK', 'LAX', '18:15', '21:40')] };
    expect(scheduleWarning(two, 'JFK', 'LAX', '18:00')).toBeNull();
    expect(scheduleWarning(two, 'JFK', 'LAX', '12:00')).toContain('7:15 AM or 6:15 PM');
  });
  it('flags airports the flight does not fly, and is silent with no time', () => {
    expect(scheduleWarning(lookup, 'LAX', 'SFO', '06:00')).toContain('usually flies EWR → SFO');
    expect(scheduleWarning(lookup, 'EWR', 'SFO', '')).toBeNull();
  });
});

describe('lookupFlight', () => {
  const resp = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  it('calls the API and returns matches', async () => {
    const f = resp(200, { ...lookup, matches: lookup.matches });
    const r = await lookupFlight('UA', '648', '2026-11-10', f as any, 'http://api');
    expect(f.mock.calls[0][0]).toBe('http://api/flights/lookup?flight=UA648&date=2026-11-10');
    expect(r.matches).toHaveLength(1);
  });
  it('surfaces the server message on 404 and 410', async () => {
    const f = resp(410, { detail: { reason: 'airline_defunct', message: 'Spirit Airlines no longer operates' } });
    await expect(lookupFlight('NK', '1', '2026-11-10', f as any, 'http://api'))
      .rejects.toMatchObject({ status: 410, reason: 'airline_defunct', message: 'Spirit Airlines no longer operates' });
  });
  it('turns network failure and empty matches into LookupError', async () => {
    await expect(lookupFlight('UA', '1', '2026-11-10', vi.fn().mockRejectedValue(new Error('x')) as any))
      .rejects.toBeInstanceOf(LookupError);
    await expect(lookupFlight('UA', '1', '2026-11-10', resp(200, { matches: [] }) as any))
      .rejects.toMatchObject({ status: 404 });
  });
});
