import { describe, it, expect } from 'vitest';
import { airportMct, assessConnection, isSeparateAirlines, minConnectMinutes } from '../mct';

describe('airport MCT table (matches flyrely-api models/mct_defaults.csv)', () => {
  it('uses 50/40/35/30 by class', () => {
    for (const c of 'ATL ORD DFW DEN LAX JFK EWR IAH SFO CLT'.split(' ')) expect(airportMct(c)).toBe(50);
    expect(airportMct('PHX')).toBe(40);
    expect(airportMct('BNA')).toBe(40);
    expect(airportMct('MDW')).toBe(35);
    expect(airportMct('SAT')).toBe(35);
    expect(airportMct('OAK')).toBe(30);
    expect(airportMct('DSM')).toBe(30);
    expect(airportMct('ZZZ')).toBe(30);
    expect(airportMct('den')).toBe(50);
  });
  it('adds 30 for different airlines, and treats HA as AS', () => {
    expect(minConnectMinutes('ORD', 'UA', 'UA')).toBe(50);
    expect(minConnectMinutes('ORD', 'UA', 'AA')).toBe(80);
    expect(minConnectMinutes('SEA', 'HA', 'AS')).toBe(40);
    expect(isSeparateAirlines('HA', 'AS')).toBe(false);
    expect(isSeparateAirlines('UA', undefined)).toBe(false);
  });
});

describe('assessConnection', () => {
  it('tight: under the MCT', () => {
    const a = assessConnection(45, 'ORD', 'Chicago', 'UA', 'UA');
    expect(a.level).toBe('tight');
    expect(a.message).toBe('Tight connection: 45 min in Chicago. We recommend at least 50 min here.');
    expect(a.separateNote).toBeNull();
  });
  it('short: MCT up to MCT+14', () => {
    const a = assessConnection(55, 'DEN', 'Denver', 'UA', 'UA');
    expect(a.level).toBe('short');
    expect(a.message).toBe('Short connection: 55 min in Denver. Usually OK if your first flight is on time.');
    expect(assessConnection(50, 'DEN', 'Denver', 'UA', 'UA').level).toBe('short');
    expect(assessConnection(64, 'DEN', 'Denver', 'UA', 'UA').level).toBe('short');
    expect(assessConnection(65, 'DEN', 'Denver', 'UA', 'UA').level).toBe('ok');
    expect(assessConnection(49, 'DEN', 'Denver', 'UA', 'UA').level).toBe('tight');
  });
  it('comfortable and unknown connections have no headline', () => {
    expect(assessConnection(90, 'DEN', 'Denver', 'UA', 'UA')).toMatchObject({ level: 'ok', message: null, separateNote: null });
    expect(assessConnection(null, 'DEN', 'Denver', 'UA', 'UA')).toMatchObject({ level: 'unknown', message: null });
  });
  it('westbound short hop (small airport, 30 min MCT)', () => {
    expect(assessConnection(35, 'OAK', 'Oakland', 'WN', 'WN').level).toBe('short');
    expect(assessConnection(25, 'OAK', 'Oakland', 'WN', 'WN').level).toBe('tight');
  });
  it('overnight layover is comfortable', () => {
    expect(assessConnection(14 * 60, 'ORD', 'Chicago', 'UA', 'UA').level).toBe('ok');
  });
  it('different airlines raise the bar and always add the separate-airlines note', () => {
    const a = assessConnection(70, 'ORD', 'Chicago', 'UA', 'AA');
    expect(a.level).toBe('tight');
    expect(a.message).toBe('Tight connection: 1 h 10 min in Chicago. We recommend at least 1 h 20 min here.');
    expect(a.separateNote).toBe("Separate airlines: if your first flight is late, the second won't wait. Allow at least 2–3 hours.");
    expect(assessConnection(300, 'ORD', 'Chicago', 'UA', 'AA')).toMatchObject({ level: 'ok', separateAirlines: true });
    expect(assessConnection(300, 'ORD', 'Chicago', 'UA', 'AA').separateNote).toMatch(/^Separate airlines/);
    expect(assessConnection(null, 'ORD', 'Chicago', 'UA', 'AA').separateNote).toMatch(/^Separate airlines/);
  });
});
