import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, Clock } from 'lucide-react';
import { Button, Header, Input } from '~/components/ui';
import { getFlightById, saveFlight } from '~/lib/flightStore';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import { getAirport, getAirline } from '~/lib/airports';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/$flightId/edit')({
  component: EditFlightScreen,
});

const inputCls =
  'w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

function EditFlightScreen() {
  const navigate = useNavigate();
  const { flightId } = Route.useParams();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const f = getFlightById(flightId);
    if (!f) {
      setNotFound(true);
      return;
    }
    setFlight(f);
    setFlightNumber(f.flightNumber);
    setOrigin(f.origin.code);
    setDestination(f.destination.code);
    const [d, t] = f.scheduledDeparture.split('T');
    setDate(d);
    setTime((t ?? '').slice(0, 5));
  }, [flightId]);

  const goBack = () => navigate({ to: '/flights/$flightId', params: { flightId } });

  if (notFound) {
    return (
      <div className="app-container">
        <div className="screen">
          <Header title="Edit Flight" showBack onBackClick={() => navigate({ to: '/' })} />
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
          <Header title="Edit Flight" showBack onBackClick={() => navigate({ to: '/' })} />
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-navy-400">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const newDeparture = `${date}T${time}:00`;
  const newFlightNumber = flightNumber.trim().toUpperCase();
  const newOrigin = origin.trim().toUpperCase();
  const newDestination = destination.trim().toUpperCase();

  const originalDeparture = flight.scheduledDeparture.length === 16
    ? `${flight.scheduledDeparture}:00`
    : flight.scheduledDeparture;
  const predictionInputsChanged =
    newOrigin !== flight.origin.code ||
    newDestination !== flight.destination.code ||
    newDeparture !== originalDeparture ||
    newFlightNumber !== flight.flightNumber;

  const handleSave = async () => {
    setError('');
    if (!newFlightNumber || !date || !time) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^[A-Z]{3}$/.test(newOrigin) || !/^[A-Z]{3}$/.test(newDestination)) {
      setError('Use 3-letter airport codes, e.g. SFO');
      return;
    }
    if (newOrigin === newDestination) {
      setError('Origin and destination cannot be the same');
      return;
    }

    const prefix = newFlightNumber.match(/^([A-Z0-9]{2})\d/)?.[1];
    const airlineInfo = prefix ? getAirline(prefix) : undefined;
    if (!airlineInfo) {
      setError(
        'Flight number must start with a supported airline code, e.g. DL1234 or UA567'
      );
      return;
    }

    setIsSaving(true);
    const originInfo = getAirport(newOrigin);
    const destInfo = getAirport(newDestination);
    const edited: Flight = {
      ...flight,
      flightNumber: newFlightNumber,
      airline: { code: airlineInfo.code, name: airlineInfo.name },
      origin: {
        code: newOrigin,
        name: originInfo?.name ?? (newOrigin === flight.origin.code ? flight.origin.name : newOrigin),
        city: originInfo?.city ?? (newOrigin === flight.origin.code ? flight.origin.city : newOrigin),
      },
      destination: {
        code: newDestination,
        name: destInfo?.name ?? (newDestination === flight.destination.code ? flight.destination.name : newDestination),
        city: destInfo?.city ?? (newDestination === flight.destination.code ? flight.destination.city : newDestination),
      },
      scheduledDeparture: newDeparture,
    };

    if (predictionInputsChanged) {
      try {
        const prediction = await flyrelyApi.predict(
          buildPredictPayload(
            newOrigin,
            newDestination,
            newDeparture,
            airlineInfo.code,
            flight.id,
            newFlightNumber
          )
        );
        edited.riskLevel = prediction.risk_level;
        edited.delayProbability = prediction.delay_probability;
        edited.delayReason = prediction.risk_factors.slice(0, 2).join(' • ') || undefined;
        edited.warnings = prediction.warnings;
        edited.delaySeverity = prediction.delay_severity ?? undefined;
        edited.lastCheckedAt = Date.now();
      } catch (e) {
        setError(
          e instanceof PredictionUnavailableError
            ? 'Predictions are temporarily unavailable, so the flight was not changed. Please try again shortly.'
            : 'Could not get a new prediction, so the flight was not changed. Please check your inputs and try again.'
        );
        setIsSaving(false);
        return;
      }
    }

    saveFlight(edited);
    setIsSaving(false);
    goBack();
  };

  return (
    <div className="app-container">
      <div className="screen">
        <Header title="Edit Flight" showBack onBackClick={goBack} />

        <div className="flex-1 px-4 py-4 space-y-4">
          <div>
            <div className="block text-sm font-medium text-navy-700 mb-1">Flight number</div>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="block text-sm font-medium text-navy-700 mb-1">From</div>
              <input
                type="text"
                maxLength={3}
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                className={inputCls}
              />
            </div>
            <div>
              <div className="block text-sm font-medium text-navy-700 mb-1">To</div>
              <input
                type="text"
                maxLength={3}
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              leftIcon={<Calendar className="w-5 h-5" />}
            />
            <div>
              <div className="block text-sm font-medium text-navy-700 mb-1">Departure time</div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                  <Clock className="w-5 h-5" />
                </div>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>
          </div>

          {predictionInputsChanged && (
            <p className="text-sm text-navy-500">
              Changing the route, date, time or flight number gets a new delay prediction when you save.
            </p>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        </div>

        <div className="sticky bottom-0 p-4 bg-white border-t border-navy-100 flex gap-3">
          <Button variant="outline" fullWidth onClick={goBack}>
            Cancel
          </Button>
          <Button fullWidth onClick={handleSave} loading={isSaving}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
