import { describe, expect, it } from 'vitest';
import { searchAirports } from '../airports';

describe('searchAirports', () => {
  it('finds airports outside the short list by code', () => {
    const r = searchAirports('bhm');
    expect(r[0]).toMatchObject({ code: 'BHM', city: 'Birmingham' });
  });
  it('finds by city prefix', () => {
    expect(searchAirports('birm').map((a) => a.code)).toContain('BHM');
  });
  it('keeps short-list matches first, without duplicates', () => {
    const r = searchAirports('atl');
    expect(r[0].code).toBe('ATL');
    expect(new Set(r.map((a) => a.code)).size).toBe(r.length);
    expect(r.length).toBeLessThanOrEqual(6);
  });
});
