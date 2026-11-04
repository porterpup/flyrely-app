import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button } from '~/components/ui';
import { FlightCard } from '~/components/flight';
import { formatDate } from '~/lib/utils';
import { getUpcomingFlights } from '~/lib/flightStore';
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
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFlights(getUpcomingFlights());
    setLoaded(true);
  }, []);

  const groups = groupByDate(flights);

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy-900">Trips</h1>
          {flights.length > 0 && (
            <Button
              size="sm"
              onClick={() => navigate({ to: '/flights/add' })}
              icon={<Plus className="w-4 h-4" />}
            >
              Add flight
            </Button>
          )}
        </div>

        {loaded && flights.length === 0 && (
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
                    onClick={() =>
                      navigate({ to: '/flights/$flightId', params: { flightId: flight.id } })
                    }
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
