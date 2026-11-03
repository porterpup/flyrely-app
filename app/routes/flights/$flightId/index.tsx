import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import {
  ChevronRight,
  AlertTriangle,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  RefreshCw,
  Info,
  CheckCircle,
  Check,
} from 'lucide-react';
import { Header, Button } from '~/components/ui';
import { RemoveFlightModal, DelaySeverityBar, NoPredictionBanner } from '~/components/flight';
import { cn, formatLongDate, formatTime, getRiskLabel, formatDelayChance } from '~/lib/utils';
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
            <h2 className="text-xl font-bold text-navy-900 mb-2">Flight not found</h2>
            <p className="text-navy-500 mb-6">This flight may have been removed.</p>
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
            <button
              onClick={handleRefresh}
              className={cn(
                'p-2 text-navy-500 hover:text-navy-700 rounded-lg hover:bg-navy-50',
                isRefreshing && 'animate-spin'
              )}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto bg-navy-card rounded-t-[32px] text-white pb-24">
          <div className="px-4 pt-8 pb-4 text-center">
            <p className="text-lg underline underline-offset-4">{flight.flightNumber}</p>
            <h2 className="text-2xl mt-3">Your trip to {getCityLabel(flight.destination.code)}</h2>
            <p className="text-xs text-white/50 mt-2">{formatLongDate(flight.scheduledDeparture)}</p>
          </div>

          <div className="px-2 space-y-2">
            {predictionUnavailable && (
              <NoPredictionBanner
                type="temporary"
                reason="We couldn't get a fresh prediction. The risk shown is from the last successful check."
                onRetry={handleRefresh}
              />
            )}

            <div className="rounded-3xl bg-navy-panel overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlaneTakeoff className="w-6 h-6 flex-shrink-0" />
                    <p className="text-3xl font-semibold">{flight.origin.code}</p>
                  </div>
                  <p className="text-3xl font-semibold">{formatTime(flight.scheduledDeparture)}</p>
                </div>
                <p className="text-xs text-white/50 mt-1 ml-9">{getAirportName(flight.origin.code)}</p>

                <div className="flex items-center gap-2 my-5">
                  <div className="flex-1 border-t border-dotted border-brand/60" />
                  <Plane className="w-4 h-4 text-brand rotate-90" />
                  <div className="flex-1 border-t border-dotted border-brand/60" />
                </div>

                <div className="flex items-center gap-3">
                  <PlaneLanding className="w-6 h-6 flex-shrink-0" />
                  <p className="text-3xl font-semibold">{flight.destination.code}</p>
                </div>
                <p className="text-xs text-white/50 mt-1 ml-9">
                  {getAirportName(flight.destination.code)}
                </p>
              </div>

              <div
                className={cn(
                  'p-5 rounded-3xl',
                  flight.riskLevel === 'low' && 'bg-ok text-white',
                  flight.riskLevel === 'medium' && 'bg-warn text-warn-ink',
                  flight.riskLevel === 'high' && 'bg-red-500 text-white'
                )}
              >
                <div className="flex items-center gap-2 text-xs mb-4">
                  {flight.riskLevel === 'low' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  FlyRely prediction
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold">{getRiskLabel(flight.riskLevel)}</p>
                    <p className="text-xs mt-1 opacity-80">Based on historical data</p>
                  </div>
                  {formatDelayChance(flight.delayProbability) && (
                    <div className="text-right">
                      <p className="text-xl font-semibold">
                        {Math.round((flight.delayProbability ?? 0) * 100)}%
                      </p>
                      <p className="text-xs mt-1 opacity-80">chance of a 15+ min delay</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 mt-5 text-xs">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    {flight.delayReason ??
                      'Based on historical performance for this route, airline and time of day.'}
                  </p>
                </div>

                {flight.delaySeverity && flight.riskLevel !== 'low' && (
                  <div className="mt-5 pt-4 border-t border-black/10 text-navy-ink">
                    <DelaySeverityBar severity={flight.delaySeverity} compact />
                  </div>
                )}

                {flight.warnings && flight.warnings.length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {flight.warnings.map((w, i) => (
                      <li key={`${i}-${w}`} className="text-xs opacity-80">
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-navy-panel p-5">
              <h3 className="text-xl mb-4">Schedule</h3>
              <p className="text-xs font-semibold">Scheduled departure</p>
              <p className="mt-2">{formatTime(flight.scheduledDeparture)}</p>
            </div>

            <Link
              to="/flights/$flightId/edit"
              params={{ flightId }}
              className="flex items-center justify-between rounded-2xl bg-navy-panel px-5 py-4"
            >
              <span>Edit flight</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </Link>

            <button
              onClick={() => setShowRemoveModal(true)}
              className="w-full rounded-2xl border border-white/80 py-3 text-center hover:bg-white/10 transition-colors"
            >
              Remove this trip
            </button>

            <div className="flex justify-center pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok px-3 py-1 text-xs">
                <Check className="w-3.5 h-3.5" />
                Already tracking this flight
              </span>
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
