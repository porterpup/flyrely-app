// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { LookupLeg, LookupResponse } from '~/lib/flightLookup';

const navigate = vi.fn();
const rescoreFlight = vi.fn();
const saveFlight = vi.fn();
const getFlights = vi.fn();
const emitNotice = vi.fn();

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('~/lib/prediction', () => ({ rescoreFlight: (f: unknown) => rescoreFlight(f) }));
vi.mock('~/lib/flightStore', () => ({
  saveFlight: (f: unknown) => saveFlight(f),
  getFlights: () => getFlights(),
  getFlightById: () => undefined,
  getTripById: () => undefined,
  createTrip: () => ({ ok: true }),
  appendLeg: () => ({ ok: true }),
}));
vi.mock('~/lib/syncEngine', async (orig) => ({
  ...(await orig<typeof import('~/lib/syncEngine')>()),
  emitNotice: (m: string) => emitNotice(m),
}));

import { useTrackFlight, autoTrackSingle } from '../useTrackFlight';

const leg = (o: string, d: string, dep: string): LookupLeg => ({
  origin: o, dest: d, dep_time: dep, arr_time: '09:30', arr_next_day: false, operating_airline: 'AA',
  operating_airline_name: 'American Airlines', operating_flight_number: 'AA100', days_seen: 50,
});
const lookup = (matches: LookupLeg[]): LookupResponse => ({
  flight: 'AA100', airline: 'AA', flight_number: '100', date: '2030-01-02', matches,
  source: 's', confidence: 'c', schedule_as_of: null, note: '',
});

beforeEach(() => {
  vi.clearAllMocks();
  getFlights.mockReturnValue([]);
  rescoreFlight.mockImplementation(async (f) => f);
});

describe('autoTrackSingle', () => {
  it('tracks immediately when there is exactly one leg', async () => {
    const { result } = renderHook(() => useTrackFlight());
    const p = autoTrackSingle(lookup([leg('JFK', 'LAX', '06:00')]), '2030-01-02', result.current);
    expect(p).not.toBeNull();
    expect(await p).toBeNull();
    expect(saveFlight).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/flights/$flightId', search: { added: '1' } }));
  });
  it('does nothing when there is a choice to make', () => {
    const track = vi.fn();
    expect(autoTrackSingle(lookup([leg('JFK', 'LAX', '06:00'), leg('LAX', 'SFO', '12:00')]), '2030-01-02', track)).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('useTrackFlight', () => {
  it('goes to the existing flight with a notice when already tracked', async () => {
    const { result } = renderHook(() => useTrackFlight());
    const input = { airline: 'AA', number: '100', depISO: '2030-01-02T06:00:00', origin: 'JFK', dest: 'LAX' };
    await result.current(input);
    const saved = saveFlight.mock.calls[0][0];
    vi.clearAllMocks();
    getFlights.mockReturnValue([saved]);
    expect(await result.current(input)).toBeNull();
    expect(saveFlight).not.toHaveBeenCalled();
    expect(emitNotice).toHaveBeenCalledWith('You already track AA100.');
    expect(navigate).toHaveBeenCalledWith({ to: '/flights/$flightId', params: { flightId: saved.id } });
  });
  it('returns a message instead of throwing when the prediction fails', async () => {
    rescoreFlight.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useTrackFlight());
    const msg = await result.current({ airline: 'AA', number: '100', depISO: '2030-01-02T06:00:00', origin: 'JFK', dest: 'LAX' });
    expect(msg).toMatch(/Could not get prediction/);
    expect(saveFlight).not.toHaveBeenCalled();
  });
});
