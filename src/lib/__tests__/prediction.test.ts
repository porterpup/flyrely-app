import { describe, it, expect, vi, afterEach } from 'vitest';
import { predictionFields, refreshDueFlights, rescoreFlight } from '../prediction';
import { flyrelyApi, type PredictResponse } from '../api';
import { formatCheckedAgo } from '../utils';
import type { Flight } from '~/types';

const flight = (id: string): Flight => ({
  id,
  flightNumber: 'DL100',
  airline: { code: 'DL', name: 'Delta' },
  origin: { code: 'JFK', name: 'JFK', city: 'New York' },
  destination: { code: 'LAX', name: 'LAX', city: 'Los Angeles' },
  scheduledDeparture: '2030-01-01T10:00',
  status: 'scheduled',
  riskLevel: 'low',
});

const response = {
  risk_level: 'medium',
  delay_probability: 0.25,
  risk_factors: ['Busy hub', 'Evening rush', 'Third'],
  warnings: ['Tight'],
  delay_severity: null,
} as unknown as PredictResponse;

afterEach(() => vi.restoreAllMocks());

describe('predictionFields', () => {
  it('maps the API response onto flight fields', () => {
    const f = predictionFields(response);
    expect(f.riskLevel).toBe('medium');
    expect(f.delayProbability).toBe(0.25);
    expect(f.delayReason).toBe('Busy hub • Evening rush');
    expect(f.warnings).toEqual(['Tight']);
    expect(f.delaySeverity).toBeUndefined();
  });
});

describe('rescoreFlight', () => {
  it('stamps lastCheckedAt', async () => {
    vi.spyOn(flyrelyApi, 'predict').mockResolvedValue(response);
    const out = await rescoreFlight(flight('a'));
    expect(out.riskLevel).toBe('medium');
    expect(Date.now() - (out.lastCheckedAt ?? 0)).toBeLessThan(1000);
  });
});

describe('refreshDueFlights', () => {
  it('rescores only due flights, at most 3, and ignores errors', async () => {
    const predict = vi.spyOn(flyrelyApi, 'predict').mockResolvedValue(response);
    predict.mockRejectedValueOnce(new Error('down'));
    const flights = ['a', 'b', 'c', 'd', 'e', 'f'].map(flight);
    const due = new Set(['a', 'b', 'c', 'd', 'e']);
    const saved: string[] = [];
    const n = await refreshDueFlights(flights, (f) => due.has(f.id), rescoreFlight, (f) => saved.push(f.id));
    expect(n).toBe(3);
    expect(predict).toHaveBeenCalledTimes(3);
    expect(saved).toEqual(['b', 'c']);
  });
});

describe('formatCheckedAgo', () => {
  const now = new Date('2026-11-10T12:00:00Z').getTime();
  it('bands', () => {
    expect(formatCheckedAgo(now - 30_000, now)).toBe('just now');
    expect(formatCheckedAgo(now, now)).toBe('just now');
    expect(formatCheckedAgo(now - 12 * 60_000, now)).toBe('12 min ago');
    expect(formatCheckedAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(formatCheckedAgo(now - 30 * 3_600_000, now)).toBe('yesterday');
    expect(formatCheckedAgo(now - 5 * 86_400_000, now)).toMatch(/Nov/);
  });
});
