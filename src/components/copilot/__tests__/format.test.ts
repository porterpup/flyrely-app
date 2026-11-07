import { describe, expect, it } from 'vitest';
import { formatAlternativesWhen } from '../format';

const now = new Date(2026, 10, 15, 9, 0); // Nov 15 2026, device local

describe('formatAlternativesWhen', () => {
  it('says today, tomorrow, or the weekday and date', () => {
    expect(formatAlternativesWhen('2026-11-15', now)).toBe('today');
    expect(formatAlternativesWhen('2026-11-16', now)).toBe('tomorrow');
    expect(formatAlternativesWhen('2026-11-21', now)).toBe('on Sat, Nov 21');
    expect(formatAlternativesWhen('2026-11-14', now)).toBe('on Sat, Nov 14');
  });

  it('handles month ends', () => {
    expect(formatAlternativesWhen('2026-12-01', new Date(2026, 10, 30))).toBe('tomorrow');
  });
});
