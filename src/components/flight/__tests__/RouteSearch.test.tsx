// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouteSearch } from '../RouteSearch';

const searchFlights = vi.hoisted(() => vi.fn());
vi.mock('~/lib/flightLookup', async (orig) => ({ ...(await orig<typeof import('~/lib/flightLookup')>()), searchFlights }));

afterEach(() => {
  cleanup();
  searchFlights.mockReset();
});

const flight = {
  flight: 'UA648', airline: 'UA', airline_name: 'United Airlines', flight_number: '648',
  origin: 'EWR', dest: 'SFO', dep_time: '06:00', arr_time: '09:31', arr_next_day: false, operating_airline: 'UA',
  operating_airline_name: 'United Airlines', operating_flight_number: 'UA648', days_seen: 40, delay_probability: 0.18, risk_level: 'low',
};

describe('RouteSearch', () => {
  it('renders the form with the origin pre-filled', () => {
    render(<RouteSearch initialOrigin="EWR" onPick={() => {}} />);
    expect(screen.getByRole('button', { name: /Find flights/ })).toBeTruthy();
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('EWR');
  });

  it('asks for airports before searching', () => {
    render(<RouteSearch onPick={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Find flights/ }));
    expect(screen.getByText('Choose the From and To airports')).toBeTruthy();
    expect(searchFlights).not.toHaveBeenCalled();
  });

  it('searches and shows results, then reports a pick with the date', async () => {
    searchFlights.mockResolvedValue({ flights: [flight, { ...flight, flight: 'UA900', dep_time: '18:00', delay_probability: 0.3 }], schedule_as_of: '2026-08' });
    const onPick = vi.fn().mockResolvedValue(null);
    render(<RouteSearch initialOrigin="EWR" initialDate="2099-01-01" onPick={onPick} />);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'SFO' } });
    fireEvent.click(screen.getByRole('button', { name: /Find flights/ }));
    await waitFor(() => expect(screen.getByTestId('route-results')).toBeTruthy());
    expect(searchFlights).toHaveBeenCalledWith('EWR', 'SFO', '2099-01-01', { after: '', before: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Track UA648' }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ flight: 'UA648' }), '2099-01-01'));
  });
});
