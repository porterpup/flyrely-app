import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import {
  ChevronRight,
  AlertTriangle,
  Plane,
  RefreshCw,
  Info,
  CheckCircle,
} from 'lucide-react';
import { Header, Button, Modal } from '~/components/ui';
import { RemoveFlightModal, DelaySeverityBar } from '~/components/flight';
import { cn, formatDate, formatTime, getRiskBadgeClass, getRiskLabel } from '~/lib/utils';
import { getFlightById, removeFlight, saveFlight } from '~/lib/flightStore';
import { flyrelyApi, buildPredictPayload } from '~/lib/api';
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

  useEffect(() => {
    const f = getFlightById(flightId);
    if (f) {
      setFlight(f);
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
        flight.scheduledDeparture
      );
      const prediction = await flyrelyApi.predict(payload);
      const estimatedDelay = prediction.delay_severity
        ? Math.round(
            prediction.delay_probability *
            (prediction.delay_severity.expected_delay_label === 'severe' ? 150
             : prediction.delay_severity.expected_delay_label === 'moderate' ? 75
             : 25)
          )
        : prediction.risk_level === 'high'
        ? Math.round(prediction.delay_probability * 90)
        : prediction.risk_level === 'medium'
        ? Math.round(prediction.delay_probability * 45)
        : 0;
      const updated: Flight = {
        ...flight,
        riskLevel: prediction.risk_level,
        delayMinutes: estimatedDelay,
        delayReason: prediction.risk_factors.slice(0, 2).join(' • ') || flight.delayReason,
        delaySeverity: prediction.delay_severity ?? undefined,
        predictedDeparture:
          estimatedDelay > 0
            ? new Date(
                new Date(flight.scheduledDeparture).getTime() +
                  estimatedDelay * 60000
              ).toISOString()
            : undefined,
      };
      saveFlight(updated);
      setFlight(updated);
    } catch {
      // keep existing on error
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

  const showAlternatives = flight.riskLevel === 'high' || flight.riskLevel === 'medium';

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

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 bg-gradient-to-br from-navy-800 to-navy-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✈️</div>
                <div>
                  <p className="font-bold text-xl text-white">{flight.flightNumber}</p>
                  <p className="text-white/70">{flight.airline.name}</p>
                </div>
              </div>
              <p className="text-sm text-white/60">{formatDate(flight.scheduledDeparture)}</p>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{flight.origin.code}</p>
                <p className="text-sm text-white/60">{flight.origin.city}</p>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-white/30" />
                <Plane className="w-5 h-5 text-white/60 rotate-90" />
                <div className="flex-1 border-t border-dashed border-white/30" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{flight.destination.code}</p>
                <p className="text-sm text-white/60">{flight.destination.city}</p>
              </div>
            </div>

            <div
              className={cn(
                'rounded-xl p-4',
                flight.riskLevel === 'low' && 'bg-green-500/20',
                flight.riskLevel === 'medium' && 'bg-amber-500/20',
                flight.riskLevel === 'high' && 'bg-red-500/20'
              )}
            >
              <div className="flex items-start gap-3">
                {flight.riskLevel === 'low' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <AlertTriangle
                    className={cn(
                      'w-5 h-5 mt-0.5',
                      flight.riskLevel === 'medium' ? 'text-amber-400' : 'text-red-400'
                    )}
                  />
                )}
                <div>
                  <p
                    className={cn(
                      'font-semibold',
                      flight.riskLevel === 'low' && 'text-green-100',
                      flight.riskLevel === 'medium' && 'text-amber-100',
                      flight.riskLevel === 'high' && 'text-red-100'
                    )}
                  >
                    {getRiskLabel(flight.riskLevel)}
                    {(flight.delayMinutes ?? 0) > 0 &&
                      flight.riskLevel !== 'low' &&
                      ` · ${flight.delayMinutes}-${(flight.delayMinutes ?? 0) + 30} min delay expected`}
                  </p>
                  {flight.delayReason && flight.riskLevel !== 'low' && (
                    <p
                      className={cn(
                        'text-sm mt-1 opacity-80',
                        flight.riskLevel === 'medium' ? 'text-amber-100' : 'text-red-100'
                      )}
                    >
                      {flight.delayReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                Status Overview
              </h3>
              <div className="bg-white border border-navy-200 rounded-xl divide-y divide-navy-100">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-navy-500">Airline status</span>
                    <span className="font-medium text-navy-900">
                      {flight.airlineStatus ?? 'On time'} · Departs{' '}
                      {formatTime(flight.scheduledDeparture)}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-navy-500">FlyRely prediction</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-navy-900">
                        {flight.riskLevel !== 'low'
                          ? `${flight.delayMinutes}-${(flight.delayMinutes ?? 0) + 30} min delay`
                          : 'No delay expected'}
                      </span>
                      <span className={getRiskBadgeClass(flight.riskLevel)}>
                        {getRiskLabel(flight.riskLevel)}
                      </span>
                    </div>
                  </div>
                  {flight.predictedDeparture && (
                    <p className="text-sm text-navy-500 mt-1">
                      We expect {formatTime(flight.predictedDeparture)} -{' '}
                      {formatTime(
                        new Date(
                          new Date(flight.predictedDeparture).getTime() + 30 * 60000
                        ).toISOString()
                      )}
                    </p>
                  )}
                </div>
                {flight.delaySeverity && flight.riskLevel !== 'low' && (
                  <div className="p-4 border-t border-navy-100">
                    <DelaySeverityBar severity={flight.delaySeverity} />
                  </div>
                )}
                <div className="p-4 bg-navy-50">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-navy-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-navy-500">
                      Predictions are based on historical performance and current conditions. Tap
                      refresh to update.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                Schedule
              </h3>
              <div className="bg-white border border-navy-200 rounded-xl">
                <div className="grid grid-cols-2 divide-x divide-navy-100">
                  <div className="p-4">
                    <p className="text-sm text-navy-500 mb-1">Scheduled departure</p>
                    <p className="font-semibold text-navy-900">
                      {formatTime(flight.scheduledDeparture)}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-navy-500 mb-1">Expected departure</p>
                    <p
                      className={cn(
                        'font-semibold',
                        flight.riskLevel === 'low' ? 'text-navy-900' : 'text-amber-600'
                      )}
                    >
                      {flight.predictedDeparture
                        ? `${formatTime(flight.predictedDeparture)} - ${formatTime(
                            new Date(
                              new Date(flight.predictedDeparture).getTime() + 30 * 60000
                            ).toISOString()
                          )}`
                        : formatTime(flight.scheduledDeparture)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-navy-100 border-t border-navy-100">
                  <div className="p-4">
                    <p className="text-sm text-navy-500 mb-1">Scheduled arrival</p>
                    <p className="font-semibold text-navy-900">
                      {formatTime(flight.scheduledArrival)}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-navy-500 mb-1">Expected arrival</p>
                    <p
                      className={cn(
                        'font-semibold',
                        flight.riskLevel === 'low' ? 'text-navy-900' : 'text-amber-600'
                      )}
                    >
                      {flight.predictedArrival
                        ? `${formatTime(flight.predictedArrival)} - ${formatTime(
                            new Date(
                              new Date(flight.predictedArrival).getTime() + 30 * 60000
                            ).toISOString()
                          )}`
                        : formatTime(flight.scheduledArrival)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {showAlternatives && (
              <Link
                to="/flights/$flightId/alternatives"
                params={{ flightId }}
                className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-primary-900">View alternative flights</p>
                    <p className="text-sm text-primary-700">
                      Find lower-risk options on the same route
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary-600" />
              </Link>
            )}

            <section>
              <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                Manage Flight
              </h3>
              <button
                onClick={() => setShowRemoveModal(true)}
                className="w-full flex items-center justify-between p-4 bg-white border border-navy-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🗑️</span>
                  <span className="font-medium text-navy-900 group-hover:text-red-700">
                    Remove flight
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-navy-400 group-hover:text-red-400" />
              </button>
            </section>

            <div className="flex items-center justify-center gap-2 py-4 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Tracking this flight</span>
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
