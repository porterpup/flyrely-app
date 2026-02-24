import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Plane, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { cn } from '~/lib/utils';
import { AIRLINES, POPULAR_ROUTES, getAirport } from '~/lib/airports';
import { getFlights } from '~/lib/flightStore';
import type { Flight } from '~/types';

export const Route = createFileRoute('/explore/')({
  component: ExploreScreen,
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** On-time pct for a route = 1 - average delay rate of the two airports */
function routeOnTime(from: string, to: string): number {
  const a = getAirport(from);
  const b = getAirport(to);
  const avg = ((a?.delayRate ?? 0.22) + (b?.delayRate ?? 0.22)) / 2;
  return Math.round((1 - avg) * 100);
}

function reliabilityLabel(pct: number) {
  if (pct >= 85) return { label: 'Reliable', cls: 'bg-green-100 text-green-700' };
  if (pct >= 78) return { label: 'Moderate', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Variable', cls: 'bg-red-100 text-red-700' };
}

/** Derive unique routes from user's tracked flights */
function userRoutes(flights: Flight[]): { from: string; to: string }[] {
  const seen = new Set<string>();
  const routes: { from: string; to: string }[] = [];
  for (const f of flights) {
    const key = `${f.origin.code}-${f.destination.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      routes.push({ from: f.origin.code, to: f.destination.code });
    }
  }
  return routes;
}

const sortedAirlines = [...AIRLINES].sort((a, b) => a.delayRate - b.delayRate);

// ── Component ──────────────────────────────────────────────────────────────

function ExploreScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [trackedRoutes, setTrackedRoutes] = useState<{ from: string; to: string }[]>([]);

  useEffect(() => {
    const flights = getFlights();
    setTrackedRoutes(userRoutes(flights));
  }, []);

  // Merge user routes first, then popular routes (de-duped)
  const allRoutes = (() => {
    const seen = new Set<string>();
    const merged: { from: string; to: string; isPersonal?: boolean }[] = [];
    for (const r of trackedRoutes) {
      const key = `${r.from}-${r.to}`;
      if (!seen.has(key)) { seen.add(key); merged.push({ ...r, isPersonal: true }); }
    }
    for (const r of POPULAR_ROUTES) {
      const key = `${r.from}-${r.to}`;
      if (!seen.has(key)) { seen.add(key); merged.push(r); }
    }
    return merged;
  })();

  // Filter by search query
  const filteredRoutes = query.trim()
    ? allRoutes.filter((r) => {
        const q = query.toLowerCase();
        const fromInfo = getAirport(r.from);
        const toInfo = getAirport(r.to);
        return (
          r.from.toLowerCase().includes(q) ||
          r.to.toLowerCase().includes(q) ||
          fromInfo?.city.toLowerCase().includes(q) ||
          toInfo?.city.toLowerCase().includes(q)
        );
      })
    : allRoutes;

  const filteredAirlines = query.trim()
    ? sortedAirlines.filter((a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.code.toLowerCase().includes(query.toLowerCase())
      )
    : sortedAirlines;

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy-900 mb-1">Explore</h1>
          <p className="text-navy-500">Route reliability & airline rankings</p>
        </div>

        {/* Search */}
        <div className="mb-8 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search airports, cities, or airlines..."
            className="w-full rounded-xl border border-navy-200 bg-white pl-10 pr-4 py-3 text-sm text-navy-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
        </div>

        {/* Popular Routes */}
        {filteredRoutes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-navy-900 mb-1">
              {trackedRoutes.length > 0 ? 'Your routes & popular picks' : 'Popular routes'}
            </h2>
            <p className="text-xs text-navy-500 mb-4">On-time performance based on historical data</p>

            <div className="space-y-3">
              {filteredRoutes.map((route) => {
                const pct = routeOnTime(route.from, route.to);
                const { label, cls } = reliabilityLabel(pct);
                const fromInfo = getAirport(route.from);
                const toInfo = getAirport(route.to);
                return (
                  <button
                    key={`${route.from}-${route.to}`}
                    onClick={() =>
                      navigate({
                        to: '/flights/add',
                        search: { from: route.from, to: route.to } as never,
                      })
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
                          {(route as { isPersonal?: boolean }).isPersonal && (
                            <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                              Tracked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-navy-500 mt-0.5">
                          {fromInfo?.city ?? route.from} → {toInfo?.city ?? route.to} · {pct}% on-time
                        </p>
                      </div>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', cls)}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Airline Rankings */}
        {filteredAirlines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-navy-900 mb-1">Airline rankings</h2>
            <p className="text-xs text-navy-500 mb-4">Ranked by on-time performance — best first</p>

            <div className="bg-white border border-navy-200 rounded-xl overflow-hidden divide-y divide-navy-100">
              {filteredAirlines.map((airline, i) => {
                const onTimePct = Math.round((1 - airline.delayRate) * 100);
                const rank = sortedAirlines.indexOf(airline) + 1;
                const isTop3 = rank <= 3;
                const isBottom3 = rank >= sortedAirlines.length - 2;
                const TrendIcon = isTop3 ? TrendingUp : isBottom3 ? TrendingDown : Minus;
                const trendCls = isTop3
                  ? 'text-green-500'
                  : isBottom3
                  ? 'text-red-500'
                  : 'text-navy-400';
                return (
                  <div
                    key={airline.code}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3',
                      i === 0 && 'bg-green-50'
                    )}
                  >
                    <span
                      className={cn(
                        'w-6 text-center text-sm font-bold',
                        rank === 1 ? 'text-amber-500' : 'text-navy-400'
                      )}
                    >
                      {rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 text-sm truncate">{airline.name}</p>
                      <p className="text-xs text-navy-500">{airline.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon className={cn('w-4 h-4 flex-shrink-0', trendCls)} />
                      <div className="text-right">
                        <p className={cn('text-sm font-bold', onTimePct >= 84 ? 'text-green-700' : onTimePct >= 78 ? 'text-amber-700' : 'text-red-700')}>
                          {onTimePct}%
                        </p>
                        <p className="text-xs text-navy-400">on-time</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Flight tips */}
        <section className="mb-4">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Flying tips</h2>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-semibold text-blue-900 text-sm mb-1">✈️ Fly early, fly on time</p>
              <p className="text-xs text-blue-700">
                Flights before 9am have roughly 23% fewer delays — aircraft are fresh and airports
                aren't yet congested.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-900 text-sm mb-1">🌩️ Watch winter Nor'easters</p>
              <p className="text-xs text-amber-700">
                EWR, JFK, LGA, BOS and PHL rank among the most delay-prone airports — especially
                Dec through Feb.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-900 text-sm mb-1">🏆 Best on-time carriers</p>
              <p className="text-xs text-green-700">
                Hawaiian, Alaska, and Delta consistently top on-time rankings. Budget carriers like
                Spirit and Frontier tend to lag.
              </p>
            </div>
          </div>
        </section>

        {/* No results */}
        {query.trim() && filteredRoutes.length === 0 && filteredAirlines.length === 0 && (
          <div className="text-center py-12 text-navy-500">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No results for "{query}"</p>
            <p className="text-sm mt-1">Try an airport code like SFO or a city name like Chicago</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
