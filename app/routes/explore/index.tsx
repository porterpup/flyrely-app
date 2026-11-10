import { useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plane, ChevronRight } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import { getAirport } from '~/lib/airports';
import { useFlights } from '~/hooks/useFlights';
import { formatDelayChance } from '~/lib/utils';
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
      <div className="px-4 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy-900 mb-1">Explore</h1>
          <p className="text-navy-500">Routes from the flights you track</p>
        </div>

        {loaded && routes.length === 0 && (
          <div className="flex flex-col items-center text-center py-16">
            <div className="text-6xl mb-6">🧭</div>
            <h2 className="text-xl font-bold text-navy-900 mb-2">No routes yet</h2>
            <p className="text-navy-500 mb-8 max-w-xs">
              Add a flight and its route will show up here with your latest delay predictions.
            </p>
            <Button onClick={() => navigate({ to: '/flights/add' })}>
              Add flight
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {routes.map((route) => {
            const fromInfo = getAirport(route.from);
            const toInfo = getAirport(route.to);
            const latest = [...route.flights].sort((a, b) =>
              b.scheduledDeparture.localeCompare(a.scheduledDeparture)
            )[0];
            const chance = formatDelayChance(latest.delayProbability);
            return (
              <button
                key={`${route.from}-${route.to}`}
                onClick={() =>
                  navigate({ to: '/flights/$flightId', params: { flightId: latest.id } })
                }
                className="w-full flex items-center justify-between p-4 bg-white border border-navy-200 rounded-xl hover:border-primary-400 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plane className="w-5 h-5 text-navy-600 rotate-45" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-navy-900">{route.from}</span>
                      <ChevronRight className="w-4 h-4 text-navy-400" />
                      <span className="font-semibold text-navy-900">{route.to}</span>
                    </div>
                    <p className="text-xs text-navy-500 mt-0.5">
                      {fromInfo?.city ?? route.from} → {toInfo?.city ?? route.to} · {route.flights.length}{' '}
                      tracked flight{route.flights.length !== 1 ? 's' : ''}
                      {chance ? ` · latest: ${chance}` : ''}
                    </p>
                  </div>
                </div>
                <RiskPill risk={latest.riskLevel} emphasis="soft" />
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
