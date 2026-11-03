import { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, History, Search } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button, SectionHeader, FieldBox, Alert, OptionTile } from '~/components/ui';
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
          <h1 className="text-title-lg text-ink mb-2">No upcoming flights</h1>
          <p className="text-body-lg text-ink-caption mb-8 max-w-xs">
            Add your first flight to start tracking delays and stay informed.
          </p>
          <Button
            fullWidth
            icon={<Plus className="w-4 h-4" />}
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
          <SectionHeader
            as="h1"
            kind="no-space"
            className="mb-3"
            title="Next Flight"
            action={
              <Link to="/flights/add" className="flex items-center gap-1 px-3.5 py-3 text-action-md text-ink rounded-btn-sm hover:bg-surface-muted">
                <Plus className="w-4 h-4" />
                Add Flight
              </Link>
            }
          />

          {nextFlight && (
            <FlightCard
              flight={nextFlight}
              onClick={() =>
                navigate({ to: '/flights/$flightId', params: { flightId: nextFlight.id } })
              }
            />
          )}
        </section>

        <Link to="/flights/add" className="block mb-4 rounded-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent">
          <FieldBox interactive={false} leading={<Search />}>
            <span className="flex-1 px-2 py-3.5 text-body-lg text-ink-caption">Search to add flights</span>
          </FieldBox>
        </Link>

        {flights.length > 1 && (
          <section className="mb-8">
            <SectionHeader title="Upcoming flights" />
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
            <SectionHeader title="Recent Alerts" />
            <div className="space-y-3">
              {alerts.map((f) => (
                <Link
                  key={f.id}
                  to="/flights/$flightId"
                  params={{ flightId: f.id }}
                  className="block rounded-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
                >
                  <Alert
                    status={f.riskLevel === 'high' ? 'error' : 'warning'}
                    showIcon={false}
                    showRightIcon
                    lineOne={
                      <>
                        {getRiskLabel(f.riskLevel)}:{' '}
                        <span className="font-semibold">
                          {formatDelayChance(f.delayProbability) ?? 'delay possible'}
                        </span>
                      </>
                    }
                    lineTwo={`${f.flightNumber} · ${f.origin.code} to ${f.destination.code} · ${formatDate(f.scheduledDeparture)}`}
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="More Options" />
          <div className="grid grid-cols-2 gap-3">
            <Link to="/flights/history" className="block rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent">
              <OptionTile icon={<History />} title="View all flights" description="See your full schedule" className="h-full" />
            </Link>
            <Link to="/flights/add" className="block rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent">
              <OptionTile icon={<Plus />} title="Add flight" description="Track another trip" className="h-full" />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
