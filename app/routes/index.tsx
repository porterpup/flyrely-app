import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, History, Plane } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button, SectionHeader, EmptyState, ListGroup, ListRow, Skeleton } from '~/components/ui';
import { FlightCard } from '~/components/flight';
import { FeedbackLink } from '~/components/feedback';
import { selectUpcoming, autoCompleteOldFlights, shouldRefreshFlight, saveFlight, getFlightById } from '~/lib/flightStore';
import { rescoreFlight, refreshDueFlights, applyRescore } from '~/lib/prediction';
import { useFlights } from '~/hooks/useFlights';

export const Route = createFileRoute('/')({
  component: HomeScreen,
});

function HomeScreen() {
  const navigate = useNavigate();
  const { flights: allFlights, ready } = useFlights();
  // Ticks once a minute while the tab is visible so the countdown and "upcoming" list stay current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setNow(Date.now());
    };
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` re-runs the filter as flights depart
  const flights = useMemo(() => selectUpcoming(allFlights), [allFlights, now]);
  // Show the cached list at once; the "no flights" state only after the first download (never flash it on a fresh device).
  const loaded = ready || allFlights.length > 0;

  useEffect(() => {
    // After the first download, so a stale cached copy is never saved over a newer edit from another device.
    if (ready) autoCompleteOldFlights(); // migrate departed flights to history
  }, [ready]);

  // Quietly re-check due flights once per visit (max 3, in the background, errors ignored).
  const refreshedOnce = useRef(false);
  useEffect(() => {
    if (!ready || refreshedOnce.current) return;
    refreshedOnce.current = true;
    void refreshDueFlights(
      selectUpcoming(allFlights),
      shouldRefreshFlight,
      rescoreFlight,
      (fresh) => {
        const current = getFlightById(fresh.id);
        if (current) saveFlight(applyRescore(current, fresh));
      }
    );
  }, [ready, allFlights]);

  const hasFlights = flights.length > 0;
  const nextFlight = flights[0];

  if (!loaded) {
    return (
      <AppShell>
        <div className="px-6 pt-10 pb-6" role="status" aria-label="Loading your flights">
          <Skeleton className="mb-4 h-7 w-40" />
          <Skeleton className="h-[330px] rounded-ticket" />
          <Skeleton className="mb-3 mt-8 h-6 w-44" />
          <Skeleton className="h-24 rounded-tile" />
        </div>
      </AppShell>
    );
  }

  if (!hasFlights) {
    return (
      <AppShell>
        <EmptyState
          className="flex-1 justify-center"
          icon={<Plane />}
          title="No upcoming flights"
          description={
            <>
              <span className="block">Add a flight and we&apos;ll tell you the chance it leaves 15+ minutes late.</span>
              <span className="mt-2 block">We check it until you fly.</span>
              <span className="mt-2 block">Low means under 20%. Some risk is 20–30%. High is over 30%.</span>
            </>
          }
          action={
            <div className="flex flex-col items-center gap-2">
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate({ to: '/flights/add' })}>
                Add your flight
              </Button>
              <Button variant="text" onClick={() => navigate({ to: '/explore' })}>
                Compare flights on a route
              </Button>
            </div>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 pt-10 pb-6">
        <section className="mb-8">
          <SectionHeader
            as="h1"
            kind="no-space"
            className="mb-3"
            title="Next flight"
            action={
              <Link to="/flights/add" className="flex items-center gap-1 px-3.5 py-3 text-action-md text-ink rounded-btn-sm hover:bg-surface-muted">
                <Plus className="w-4 h-4" />
                Add flight
              </Link>
            }
          />

          {nextFlight && (
            <FlightCard
              flight={nextFlight}
              now={now}
              onClick={() =>
                navigate({ to: '/flights/$flightId', params: { flightId: nextFlight.id } })
              }
            />
          )}
        </section>

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

        <ListGroup className="mt-8">
          <ListRow
            icon={<History />}
            title="Past flights"
            chevron
            onClick={() => navigate({ to: '/flights/history' })}
          />
        </ListGroup>

        <div className="mt-6 flex justify-center">
          <FeedbackLink />
        </div>
      </div>
    </AppShell>
  );
}
