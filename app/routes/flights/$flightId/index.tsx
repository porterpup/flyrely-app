import { useState, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ChevronRight, PlaneTakeoff, PlaneLanding, SearchX } from 'lucide-react';
import { Header, Button, Card, Duration, SectionHeader, EmptyState, Skeleton } from '~/components/ui';
import { RemoveFlightModal, NoPredictionBanner, PredictionPanel } from '~/components/flight';
import { formatLongDate, formatTime, formatDelayChance } from '~/lib/utils';
import { getCityLabel, getAirportName } from '~/lib/airportRef';
import { useFlights } from '~/hooks/useFlights';
import { useGoBack } from '~/hooks/useGoBack';
import { MAX_LEGS, legsOf, tripTitle } from '~/lib/tripGrouping';
import { emitNotice } from '~/lib/syncEngine';
import { getFlightById, removeFlight, saveFlight, shouldRefreshFlight, stampFlightChecked } from '~/lib/flightStore';
import { weatherCard } from '~/lib/weather';
import { rescoreFlight, applyRescore } from '~/lib/prediction';
import { isDeparted } from '~/lib/flightTime';
import { FeedbackLink } from '~/components/feedback';
import { PredictionUnavailableError } from '~/lib/api';
import type { Flight } from '~/types';
import { DisruptionSlot } from '~/copilot/DisruptionSlot';
import { COPILOT_ENABLED } from '~/copilot/flags';
import { releaseFlightCopilot } from '~/copilot/cleanup';

export const Route = createFileRoute('/flights/$flightId/')({
  component: FlightDetailsScreen,
});

