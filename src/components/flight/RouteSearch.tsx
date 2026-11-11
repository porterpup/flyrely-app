import { useState } from 'react';
import { Search, Calendar, Plane, Clock } from 'lucide-react';
import { Button, Input, Alert } from '~/components/ui';
import { AirportAutocomplete } from './AirportAutocomplete';
import { RouteResults } from './RouteResults';
import { searchFlights, LookupError } from '~/lib/flightLookup';
import type { SearchFlight, SearchResponse } from '~/lib/flightLookup';
import { localToday } from '~/lib/utils';
import { validateAirports } from '~/lib/airportRef';

/** From / To / date (+ optional time window) -> every flight that day, each with a delay chance. */
export function RouteSearch({
  initialOrigin = '',
  initialDate = '',
  preferredAirline,
  afterArrivalLocal,
  onPick,
}: {
  initialOrigin?: string;
  initialDate?: string;
  preferredAirline?: string | null;
  /** Connecting flight: the previous leg's arrival (local wall-clock). Results leaving before it, or over 24 hours after, are hidden. */
  afterArrivalLocal?: string;
  /** A flight was picked; `date` is the searched day (YYYY-MM-DD). Resolves to an error message, or null. */
  onPick: (flight: SearchFlight, date: string) => Promise<string | null | void> | void;
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [dest, setDest] = useState('');
  const [date, setDate] = useState(initialDate);
  const [earliest, setEarliest] = useState('');
  const [latest, setLatest] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [miss, setMiss] = useState('');
  const [error, setError] = useState('');
  const [airportErrors, setAirportErrors] = useState<{ origin?: string; dest?: string }>({});

  const validateDate = (): string | null => {
    if (!date) return 'Pick the flight date';
    const [y, m, d] = date.split('-').map(Number);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) < startOfToday ? 'Cannot search flights in the past' : null;
  };

  const handleSearch = async () => {
    setError('');
    setMiss('');
    setResult(null);
    setAirportErrors({});
    if (origin.length !== 3 || dest.length !== 3) {
      setError('Choose the From and To airports');
      return;
    }
    const problems = validateAirports(origin, dest);
    if (problems.origin || problems.dest) {
      setAirportErrors(problems);
      return;
    }
    const dateError = validateDate();
    if (dateError) {
      setError(dateError);
      return;
    }
    setBusy(true);
    try {
      setResult(await searchFlights(origin, dest, date, { after: earliest, before: latest }));
    } catch (e) {
      setMiss(e instanceof LookupError ? e.message : "We couldn't search flights right now.");
    }
    setBusy(false);
  };

  const handlePick = async (f: SearchFlight) => {
    setError('');
    setBusy(true);
    const message = await onPick(f, date);
    setBusy(false);
    if (message) setError(message);
  };

  const reset = () => { setResult(null); setMiss(''); };

  return (
    <div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AirportAutocomplete
            key="rfrom"
            label="From"
            placeholder="e.g., EWR"
            value={origin}
            onChange={(code) => { setOrigin(code); reset(); setAirportErrors((e) => ({ ...e, origin: undefined })); }}
            error={airportErrors.origin}
            leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
          />
          <AirportAutocomplete
            key="rto"
            label="To"
            placeholder="e.g., SFO"
            value={dest}
            onChange={(code) => { setDest(code); reset(); setAirportErrors((e) => ({ ...e, dest: undefined })); }}
            error={airportErrors.dest}
            leftIcon={<Plane className="w-5 h-5 rotate-45" />}
          />
        </div>
        <Input
          label="Date"
          type="date"
          min={localToday()}
          value={date}
          onChange={(e) => { setDate(e.target.value); reset(); }}
          leftIcon={<Calendar />}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Earliest (optional)" type="time" value={earliest}
            onChange={(e) => { setEarliest(e.target.value); setResult(null); }} leftIcon={<Clock />} />
          <Input label="Latest (optional)" type="time" value={latest}
            onChange={(e) => { setLatest(e.target.value); setResult(null); }} leftIcon={<Clock />} />
        </div>
      </div>

      {error && <Alert className="mt-4" status="error" showIcon={false} lineOne={error} />}

      <Button fullWidth className="mt-6" onClick={handleSearch} loading={busy && !result} icon={<Search className="w-4 h-4" />}>
        Find flights
      </Button>
      {miss && <Alert className="mt-4" status="warning" showIcon={false} lineOne={miss} />}
      {result && (
        <div className="mt-6">
          <RouteResults
            flights={result.flights}
            asOf={result.schedule_as_of}
            disabled={busy}
            preferredAirline={preferredAirline}
            afterArrivalLocal={afterArrivalLocal}
            date={date}
            onPick={handlePick}
          />
        </div>
      )}
    </div>
  );
}
