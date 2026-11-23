// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { makeFlight } from '~/lib/__tests__/memStorage';
import type { Flight, Trip } from '~/types';

// The route module reads its params through the file route, so the test sets the flight id before each render.
const state = vi.hoisted(() => ({
  flightId: 'leg-1',
  flights: [] as Flight[],
  trips: [] as Trip[],
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useParams: () => ({ flightId: state.flightId }),
    useSearch: () => ({}),
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

vi.mock('~/hooks/useFlights', () => ({
  useFlights: () => ({ flights: state.flights, trips: state.trips, ready: true, downloaded: true, dismissed: [] }),
}));

vi.mock('~/hooks/useGoBack', () => ({ useGoBack: () => vi.fn() }));

vi.mock('~/lib/syncEngine', () => ({ emitNotice: vi.fn() }));

// The feedback link needs the auth provider, which these tests do not set up.
vi.mock('~/components/feedback', () => ({ FeedbackLink: () => null }));

vi.mock('~/lib/flightStore', () => ({
  getFlightById: (id: string) => state.flights.find((f) => f.id === id),
  removeFlight: vi.fn(),
  saveFlight: vi.fn(),
  shouldRefreshFlight: () => false,
  stampFlightChecked: (f: Flight) => f,
}));

import { Route } from '../../../app/routes/flights/$flightId/index';

const FlightDetailsScreen = Route.options.component as React.ComponentType;

afterEach(() => {
  cleanup();
  state.flights = [];
  state.trips = [];
});

const TRIP: Trip = { id: 'trip-1', clientUpdatedAt: '2026-11-22T00:00:00Z' };

// Three legs: SFO -> DEN -> PHX -> BNA, each connection with a 90 min layover.
function threeLegTrip(): Flight[] {
  return [
    makeFlight({
      id: 'leg-0',
      flightNumber: 'UA100',
      origin: { code: 'SFO', name: 'SFO', city: 'San Francisco' },
      destination: { code: 'DEN', name: 'DEN', city: 'Denver' },
      scheduledDeparture: '2026-12-03T07:00:00',
      scheduledArrivalLocal: '2026-12-03T10:00:00',
      tripId: TRIP.id,
      legIndex: 0,
    }),
    makeFlight({
      id: 'leg-1',
      flightNumber: 'UA200',
      origin: { code: 'DEN', name: 'DEN', city: 'Denver' },
      destination: { code: 'PHX', name: 'PHX', city: 'Phoenix' },
      scheduledDeparture: '2026-12-03T11:30:00',
      scheduledArrivalLocal: '2026-12-03T13:00:00',
      tripId: TRIP.id,
      legIndex: 1,
    }),
    makeFlight({
      id: 'leg-2',
      flightNumber: 'UA300',
      origin: { code: 'PHX', name: 'PHX', city: 'Phoenix' },
      destination: { code: 'BNA', name: 'BNA', city: 'Nashville' },
      scheduledDeparture: '2026-12-03T14:30:00',
      tripId: TRIP.id,
      legIndex: 2,
    }),
  ];
}

const connectionRows = () => screen.queryAllByText(/^Connection in /);

describe('flight detail connection rows', () => {
  it('shows two connection rows on a middle leg', () => {
    state.trips = [TRIP];
    state.flights = threeLegTrip();
    state.flightId = 'leg-1';
    render(<FlightDetailsScreen />);
    expect(connectionRows()).toHaveLength(2);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('shows one connection row on a first leg', () => {
    state.trips = [TRIP];
    state.flights = threeLegTrip();
    state.flightId = 'leg-0';
    render(<FlightDetailsScreen />);
    expect(connectionRows()).toHaveLength(1);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('shows no connection row for a flight with no trip', () => {
    state.flights = [
      makeFlight({
        id: 'solo',
        scheduledDeparture: '2026-12-03T07:00:00',
        scheduledArrivalLocal: '2026-12-03T10:00:00',
      }),
    ];
    state.flightId = 'solo';
    render(<FlightDetailsScreen />);
    expect(connectionRows()).toHaveLength(0);
  });
});
