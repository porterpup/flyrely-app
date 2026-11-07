import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, Clock } from 'lucide-react';
import { Alert, Button, Header, Input } from '~/components/ui';
import { getFlightById, saveFlight } from '~/lib/flightStore';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import { getAirport, getAirline } from '~/lib/airports';
import { parseFlightNumber } from '~/lib/utils';
import type { Flight } from '~/types';
import { COPILOT_ENABLED } from '~/copilot/flags';
import { releaseFlightCopilot } from '~/copilot/cleanup';

export const Route = createFileRoute('/flights/$flightId/edit')({
  component: EditFlightScreen,
});

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

    const parsed = parseFlightNumber(newFlightNumber);
    if (!parsed) {
      setError('Enter a valid flight number, e.g. DL1234 or B6123');
      return;
    }
    const airlineInfo = getAirline(parsed.airlineCode);

    setIsSaving(true);
    const originInfo = getAirport(newOrigin);
    const destInfo = getAirport(newDestination);
    const edited: Flight = {
      ...flight,
      flightNumber: `${parsed.airlineCode}${parsed.number}`,
      airline: { code: parsed.airlineCode, name: airlineInfo?.name ?? parsed.airlineCode },
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
            parsed.airlineCode,
            flight.id,
            `${parsed.airlineCode}${parsed.number}`
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
    if (COPILOT_ENABLED && predictionInputsChanged) void releaseFlightCopilot(flight.id);
    setIsSaving(false);
    goBack();
  };

  return (
    <div className="app-container">
      <div className="screen">
        <Header title="Edit Flight" showBack onBackClick={goBack} />

        <div className="flex-1 px-4 py-4 space-y-4">
          <Input label="Flight number" type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="text" maxLength={3} value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} />
            <Input label="To" type="text" maxLength={3} value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              leftIcon={<Calendar />}
            />
            <Input
              label="Departure time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              leftIcon={<Clock />}
            />
          </div>

          {predictionInputsChanged && (
            <p className="text-body-md text-ink-caption">
              Changing the route, date, time or flight number gets a new delay prediction when you save.
            </p>
          )}

          {error && <Alert status="error" showIcon={false} lineOne={error} />}
        </div>

        <div className="sticky bottom-0 p-4 bg-white border-t border-navy-100 flex gap-3">
          <Button variant="secondary" fullWidth onClick={goBack}>
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
