import { useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Compass, Plane } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button, EmptyState, ListGroup, ListRow, PageTitle } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import { getAirport } from '~/lib/airports';
import { useFlights } from '~/hooks/useFlights';
import { formatDelayPercent } from '~/lib/utils';
import type { Flight } from '~/types';

export const Route = createFileRoute('/explore/')({
  component: ExploreScreen,
});

interface RouteSummary {
  from: string;
  to: string;
  flights: Flight[];
}

/** Group the user's own tracked flights by route. */
function summarizeRoutes(flights: Flight[]): RouteSummary[] {
  const map = new Map<string, RouteSummary>();
  for (const f of flights) {
    const key = `${f.origin.code}-${f.destination.code}`;
    const entry = map.get(key) ?? { from: f.origin.code, to: f.destination.code, flights: [] };
    entry.flights.push(f);
    map.set(key, entry);
  }
  return [...map.values()];
}

function ExploreScreen() {
  const navigate = useNavigate();
  const { flights, ready } = useFlights();
  const routes = useMemo(() => summarizeRoutes(flights), [flights]);
  const loaded = ready || flights.length > 0;

  return (
    <AppShell>
      <div className="px-6 pb-6 pt-10">
        <PageTitle title="Explore" subtitle="Routes from the flights you track" />

        {loaded && routes.length === 0 && (
          <EmptyState
            icon={<Compass />}
            title="No routes yet"
            description="Add a flight and its route shows up here with your latest delay chance."
            action={<Button onClick={() => navigate({ to: '/flights/add' })}>Add flight</Button>}
          />
        )}

        {routes.length > 0 && (
          <ListGroup>
            {routes.map((route) => {
              const fromInfo = getAirport(route.from);
              const toInfo = getAirport(route.to);
              const latest = [...route.flights].sort((a, b) =>
                b.scheduledDeparture.localeCompare(a.scheduledDeparture)
              )[0];
              const n = route.flights.length;
              return (
                <ListRow
                  key={`${route.from}-${route.to}`}
                  icon={<Plane className="rotate-45" />}
                  title={`${route.from} to ${route.to}`}
                  subtitle={`${fromInfo?.city ?? route.from} to ${toInfo?.city ?? route.to} · ${n} tracked flight${n !== 1 ? 's' : ''}`}
                  trailing={<RiskPill risk={latest.riskLevel} emphasis="soft" size="small" detail={formatDelayPercent(latest.delayProbability)} />}
                  onClick={() => navigate({ to: '/flights/$flightId', params: { flightId: latest.id } })}
                />
              );
            })}
          </ListGroup>
        )}
      </div>
    </AppShell>
  );
}
