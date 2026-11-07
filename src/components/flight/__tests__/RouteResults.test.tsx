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
    expect(screen.getByText('18% delay chance')).toBeTruthy();
    expect(screen.getByText(/operated by SkyWest/)).toBeTruthy();
  });

  it('marks the most reliable flight and reports the pick', () => {
    const onPick = vi.fn();
    render(<RouteResults flights={flights} onPick={onPick} />);
    expect(screen.getAllByText('Most reliable')).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onPick).toHaveBeenCalledWith(flights[0]);
  });
});
