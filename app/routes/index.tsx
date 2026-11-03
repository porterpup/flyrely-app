import { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, History, Search, ChevronRight } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button } from '~/components/ui';
import { FlightCard } from '~/components/flight';
import { getUpcomingFlights, autoCompleteOldFlights } from '~/lib/flightStore';
import { formatDate, formatDelayChance, getRiskLabel } from '~/lib/utils';
import type { Flight } from '~/types';

export const Route = createFileRoute('/')({
  component: HomeScreen,
});

function HomeScreen() {
  const navigate = useNavigate();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    autoCompleteOldFlights(); // migrate departed flights to history
    setFlights(getUpcomingFlights());
    setLoaded(true);
  }, []);

  const hasFlights = flights.length > 0;
  const nextFlight = flights[0];
  // Alerts come from stored real predictions of upcoming flights at elevated risk.
  const alerts = flights.filter((f) => f.riskLevel !== 'low');

  if (!loaded) return <AppShell><div className="flex-1" /></AppShell>;

  if (!hasFlights) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
          <h1 className="text-2xl text-navy-ink mb-2">No upcoming flights</h1>
          <p className="text-navy-caption mb-8 max-w-xs">
            Add your first flight to start tracking delays and stay informed.
          </p>
          <Button
            size="lg"
            fullWidth
            icon={<Plus className="w-5 h-5" />}
            onClick={() => navigate({ to: '/flights/add' })}
          >
            Add your flight
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 pt-10 pb-6">
        <section className="mb-4">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl text-navy-ink">Next Flight</h1>
            <Link to="/flights/add" className="flex items-center gap-2 text-navy-ink text-base">
              <Plus className="w-4 h-4" />
              Add Flight
            </Link>
          </div>

          {nextFlight && (
            <FlightCard
              flight={nextFlight}
              onClick={() =>
                navigate({ to: '/flights/$flightId', params: { flightId: nextFlight.id } })
              }
            />
          )}
        </section>

        <Link
          to="/flights/add"
          className="flex items-center border border-navy-stroke rounded-2xl mb-8 text-navy-caption h-14"
        >
          <span className="w-14 flex justify-center border-r border-navy-stroke h-full items-center">
            <Search className="w-5 h-5" />
          </span>
          <span className="px-4">Search to add flights</span>
        </Link>

        {flights.length > 1 && (
          <section className="mb-8">
            <h2 className="text-2xl text-navy-ink mb-4">Upcoming flights</h2>
            <div className="space-y-3">
              {flights.slice(1).map((flight) => (
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
        )}

        {alerts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl text-navy-ink mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {alerts.map((f) => (
                <Link
                  key={f.id}
                  to="/flights/$flightId"
                  params={{ flightId: f.id }}
                  className="flex items-center justify-between bg-warn-bg rounded-2xl px-4 py-4 text-warn-text"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      {getRiskLabel(f.riskLevel)}:{' '}
                      <span className="font-semibold">
                        {formatDelayChance(f.delayProbability) ?? 'delay possible'}
                      </span>
                    </p>
                    <p className="text-xs mt-0.5 truncate">
                      {f.flightNumber} · {f.origin.code} to {f.destination.code} ·{' '}
                      {formatDate(f.scheduledDeparture)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-navy-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl text-navy-ink mb-4">More Options</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/flights/history"
              className="p-4 min-h-[104px] bg-navy-50 border border-navy-stroke rounded-2xl"
            >
              <History className="w-5 h-5 text-navy-caption mb-3" />
              <p className="text-navy-ink">View all flights</p>
              <p className="text-xs text-navy-caption mt-1">See your full schedule</p>
            </Link>
            <Link
              to="/flights/add"
              className="p-4 min-h-[104px] bg-navy-50 border border-navy-stroke rounded-2xl"
            >
              <Plus className="w-5 h-5 text-navy-caption mb-3" />
              <p className="text-navy-ink">Add flight</p>
              <p className="text-xs text-navy-caption mt-1">Track another trip</p>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
