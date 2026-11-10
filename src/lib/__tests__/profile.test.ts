import { describe, expect, it } from 'vitest';
import {
  PROFILE_AIRLINES, airportError, normalizeAirline, normalizeAirport, profileFromMetadata, profileToMetadata,
} from '../profile';

describe('profile', () => {
  it('offers no NK or HA', () => {
    const codes = PROFILE_AIRLINES.map((a) => a.code);
    expect(codes).not.toContain('NK');
    expect(codes).not.toContain('HA');
    expect(codes).toContain('AS');
  });
  it('maps HA to AS and rejects NK and junk', () => {
    expect(normalizeAirline('ha')).toBe('AS');
    expect(normalizeAirline('NK')).toBeNull();
    expect(normalizeAirline('ZZ')).toBeNull();
    expect(normalizeAirline(5)).toBeNull();
  });
  it('validates airports against the reference list', () => {
    expect(normalizeAirport(' jfk ')).toBe('JFK');
    expect(normalizeAirport('XXX')).toBeNull();
    expect(normalizeAirport('JFKX')).toBeNull();
    expect(airportError('')).toBeNull();
    expect(airportError('XXX')).toMatch(/recognise/);
  });
  it('reads metadata defensively and writes snake_case', () => {
    expect(profileFromMetadata({ home_airport: 'sfo', preferred_airline: 'HA' })).toEqual({ homeAirport: 'SFO', preferredAirline: 'AS' });
    expect(profileFromMetadata({ home_airport: 'nope', preferred_airline: 42 })).toEqual({ homeAirport: null, preferredAirline: null });
    expect(profileFromMetadata(undefined)).toEqual({ homeAirport: null, preferredAirline: null });
    expect(profileToMetadata({ homeAirport: 'SFO', preferredAirline: null })).toEqual({ home_airport: 'SFO', preferred_airline: null });
  });
});