function FlightDetailsScreen() {
  const navigate = useNavigate();
  const goBack = useGoBack('/');
  const { flightId } = Route.useParams();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [predictionUnavailable, setPredictionUnavailable] = useState(false);
  const { flights: storedFlights, trips, ready } = useFlights();
  const inStore = storedFlights.some((x) => x.id === flightId);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (loadedId.current === flightId) return;
    const f = getFlightById(flightId);
    if (f) {
      loadedId.current = flightId;
      setNotFound(false);
      setFlight(f);
    } else if (ready) {
      // Only after the first download: a fresh device must not say "not found" before the cloud copy arrives.
      setNotFound(true);
    }
  }, [flightId, ready, inStore]);

  // Keep the page in step with the store (a download or another screen may have changed this flight).
  const storedFlight = storedFlights.find((x) => x.id === flightId);
  useEffect(() => {
    if (storedFlight && loadedId.current === flightId) setFlight(storedFlight);
  }, [storedFlight, flightId]);

  // Auto-refresh if due. Wait for the first download, so a stale cached copy is never saved over a newer edit.
  const refreshedId = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || refreshedId.current === flightId) return;
    const f = getFlightById(flightId);
    if (!f) return;
    refreshedId.current = flightId;
    if (!shouldRefreshFlight(f)) return;
    // Run in background — don't block render
    (async () => {
      try {
        const fresh = await rescoreFlight(f);
        // Apply to the current copy; skip if the flight was removed while the prediction loaded.
        const current = getFlightById(flightId);
        if (!current) return;
        const stamped: Flight = applyRescore(current, fresh);
        saveFlight(stamped);
        setFlight(stamped);
        setPredictionUnavailable(false);
      } catch (e) {
        if (e instanceof PredictionUnavailableError) setPredictionUnavailable(true);
        const current = getFlightById(flightId);
        if (current) stampFlightChecked(current); // still stamp so we don't retry every load
      }
    })();
  }, [flightId, ready, inStore]);

  const handleRefresh = async () => {
    if (!flight) return;
    setIsRefreshing(true);
    try {
      const fresh = await rescoreFlight(flight);
      const current = getFlightById(flight.id);
      if (!current) {
        setIsRefreshing(false);
        return;
      }
      const updated: Flight = applyRescore(current, fresh);
      saveFlight(updated);
      setFlight(updated);
      setPredictionUnavailable(false);
    } catch {
      // keep existing data, but tell the user the refresh produced no prediction
      setPredictionUnavailable(true);
    }
    setIsRefreshing(false);
  };

  const handleRemove = async () => {
    if (!flight) return;
    const tripChange = removeFlight(flight.id);
    if (tripChange === 'ungrouped_not_connected') emitNotice('Trip ungrouped because the flights no longer connect.');
    if (COPILOT_ENABLED) void releaseFlightCopilot(flight.id);
    navigate({ to: '/' });
  };

  if (notFound) {
    return (
      <div className="app-container">
        <div className="screen">
          <Header title="Flight Details" showBack onBackClick={goBack} />
          <EmptyState
            className="flex-1 justify-center"
            icon={<SearchX />}
            title="Flight not found"
            description="This flight may have been removed."
            action={<Button onClick={() => navigate({ to: '/' })}>Go home</Button>}
          />
        </div>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="app-container">
        <div className="screen">
          <Header title="Flight Details" showBack onBackClick={goBack} />
          <div className="flex-1 rounded-t-4xl bg-surface-card px-2 pt-10" role="status" aria-label="Loading flight">
            <div className="mx-auto mb-8 flex flex-col items-center gap-3">
              <Skeleton onDark className="h-5 w-16" />
              <Skeleton onDark className="h-7 w-64 max-w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton onDark className="h-56 rounded-panel" />
              <Skeleton onDark className="h-48 rounded-panel" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const weather = weatherCard(flight);
  const trip = flight.tripId ? trips.find((t) => t.id === flight.tripId) : undefined;
  const tripLegs = trip ? legsOf(trip, storedFlights) : [];
  const isLastLeg = tripLegs.length > 0 && tripLegs[tripLegs.length - 1].id === flight.id;
  const canAddConnection =
    !isDeparted(flight, Date.now()) && (!trip || (isLastLeg && tripLegs.length < MAX_LEGS));

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Flight Details"
          showBack
          onBackClick={goBack}
        />

        <div className="flex-1 overflow-y-auto bg-surface-card rounded-t-4xl text-white pb-24">
          <div className="px-4 pt-8 pb-4 text-center">
            <p className="text-title-sm tabular-nums">{flight.flightNumber}</p>
            <h2 className="text-title-lg mt-3">Your trip to {getCityLabel(flight.destination.code)}</h2>
            <p className="text-body-sm text-ink-on-dark-muted mt-2">{formatLongDate(flight.scheduledDeparture)}</p>
          </div>

          <div className="px-2 space-y-2">
            {predictionUnavailable && (
              <NoPredictionBanner
                type="temporary"
                reason="We couldn't get a fresh prediction. The risk shown is from the last successful check."
                onRetry={handleRefresh}
              />
            )}

            <Card tone="dark" padded={false} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlaneTakeoff className="w-6 h-6 flex-shrink-0" />
                    <p className="text-heading-sm">{flight.origin.code}</p>
                  </div>
                  <p className="text-heading-sm">{formatTime(flight.scheduledDeparture)}</p>
                </div>
                <p className="text-body-sm text-ink-on-dark-muted mt-1 ml-9">{getAirportName(flight.origin.code)}</p>

                <Duration onDark className="my-5" />

                <div className="flex items-center gap-3">
                  <PlaneLanding className="w-6 h-6 flex-shrink-0" />
                  <p className="text-heading-sm">{flight.destination.code}</p>
                </div>
                <p className="text-body-sm text-ink-on-dark-muted mt-1 ml-9">
                  {getAirportName(flight.destination.code)}
                </p>
              </div>

              <PredictionPanel
                risk={flight.riskLevel}
                chancePercent={formatDelayChance(flight.delayProbability) ? Math.round((flight.delayProbability ?? 0) * 100) : null}
                why={flight.delayReason}
                reason={
                  'Based on years of flights on this route at this time of day.' +
                  (weather.kind === 'later' ? ' We add the weather forecast about a day before you fly.' : '')
                }
                checkedAt={flight.lastCheckedAt}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
              >
                {flight.warnings && flight.warnings.length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {flight.warnings.map((w, i) => (
                      <li key={`${i}-${w}`} className="text-body-sm opacity-80">
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </PredictionPanel>
            </Card>

            <DisruptionSlot flight={flight} onFlightChange={setFlight} />

            {weather.kind === 'lines' && (
              <Card tone="dark">
                <SectionHeader as="h3" kind="no-space" onDark title="Weather" className="mb-3" />
                <ul className="space-y-2 text-body-sm">
                  {weather.lines.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </Card>
            )}

            {trip && tripLegs.length > 0 && (
              <Link
                to="/trips/$tripId"
                params={{ tripId: trip.id }}
                className="flex items-center justify-between rounded-tile bg-surface-panel px-5 py-4 text-body-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>
                  Part of trip {tripTitle(trip, tripLegs)} (leg {(flight.legIndex ?? 0) + 1} of {tripLegs.length})
                </span>
                <ChevronRight className="w-5 h-5 text-ink-on-dark-muted" />
              </Link>
            )}

            {canAddConnection && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate({ to: '/flights/add', search: { after: flight.id } })}
                className="border-white/80 text-white hover:bg-white/10 active:bg-white/20"
              >
                Add connecting flight
              </Button>
            )}

            <Link
              to="/flights/$flightId/edit"
              params={{ flightId }}
              className="flex items-center justify-between rounded-tile bg-surface-panel px-5 py-4 text-body-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Edit flight</span>
              <ChevronRight className="w-5 h-5 text-ink-on-dark-muted" />
            </Link>

            <div className="flex items-center justify-center gap-6 pt-4">
              <FeedbackLink onDark />
              <button
                type="button"
                onClick={() => setShowRemoveModal(true)}
                className="rounded text-body-sm text-ink-on-dark-muted underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Remove this flight
              </button>
            </div>
          </div>
        </div>

        <RemoveFlightModal
          isOpen={showRemoveModal}
          onClose={() => setShowRemoveModal(false)}
          flight={flight}
          onConfirm={handleRemove}
        />
      </div>
    </div>
  );
}
