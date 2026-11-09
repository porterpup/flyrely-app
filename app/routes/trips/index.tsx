import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Alert, Button, Card, SectionHeader } from '~/components/ui';
import { FlightCard, TripCard } from '~/components/flight';
import { formatDate } from '~/lib/utils';
import { createTrip, dismissSuggestion, selectUpcoming } from '~/lib/flightStore';
import { useFlights } from '~/hooks/useFlights';
import { chainLabel, legsOf, suggestTrips } from '~/lib/tripGrouping';
import type { TripSuggestion } from '~/lib/tripGrouping';
import type { Flight } from '~/types';

export const Route = createFileRoute('/trips/')({
  component: TripsScreen,
});

/** Group flights (already sorted by departure) by departure date. */
function groupByDate(flights: Flight[]): { date: string; flights: Flight[] }[] {
  const groups: { date: string; flights: Flight[] }[] = [];
  for (const f of flights) {
    const date = f.scheduledDeparture.split('T')[0];
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.flights.push(f);
    else groups.push({ date, flights: [f] });
  }
  return groups;
}

function TripsScreen() {
  const navigate = useNavigate();
  const { flights: allFlights, trips, ready, dismissed } = useFlights();
  const [suggestionError, setSuggestionError] = useState('');

  const upcoming = useMemo(() => selectUpcoming(allFlights), [allFlights]);
  const singles = useMemo(() => upcoming.filter((f) => !f.tripId), [upcoming]);

  // Trips that still have a flight to come, soonest first.
  const upcomingTrips = useMemo(() => {
    const now = new Date();
    return trips
      .map((trip) => ({ trip, legs: legsOf(trip, allFlights) }))
      .filter(({ legs }) => legs.length > 0 && new Date(legs[legs.length - 1].scheduledDeparture) >= now)
      .sort((a, b) => a.legs[0].scheduledDeparture.localeCompare(b.legs[0].scheduledDeparture));
  }, [trips, allFlights]);

  const suggestions = useMemo(() => suggestTrips(singles, dismissed), [singles, dismissed]);
  const groups = groupByDate(singles);
  const loaded = ready || allFlights.length > 0;
  const nothing = singles.length === 0 && upcomingTrips.length === 0;

  const openFlight = (flight: Flight) =>
    navigate({ to: '/flights/$flightId', params: { flightId: flight.id } });

  const makeTrip = (s: TripSuggestion) => {
    const result = createTrip(s.legs.map((f) => f.id));
    if (!result.ok) setSuggestionError(result.reason);
    else setSuggestionError('');
  };

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy-900">Trips</h1>
          {!nothing && (
            <Button
              size="sm"
              onClick={() => navigate({ to: '/flights/add' })}
              icon={<Plus className="w-4 h-4" />}
            >
              Add flight
            </Button>
          )}
        </div>

        {loaded && nothing && (
          <div className="flex flex-col items-center text-center py-16">
            <div className="text-6xl mb-6">✈️</div>
            <h2 className="text-xl font-bold text-navy-900 mb-2">No upcoming flights</h2>
            <p className="text-navy-500 mb-8 max-w-xs">
              Flights you add will show up here, grouped by departure date.
            </p>
            <Button onClick={() => navigate({ to: '/flights/add' })}>
              Add flight
            </Button>
          </div>
        )}

        {upcomingTrips.length > 0 && (
          <section className="mb-6">
            <SectionHeader title="Upcoming trips" kind="no-space" className="mb-3" />
            <div className="space-y-3">
              {upcomingTrips.map(({ trip, legs }) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  legs={legs}
                  onOpenTrip={() => navigate({ to: '/trips/$tripId', params: { tripId: trip.id } })}
                  onOpenFlight={openFlight}
                />
              ))}
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mb-6 space-y-3">
            {suggestionError && <Alert status="error" showIcon={false} lineOne={suggestionError} />}
            {suggestions.map((s) => (
              <Card key={s.key} tone="muted">
                <p className="text-body-lg text-ink">
                  These look like one trip: <span className="font-semibold">{chainLabel(s.legs)}</span>
                </p>
                <p className="mt-1 text-body-md text-ink-caption">
                  {s.legs.map((l) => l.flightNumber).join(', ')} · {formatDate(s.legs[0].scheduledDeparture)}
                </p>
                <div className="mt-3 flex gap-3">
                  <Button size="sm" onClick={() => makeTrip(s)}>Make it a trip</Button>
                  <Button size="sm" variant="secondary" onClick={() => dismissSuggestion(s.legs)}>Not a trip</Button>
                </div>
              </Card>
            ))}
          </section>
        )}

        {groups.length > 0 && upcomingTrips.length > 0 && (
          <SectionHeader title="Flights" kind="no-space" className="mb-3" />
        )}

        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.date}>
              <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                {formatDate(`${group.date}T00:00:00`)}
              </h2>
              <div className="space-y-3">
                {group.flights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    variant="compact"
                    onClick={() => openFlight(flight)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
