import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '~/components/layout';
import { PageTitle } from '~/components/ui';
import { RouteSearch } from '~/components/flight/RouteSearch';
import { useTrackFlight } from '~/hooks/useTrackFlight';
import { useAuth } from '~/context/AuthContext';
import { legDepartureISO, legArrivalISO } from '~/lib/flightLookup';

export const Route = createFileRoute('/explore/')({
  component: CompareScreen,
});

function CompareScreen() {
  const track = useTrackFlight();
  const { user } = useAuth();
  return (
    <AppShell>
      <div className="px-6 pb-6 pt-10">
        <PageTitle title="Compare flights" subtitle="See which flight on a route is least likely to be delayed, before you book." />
        <RouteSearch
          initialOrigin={user?.profile.homeAirport ?? ''}
          preferredAirline={user?.profile.preferredAirline ?? null}
          onPick={(f, date) =>
            track({
              airline: f.airline, number: f.flight_number, depISO: legDepartureISO(date, f), arrISO: legArrivalISO(date, f),
              origin: f.origin, dest: f.dest,
            })
          }
        />
      </div>
    </AppShell>
  );
}
