import { useState, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, Clock, SearchX } from 'lucide-react';
import { Alert, Button, EmptyState, Header, Input, Skeleton } from '~/components/ui';
import { getFlightById, revalidateTrip, saveFlight, withdrawSelfReport } from '~/lib/flightStore';
import { reportNeedsWithdrawal } from '~/lib/flightReport';
import { emitNotice } from '~/lib/syncEngine';
import { normalizeLocal } from '~/lib/cloudFlights';
import { useFlights } from '~/hooks/useFlights';
import { useGoBack } from '~/hooks/useGoBack';
import { weatherFromPrediction } from '~/lib/weather';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import { getAirport, getAirline } from '~/lib/airports';
import { parseFlightNumber, topReasons } from '~/lib/utils';
import { validateAirports } from '~/lib/airportRef';
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
  const [arrDate, setArrDate] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const { flights: storedFlights, ready } = useFlights();
  const inStore = storedFlights.some((x) => x.id === flightId);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (loadedId.current === flightId) return;
    const f = getFlightById(flightId);
    if (!f) {
      // Only after the first download: a fresh device must not say "not found" before the cloud copy arrives.
      if (ready) setNotFound(true);
      return;
    }
    loadedId.current = flightId;
    setNotFound(false);
    setFlight(f);
    setFlightNumber(f.flightNumber);
    setOrigin(f.origin.code);
    setDestination(f.destination.code);
    const [d, t] = f.scheduledDeparture.split('T');
    setDate(d);
    setTime((t ?? '').slice(0, 5));
    if (f.scheduledArrivalLocal) {
      const [ad, at] = f.scheduledArrivalLocal.split('T');
      setArrDate(ad);
      setArrTime((at ?? '').slice(0, 5));
    }
  }, [flightId, ready, inStore]);

  const goBack = useGoBack(`/flights/${flightId}`);

  if (notFound) {
    return (
      <div className="app-container">
        <main className="screen">
          <Header title="Edit flight" showBack onBackClick={goBack} />
          <EmptyState
            className="flex-1 justify-center"
            icon={<SearchX />}
            title="Flight not found"
            description="This flight may have been removed."
            action={<Button onClick={() => navigate({ to: '/' })}>Go home</Button>}
          />
        </main>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="app-container">
        <main className="screen">
          <Header title="Edit flight" showBack onBackClick={goBack} />
          <div className="space-y-4 px-6 pt-4" role="status" aria-label="Loading flight">
            <Skeleton className="h-14 rounded-field" />
            <Skeleton className="h-14 rounded-field" />
            <Skeleton className="h-14 rounded-field" />
            <Skeleton className="h-14 rounded-field" />
          </div>
        </main>
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
    const airportErrors = validateAirports(newOrigin, newDestination);
    if (airportErrors.origin || airportErrors.dest) {
      setError(airportErrors.origin ?? airportErrors.dest ?? '');
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
        edited.delayReason = topReasons(prediction.risk_factors);
        edited.warnings = prediction.warnings;
        edited.delaySeverity = prediction.delay_severity ?? undefined;
        edited.weather = weatherFromPrediction(prediction);
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

    // Optional arrival time (local time at the destination).
    const arrivalInput = arrTime ? `${arrDate || date}T${arrTime}:00` : undefined;
    const arrivalUntouched = arrivalInput !== undefined && arrivalInput === normalizeLocal(flight.scheduledArrivalLocal);
    if (arrivalInput && !(predictionInputsChanged && arrivalUntouched)) {
      if (!arrivalUntouched) {
        edited.scheduledArrivalLocal = arrivalInput;
        edited.arrivalSource = 'manual';
      }
    } else {
      // Cleared, or it belonged to the old flight details.
      delete edited.scheduledArrivalLocal;
      delete edited.arrivalSource;
    }

    saveFlight(edited);
    // A report about the old flight no longer describes this one: withdraw it (or just drop it if it was never sent).
    if (reportNeedsWithdrawal(flight, edited)) withdrawSelfReport(flight.id);
    // An edited leg may no longer connect (other airport, or a layover of 0 or more than 24 h): ungroup, as on delete.
    if (flight.tripId && revalidateTrip(flight.tripId) === 'ungrouped_not_connected') {
      emitNotice('Trip ungrouped because the flights no longer connect.', 'warning');
    }
    if (COPILOT_ENABLED && predictionInputsChanged) void releaseFlightCopilot(flight.id);
    setIsSaving(false);
    // Back to where Edit was opened (the flight or trip page); pushing the flight page here would leave this form
    // in history, so Back from the flight page reopened it.
    goBack();
  };

  return (
    <div className="app-container">
      <main className="screen">
        <Header title="Edit flight" showBack onBackClick={goBack} />

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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Arrival date (optional)"
              type="date"
              value={arrDate || date}
              onChange={(e) => setArrDate(e.target.value)}
              leftIcon={<Calendar />}
            />
            <Input
              label="Arrival time (optional)"
              type="time"
              value={arrTime}
              onChange={(e) => setArrTime(e.target.value)}
              leftIcon={<Clock />}
              hint="Local time at the destination"
            />
          </div>

          {predictionInputsChanged && (
            <p className="text-body-md text-ink-caption">
              Changing the route, date, time or flight number gets a new delay prediction when you save.
            </p>
          )}

          {error && <Alert status="error" showIcon={false} lineOne={error} />}
        </div>

        <div className="sticky bottom-0 p-4 bg-white border-t border-surface-stroke flex gap-3">
          <Button variant="secondary" fullWidth onClick={goBack}>
            Cancel
          </Button>
          <Button fullWidth onClick={handleSave} loading={isSaving}>
            Save changes
          </Button>
        </div>
      </main>
    </div>
  );
}
