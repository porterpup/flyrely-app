// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FlightCard } from '../FlightCard';
import type { Flight } from '~/types';

afterEach(cleanup);

const flight = {
  id: 'f1',
  flightNumber: 'DL400',
  airline: { code: 'DL', name: 'Delta Air Lines Incorporated' },
  origin: { code: 'SFO', city: 'San Francisco', name: 'San Francisco International' },
  destination: { code: 'BOS', city: 'Boston', name: 'Logan' },
  scheduledDeparture: '2026-11-24T07:05:00',
  riskLevel: 'low',
  delayProbability: 0.08,
} as unknown as Flight;

describe('FlightCard narrow layout classes', () => {
  it('compact: date and time never wrap, airline is truncated and hidden under 360px', () => {
    render(<FlightCard flight={flight} variant="compact" />);
    const airline = screen.getByText('Delta Air Lines Incorporated');
    expect(airline.className).toContain('truncate');
    expect(airline.className).toContain('max-[359px]:hidden');
    expect(airline.parentElement?.className).toContain('min-w-0');
    const dateRow = screen.getByText('BOS').parentElement as HTMLElement;
    expect(dateRow.className).toContain('whitespace-nowrap');
    expect(dateRow.className).toContain('tabular-nums');
  });

  it('default: place line truncates instead of wrapping', () => {
    render(<FlightCard flight={flight} />);
    const place = screen.getByText(/SFO · San Francisco/);
    expect(place.className).toContain('truncate');
  });
});
