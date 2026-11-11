// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouteResults, groupByDayPart, pickBestBet } from '../RouteResults';
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
  const rows = () => screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label')?.includes('chance of a 15+'));

  it('lists flights by part of day with delay chance and the schedule label', () => {
    render(<RouteResults flights={flights} asOf="2026-08" onPick={() => {}} />);
    expect(rows()[0].getAttribute('aria-label')).toContain('UA648');
    expect(rows()[1].getAttribute('aria-label')).toContain('UA900');
    expect(screen.getByText('Morning')).toBeTruthy();
    expect(screen.getByText('Evening')).toBeTruthy();
    expect(screen.queryByText('Afternoon')).toBeNull();
    expect(screen.getByText(/Based on recent schedules/)).toBeTruthy();
    expect(screen.getByText(/as of August 2026/)).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('title')).toMatch(/Confirm the time on your booking/);
    expect(screen.getAllByText('18%').length).toBeGreaterThan(0);
    expect(screen.getByText(/operated by SkyWest/)).toBeTruthy();
  });

  it('shows Why only on the best bet', () => {
    const withWhy = { ...f('UA648', '06:00', '09:31', 0.07, 'low'), risk_factors: ['Early-morning flights are rarely delayed', 'EWR is a busy airport', 'third'] };
    const other = { ...f('UA900', '18:00', '21:30', 0.3, 'high'), risk_factors: ['Evening delays pile up'] };
    render(<RouteResults flights={[withWhy, other]} onPick={() => {}} />);
    expect(screen.getByText('Why: Early-morning flights are rarely delayed • EWR is a busy airport')).toBeTruthy();
    expect(screen.getAllByText(/^Why:/)).toHaveLength(1);
  });

  it('shows the best bet card and tracks it', () => {
    const onPick = vi.fn();
    render(<RouteResults flights={flights} onPick={onPick} />);
    const card = screen.getByTestId('best-bet');
    expect(card.textContent).toContain('Best bet');
    expect(card.textContent).toContain('UA648');
    fireEvent.click(screen.getByRole('button', { name: 'Track UA648' }));
    expect(onPick).toHaveBeenCalledWith(flights[1]);
  });

  it('reports a tapped row', () => {
    const onPick = vi.fn();
    render(<RouteResults flights={flights} onPick={onPick} />);
    fireEvent.click(rows()[1]);
    expect(onPick).toHaveBeenCalledWith(flights[0]);
  });

  it('lists the preferred airline first within its group and marks it', () => {
    const dl = { ...f('DL100', '07:00', '10:00', 0.4, 'high'), airline: 'DL', airline_name: 'Delta Air Lines' };
    render(<RouteResults flights={[f('UA648', '06:00', '09:31', 0.18, 'low'), dl]} preferredAirline="DL" onPick={() => {}} />);
    expect(rows()[0].getAttribute('aria-label')).toContain('DL100');
    expect(screen.getAllByText('Your airline')).toHaveLength(1);
  });

  it('caps at 10 rows and expands', () => {
    const many = Array.from({ length: 14 }, (_, i) => f(`UA${100 + i}`, `${String(5 + i).padStart(2, '0')}:00`, '23:00', 0.2 + i / 100, 'low'));
    render(<RouteResults flights={many} onPick={() => {}} />);
    expect(rows()).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 14 flights' }));
    expect(rows()).toHaveLength(14);
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
  });

  it('hints that times are local only when the zones differ', () => {
    const { unmount } = render(<RouteResults flights={[{ ...f('DL1', '08:15', '08:10', 0.2, 'low'), origin: 'ATL', dest: 'BHM' }, f('DL2', '09:00', '09:00', 0.3, 'low')]} onPick={() => {}} />);
    expect(screen.getByText('Times are local to each airport.')).toBeTruthy();
    unmount();
    render(<RouteResults flights={[{ ...f('DL1', '08:15', '09:10', 0.2, 'low'), origin: 'ATL', dest: 'JFK' }]} onPick={() => {}} />);
    expect(screen.queryByText('Times are local to each airport.')).toBeNull();
  });
});

describe('route result helpers', () => {
  it('groups by dep_time at the 12:00 and 17:00 boundaries', () => {
    const g = groupByDayPart([f('A1', '11:59', '13:00', 0.1, 'low'), f('A2', '12:00', '13:00', 0.1, 'low'), f('A3', '16:59', '18:00', 0.1, 'low'), f('A4', '17:00', '18:00', 0.1, 'low')]);
    expect(g.map((x) => [x.part, x.flights.map((y) => y.flight)])).toEqual([
      ['Morning', ['A1']], ['Afternoon', ['A2', 'A3']], ['Evening', ['A4']],
    ]);
  });

  it('picks the lowest risk, and the earliest on a tie', () => {
    const a = f('UA2', '09:00', '12:00', 0.15, 'low');
    const b = f('UA1', '07:00', '10:00', 0.15, 'low');
    const c = f('UA3', '06:00', '09:00', 0.3, 'high');
    expect(pickBestBet([a, b, c])).toEqual({ flight: b, tied: true });
    expect(pickBestBet([a, c])).toEqual({ flight: a, tied: false });
    expect(pickBestBet([])).toBeNull();
  });

  it('labels a tie', () => {
    render(<RouteResults flights={[f('UA2', '09:00', '12:00', 0.15, 'low'), f('UA1', '07:00', '10:00', 0.15, 'low')]} onPick={() => {}} />);
    expect(screen.getByTestId('best-bet').textContent).toContain('Best bet (tied on risk)');
  });
});
