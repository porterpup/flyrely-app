import { describe, expect, it, vi } from 'vitest';
import { buildFeedbackContext, flightIdFromPath, sendFeedback, listFeedback, FeedbackError } from '../feedback';
import type { Flight } from '~/types';

const flight = {
  id: 'f1',
  flightNumber: 'UA123',
  airline: { code: 'UA', name: 'United' },
  origin: { code: 'SFO', name: '', city: '' },
  destination: { code: 'JFK', name: '', city: '' },
  scheduledDeparture: '2026-12-01T09:00:00',
  status: 'scheduled',
  riskLevel: 'medium',
  delayProbability: 0.42,
} as Flight;

describe('flightIdFromPath', () => {
  it('extracts ids from flight screens only', () => {
    expect(flightIdFromPath('/flights/f1')).toBe('f1');
    expect(flightIdFromPath('/flights/f1/edit')).toBe('f1');
    expect(flightIdFromPath('/flights/add')).toBeNull();
    expect(flightIdFromPath('/flights/history')).toBeNull();
    expect(flightIdFromPath('/account')).toBeNull();
  });
});

describe('buildFeedbackContext', () => {
  it('attaches the shown flight and prediction on a flight screen', () => {
    const ctx = buildFeedbackContext('/flights/f1', { lookup: () => flight, appVersion: 'v1', userAgent: 'UA' });
    expect(ctx).toEqual({
      route: '/flights/f1',
      flight: {
        airline: 'UA', flight_number: 'UA123', origin: 'SFO', destination: 'JFK',
        departure_time: '2026-12-01T09:00:00', delay_probability: 0.42, risk_level: 'medium',
      },
      app_version: 'v1',
      user_agent: 'UA',
    });
  });
  it('has no flight elsewhere or when the flight is unknown', () => {
    expect(buildFeedbackContext('/account', { lookup: () => flight }).flight).toBeUndefined();
    expect(buildFeedbackContext('/flights/zzz', { lookup: () => null }).flight).toBeUndefined();
    expect(buildFeedbackContext('/flights/f1', { lookup: () => { throw new Error('x'); } }).route).toBe('/flights/f1');
  });
});

describe('sendFeedback', () => {
  it('posts with the bearer token and trimmed message', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    await sendFeedback({ message: ' hi ', category: 'bug', context: { route: '/' } }, f as never, async () => 'tok');
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/feedback$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ message: 'hi', category: 'bug', context: { route: '/' } });
  });
  it('omits an empty category and maps errors', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(sendFeedback({ message: 'x', category: '', context: { route: '/' } }, f as never, async () => 't'))
      .rejects.toMatchObject({ status: 429 });
    expect(JSON.parse(f.mock.calls[0][1].body).category).toBeUndefined();
  });
});

describe('listFeedback', () => {
  it('reports 403 as Admin only', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const err = await listFeedback(f as never, async () => 't').catch((e) => e);
    expect(err).toBeInstanceOf(FeedbackError);
    expect(err.status).toBe(403);
    expect(err.message).toBe('Admin only');
  });
});
