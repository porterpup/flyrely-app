import { describe, it, expect } from 'vitest';
import { localToUtcMs, departureMs, arrivalMs, isDeparted, formatCountdown } from '../flightTime';
import type { Flight } from '~/types';

const flight = (origin: string, dep: string, extra: Partial<Flight> = {}): Flight =>
  ({ origin: { code: origin }, destination: { code: 'JFK' }, scheduledDeparture: dep, ...extra }) as Flight;

const utc = (s: string) => Date.parse(s);

describe('localToUtcMs', () => {
  it('handles standard time', () => {
    expect(localToUtcMs('2026-01-15T08:00', 'America/Los_Angeles')).toBe(utc('2026-01-15T16:00:00Z'));
  });
  it('handles the fall-back day (JFK 2026-11-01 01:30 is ambiguous; first occurrence is EDT)', () => {
    expect(localToUtcMs('2026-11-01T01:30:00', 'America/New_York')).toBe(utc('2026-11-01T05:30:00Z'));
    expect(localToUtcMs('2026-11-01T03:30:00', 'America/New_York')).toBe(utc('2026-11-01T08:30:00Z'));
  });
  it('handles the spring-forward day', () => {
    expect(localToUtcMs('2026-03-08T03:30:00', 'America/New_York')).toBe(utc('2026-03-08T07:30:00Z'));
    expect(localToUtcMs('2026-03-08T01:30:00', 'America/New_York')).toBe(utc('2026-03-08T06:30:00Z'));
  });
  it('returns NaN for garbage', () => {
    expect(localToUtcMs('nope', 'America/New_York')).toBeNaN();
  });
});

describe('isDeparted', () => {
  const lax = flight('LAX', '2026-06-10T08:00:00');
  it('is upcoming at 06:00 PT and departed at 08:01 PT', () => {
    expect(isDeparted(lax, utc('2026-06-10T13:00:00Z'))).toBe(false);
    expect(isDeparted(lax, utc('2026-06-10T15:01:00Z'))).toBe(true);
  });
  it('is not fooled by a phone in another zone (05:00 PT, device on New York time)', () => {
    // Old bug: 08:00 read as New York time = 12:00 UTC, so 05:00 PT (12:00 UTC) looked "departed".
    const nowMs = utc('2026-06-10T12:00:00Z');
    expect(isDeparted(lax, nowMs, 'America/New_York')).toBe(false);
  });
  it('falls back to the supplied/device zone for unknown airports without throwing', () => {
    const f = flight('ZZZ', '2026-06-10T08:00:00');
    expect(departureMs(f, 'America/Chicago')).toBe(utc('2026-06-10T13:00:00Z'));
    expect(Number.isNaN(departureMs(f))).toBe(false);
  });
});

describe('arrivalMs', () => {
  it('uses the destination zone', () => {
    const f = flight('LAX', '2026-06-10T08:00:00', { scheduledArrivalLocal: '2026-06-10T16:30:00' });
    expect(arrivalMs(f)).toBe(utc('2026-06-10T20:30:00Z'));
    expect(arrivalMs(flight('LAX', '2026-06-10T08:00:00'))).toBeUndefined();
  });
});

describe('formatCountdown', () => {
  const tz = 'America/New_York';
  const now = utc('2026-06-10T14:00:00Z'); // 10:00 AM EDT
  const dep = (iso: string) => utc(iso);
  it('days', () => expect(formatCountdown(dep('2026-06-15T14:00:00Z'), now, tz)).toBe('In 5 days'));
  it('tomorrow', () => expect(formatCountdown(localToUtcMs('2026-06-11T14:30', tz), now, tz)).toBe('Tomorrow at 2:30 PM'));
  it('hours and minutes', () => expect(formatCountdown(now + (3 * 60 + 20) * 60_000, now, tz)).toBe('Leaves in 3 h 20 min'));
  it('minutes', () => expect(formatCountdown(now + 42 * 60_000, now, tz)).toBe('Leaves in 42 min'));
  it('departed', () => expect(formatCountdown(now - 1000, now, tz)).toBe('Departed'));
});

describe('formatCountdown edge bands', () => {
  const tz = 'America/Los_Angeles';
  it('uses a countdown for a late-night flight within 12 h', () => {
    const now = localToUtcMs('2026-06-10T23:00', tz);
    expect(formatCountdown(localToUtcMs('2026-06-11T01:00', tz), now, tz)).toBe('Leaves in 2 h 0 min');
  });
  it('rolls minutes over cleanly', () => {
    const now = utc('2026-06-10T14:00:00Z');
    expect(formatCountdown(now + 59 * 60_000 + 30_000, now, tz)).toBe('Leaves in 59 min');
    expect(formatCountdown(now + 60 * 60_000, now, tz)).toBe('Leaves in 1 h 0 min');
  });
});
