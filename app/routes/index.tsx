import { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, History } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button } from '~/components/ui';
import { FlightCard } from '~/components/flight';
import { getUpcomingFlights, autoCompleteOldFlights } from '~/lib/flightStore';
import type { Flight } from '~/types';

export const Route = createFileRoute('/')({
  component: HomeScreen,
});

function HomeScreen() {
  const navigate = useNavigate();
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    autoCompleteOldFlights(); // migrate departed flights to history
    setFlights(getUpcomingFlights());
  }, []);

  const hasFlights = flights.length > 0;
  const nextFlight = flights[0];

  if (!hasFlights) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
          <div className="text-6xl mb-6">✈️</div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">
            No upcoming flights
          </h1>
          <p className="text-navy-500 mb-8 max-w-xs">
            Add your first flight to start tracking delays and stay informed.
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={() => navigate({ to: '/flights/add' })}
          >
            Add your first flight
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy-900">Home</h1>
          <button
            onClick={() => navigate({ to: '/flights/history' })}
            className="p-2 text-navy-500 hover:text-navy-700 rounded-lg hover:bg-navy-50"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-900">Next flight</h2>
            <Link
              to="/flights/add"
              className="flex items-center gap-1 text-primary-600 font-medium text-sm hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Add
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

        {flights.length > 1 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Upcoming flights</h2>
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

        <section>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/flights/history"
              className="flex items-center gap-3 p-4 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors"
            >
              <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-navy-600" />
              </div>
              <div>
                <p className="font-medium text-navy-900">View all flights</p>
                <p className="text-xs text-navy-500">See your full schedule</p>
              </div>
            </Link>

            <Link
              to="/flights/add"
              className="flex items-center gap-3 p-4 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-navy-900">Add flight</p>
                <p className="text-xs text-navy-500">Track another trip</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
