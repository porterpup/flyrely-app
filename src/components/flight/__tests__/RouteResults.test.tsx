// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouteResults } from '../RouteResults';
import type { SearchFlight } from '~/lib/flightLookup';

const f = (flight: string, dep: string, arr: string, p: number, risk: SearchFlight['risk_level'], op = 'UA'): SearchFlight => ({
  flight, airline: flight.slice(0, 2), airline_name: 'United Airlines', flight_number: flight.slice(2),
  origin: 'EWR', dest: 'SFO', dep_time: dep, arr_time: arr, arr_next_day: false, operating_airline: op,
  operating_airline_name: op === 'UA' ? 'United Airlines' : 'SkyWest Airlines', operating_flight_number: flight,
  days_seen: 40, delay_probability: p, risk_level: risk,
});

afterEach(cleanup);

describe('RouteResults', () => {
  const flights = [f('UA900', '18:00', '21:30', 0.32, 'high', 'OO'), f('UA648', '06:00', '09:31', 0.18, 'low')];

  it('lists flights by departure with delay chance and the schedule label', () => {
    render(<RouteResults flights={flights} asOf="2026-08" onPick={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].getAttribute('aria-label')).toContain('UA648');
    expect(buttons[1].getAttribute('aria-label')).toContain('UA900');
    expect(screen.getByText(/Based on recent schedules/)).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('title')).toMatch(/Confirm the time on your booking/);
    expect(screen.getByText('18% chance of a 15+ min delay')).toBeTruthy();
    expect(screen.getAllByText('Low risk').length).toBeGreaterThan(0);
    expect(screen.queryByText(/On track/)).toBeNull();
    expect(screen.getByText(/operated by SkyWest/)).toBeTruthy();
  });

  it('shows the top two reasons when the API sends them, and none otherwise', () => {
    const withWhy = { ...f('UA648', '06:00', '09:31', 0.07, 'low'), risk_factors: ['Early-morning flights are rarely delayed', 'EWR is a busy airport', 'third'] };
    render(<RouteResults flights={[withWhy, f('UA900', '18:00', '21:30', 0.3, 'high')]} onPick={() => {}} />);
    expect(screen.getByText('Why: Early-morning flights are rarely delayed • EWR is a busy airport')).toBeTruthy();
    expect(screen.getAllByText(/^Why:/)).toHaveLength(1);
  });

  it('marks the most reliable flight and reports the pick', () => {
    const onPick = vi.fn();
    render(<RouteResults flights={flights} onPick={onPick} />);
    expect(screen.getAllByText('Most reliable')).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onPick).toHaveBeenCalledWith(flights[0]);
  });

  it('lists the preferred airline first and marks it', () => {
    const dl = { ...f('DL100', '20:00', '23:00', 0.4, 'high'), airline: 'DL', airline_name: 'Delta Air Lines' };
    render(<RouteResults flights={[f('UA648', '06:00', '09:31', 0.18, 'low'), dl]} preferredAirline="DL" onPick={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].getAttribute('aria-label')).toContain('DL100');
    expect(screen.getAllByText('Your airline')).toHaveLength(1);
  });

  it('keeps departure order when there is no preference', () => {
    render(<RouteResults flights={flights} onPick={() => {}} />);
    expect(screen.queryByText('Your airline')).toBeNull();
  });
});
