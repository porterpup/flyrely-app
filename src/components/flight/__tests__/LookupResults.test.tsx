// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LookupResults } from '../LookupResults';
import type { LookupLeg } from '~/lib/flightLookup';

const leg = (o: string, d: string, dep: string, arr: string, next = false): LookupLeg => ({
  origin: o, dest: d, dep_time: dep, arr_time: arr, arr_next_day: next, operating_airline: 'UA',
  operating_airline_name: 'United Airlines', operating_flight_number: 'UA648', days_seen: 50,
});

afterEach(cleanup);

describe('LookupResults', () => {
  it('renders one tappable card per leg and reports the pick', () => {
    const onPick = vi.fn();
    const legs = [leg('EWR', 'SFO', '06:00', '09:31'), leg('SFO', 'MSP', '16:10', '21:57')];
    render(<LookupResults flight="UA648" legs={legs} note="Typical schedule (as of 2026-08)" onPick={onPick} />);
    expect(screen.getByText(/flies 2 legs/)).toBeTruthy();
    expect(screen.getByText(/as of 2026-08/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'UA648 · SFO → MSP · 4:10 PM → 9:57 PM' }));
    expect(onPick).toHaveBeenCalledWith(legs[1]);
  });
  it('shows the +1 day marker and honors disabled', () => {
    const onPick = vi.fn();
    render(<LookupResults flight="DL7" legs={[leg('LAX', 'JFK', '23:00', '07:10', true)]} disabled onPick={onPick} />);
    expect(screen.getByText(/\+1 day/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onPick).not.toHaveBeenCalled();
  });
});
