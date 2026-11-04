import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ChevronRight, PlaneTakeoff, PlaneLanding, RefreshCw, Check } from 'lucide-react';
import { Header, Button, IconButton, Card, Duration, Pill, SectionHeader } from '~/components/ui';
import { RemoveFlightModal, NoPredictionBanner, PredictionPanel } from '~/components/flight';
import { cn, formatLongDate, formatTime, formatDelayChance } from '~/lib/utils';
import { getCityLabel, getAirportName } from '~/lib/airportRef';
import { getFlightById, removeFlight, saveFlight, shouldRefreshFlight, stampFlightChecked } from '~/lib/flightStore';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/$flightId/')({
  component: FlightDetailsScreen,
});

function FlightDetailsScreen() {
  const navigate = useNavigate();
  const { flightId } = Route.useParams();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [predictionUnavailable, setPredictionUnavailable] = useState(false);

  useEffect(() => {
    const f = getFlightById(flightId);
    if (f) {
      setFlight(f);
      // Auto-refresh if due
      if (shouldRefreshFlight(f)) {
        // Run in background — don't block render
        (async () => {
          try {
            const payload = buildPredictPayload(
              f.origin.code,
              f.destination.code,
              f.scheduledDeparture,
              f.airline.code,
              f.id,
              f.flightNumber
            );
            const prediction = await flyrelyApi.predict(payload);
            const updated: Flight = {
              ...f,
              riskLevel: prediction.risk_level,
              delayProbability: prediction.delay_probability,
              delayReason: prediction.risk_factors.slice(0, 2).join(' • ') || undefined,
              warnings: prediction.warnings,
              delaySeverity: prediction.delay_severity ?? undefined,
            };
            const stamped = stampFlightChecked(updated);
            setFlight(stamped);
            setPredictionUnavailable(false);
          } catch (e) {
            if (e instanceof PredictionUnavailableError) setPredictionUnavailable(true);
            stampFlightChecked(f); // still stamp so we don't retry every load
          }
        })();
      }
    } else {
      setNotFound(true);
    }
  }, [flightId]);

  const handleRefresh = async () => {
    if (!flight) return;
    setIsRefreshing(true);
    try {
      const payload = buildPredictPayload(
        flight.origin.code,
        flight.destination.code,
        flight.scheduledDeparture,
        flight.airline.code,
        flight.id,
        flight.flightNumber
      );
      const prediction = await flyrelyApi.predict(payload);
      const updated: Flight = {
        ...flight,
        riskLevel: prediction.risk_level,
        delayProbability: prediction.delay_probability,
        delayReason: prediction.risk_factors.slice(0, 2).join(' • ') || undefined,
        warnings: prediction.warnings,
        delaySeverity: prediction.delay_severity ?? undefined,
      };
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
    removeFlight(flight.id);
    navigate({ to: '/' });
  };

  if (notFound) {
    return (
      <div className="app-container">
        <div className="screen">
          <Header title="Flight Details" showBack onBackClick={() => navigate({ to: '/' })} />
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-ink mb-2">Flight not found</h2>
            <p className="text-ink-caption mb-6">This flight may have been removed.</p>
            <Button onClick={() => navigate({ to: '/' })}>Go home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="app-container">
        <div className="screen">
          <Header title="Flight Details" showBack onBackClick={() => navigate({ to: '/' })} />
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-navy-400">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Flight Details"
          showBack
          onBackClick={() => navigate({ to: '/' })}
          rightAction={
            <IconButton kind="text" size="sm" aria-label="Refresh prediction" onClick={handleRefresh}>
              <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
            </IconButton>
          }
        />

        <div className="flex-1 overflow-y-auto bg-surface-card rounded-t-4xl text-white pb-24">
          <div className="px-4 pt-8 pb-4 text-center">
            <p className="text-title-sm underline underline-offset-4">{flight.flightNumber}</p>
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
                reason={
                  flight.delayReason ??
                  'Based on historical performance for this route, airline and time of day.'
                }
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

            <Card tone="dark">
              <SectionHeader as="h3" kind="no-space" onDark title="Schedule" className="mb-3" />
              <p className="text-body-sm font-semibold">Scheduled departure</p>
              <p className="mt-2 text-body-lg">{formatTime(flight.scheduledDeparture)}</p>
            </Card>

            <Link
              to="/flights/$flightId/edit"
              params={{ flightId }}
              className="flex items-center justify-between rounded-tile bg-surface-panel px-5 py-4 text-body-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Edit flight</span>
              <ChevronRight className="w-5 h-5 text-ink-on-dark-muted" />
            </Link>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowRemoveModal(true)}
              className="border-white/80 text-white hover:bg-white/10 active:bg-white/20"
            >
              Remove this trip
            </Button>

            <div className="flex justify-center pt-2">
              <Pill tone="success" emphasis="solid" className="gap-1.5 px-3">
                <Check className="w-3.5 h-3.5" />
                Already tracking this flight
              </Pill>
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
