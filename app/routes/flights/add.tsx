import { useState, useRef, useEffect, useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Search, Calendar, Plane, Clock, Loader2 } from 'lucide-react';
import { Header, Button, Input, Select, SegmentedTabs, Alert } from '~/components/ui';
import { AirportAutocomplete } from '~/components/flight/AirportAutocomplete';
import { LookupResults } from '~/components/flight/LookupResults';
import { RouteSearch } from '~/components/flight/RouteSearch';
import { lookupFlight, LookupError, scheduleWarning } from '~/lib/flightLookup';
import type { LookupLeg, LookupResponse } from '~/lib/flightLookup';
import { localToday, formatDate, formatTime, parseFlightNumber } from '~/lib/utils';
import { getFlightById } from '~/lib/flightStore';
import { legDepartureISO, legArrivalISO } from '~/lib/flightLookup';
import { useTrackFlight, autoTrackSingle, legTrackInput } from '~/hooks/useTrackFlight';
import { useFlights } from '~/hooks/useFlights';
import { useGoBack } from '~/hooks/useGoBack';
import { useAuth } from '~/context/AuthContext';
import { AIRLINES, findAirline } from '~/lib/airlines';
import { getAirport } from '~/lib/airports';
import { getAirportRef } from '~/lib/airportRef';
import type { AirportInfo } from '~/lib/airports';
import { validateAirports } from '~/lib/airportRef';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/add')({
  validateSearch: (search: Record<string, unknown>): { after?: string } =>
    typeof search.after === 'string' && search.after ? { after: search.after } : {},
  component: AddFlightScreen,
});

// ── Main screen ────────────────────────────────────────────────────────────

/** Previously added flights, newest first, one per flight number + route. */
function dedupeRecent(flights: Flight[]): Flight[] {
  const seen = new Set<string>();
  return [...flights]
    .sort((a, b) => b.scheduledDeparture.localeCompare(a.scheduledDeparture))
    .filter((f) => {
      const key = `${f.flightNumber}-${f.origin.code}-${f.destination.code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

const OTHER_AIRLINE = '__other';

/** Device-local date `offset` days from today, as YYYY-MM-DD. */
function dayOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localToday(d);
}

function AddFlightScreen() {
  const track = useTrackFlight();
  const navigate = useNavigate();
  const goBack = useGoBack('/');
  // "Add connecting flight": ?after=<flightId> pre-fills the route search from that flight's destination and arrival date.
  const { after: afterFlightId } = Route.useSearch();
  const { flights: storedFlights } = useFlights();
  const { user } = useAuth();
  // Profile: the saved home airport pre-fills the route search origin (a connecting flight overrides it below).
  const profileHome = user?.profile.homeAirport ?? '';
  const preferredAirline = user?.profile.preferredAirline ?? null;

  // Flight number search
  const [airlineCode, setAirlineCodeState] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [otherAirline, setOtherAirline] = useState(false);
  const [originCode, setOriginCode] = useState(profileHome);
  const [, setOriginInfo] = useState<AirportInfo | undefined>();
  const [destCode, setDestCode] = useState('');
  const [, setDestInfo] = useState<AirportInfo | undefined>();
  const [tab, setTab] = useState<'number' | 'recent'>('number');
  // Route search lives on the Compare tab; inside Add it is only offered when connecting from another flight.
  const [showRoute, setShowRoute] = useState(false);
  const recent = useMemo(() => dedupeRecent(storedFlights), [storedFlights]);
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  // Lookup flow: airline + number + date -> matching legs. `manual` shows the full form instead.
  const [manual, setManual] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [lookupMiss, setLookupMiss] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [manualLookup, setManualLookup] = useState<LookupResponse | null>(null);

  const [error, setError] = useState('');
  const [airportErrors, setAirportErrors] = useState<{ origin?: string; dest?: string }>({});

  const prefilled = useRef(false);
  useEffect(() => {
    if (!afterFlightId || prefilled.current) return;
    const prev = getFlightById(afterFlightId);
    if (!prev) return;
    prefilled.current = true;
    setOriginCode(prev.destination.code);
    setOriginInfo(getAirport(prev.destination.code));
    setDate((prev.scheduledArrivalLocal ?? prev.scheduledDeparture).slice(0, 10));
  }, [afterFlightId, storedFlights]);

  /** Manual path: validate the typed details, then track directly. */
  const handleTrackManual = async () => {
    setError('');
    setAirportErrors({});
    if (!flightNumber.trim() || !date || !departureTime || !originCode || !destCode) {
      setError('Please fill in all fields');
      return;
    }
    const airportProblems = validateAirports(originCode, destCode);
    setAirportErrors(airportProblems);
    if (airportProblems.origin || airportProblems.dest) return;
    const dateError = validateDate();
    if (dateError) {
      setError(dateError);
      return;
    }
    if (otherAirline && !/^[A-Z0-9]{2}$/.test(airlineCode)) {
      setError('Enter the 2-character airline code, e.g. HA');
      return;
    }
    const parsed = parseFlightNumber(flightNumber);
    const bareNumber = flightNumber.trim().match(/^\d{1,4}[A-Za-z]?$/);
    let code: string;
    let number: string;
    if (parsed) {
      code = parsed.airlineCode;
      number = parsed.number;
    } else if (bareNumber && airlineCode) {
      code = airlineCode;
      number = flightNumber.trim().replace(/[A-Za-z]$/, '');
    } else if (bareNumber) {
      setError('Choose the airline');
      return;
    } else {
      setError('Enter a valid flight number, e.g. DL1234 or B6123');
      return;
    }
    setIsFinding(true);
    const message = await track({ airline: code, number, depISO: `${date}T${departureTime}:00`, origin: originCode, dest: destCode, after: afterFlightId });
    setIsFinding(false);
    if (message) setError(message);
  };

  const validateDate = (): string | null => {
    if (!date) return 'Pick the flight date';
    const [y, m, d] = date.split('-').map(Number);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) < startOfToday ? 'Cannot track flights in the past' : null;
  };

  /** Step 1: airline + flight number + date -> the leg(s) that flight flies. */
  const handleFind = async () => {
    setError('');
    setLookupMiss('');
    setLookup(null);
    setNotFound(false);
    const parsed = parseFlightNumber(flightNumber) ?? (/^\d{1,4}$/.test(flightNumber.trim()) && airlineCode
      ? { airlineCode, number: flightNumber.trim() } : null);
    if (!parsed) {
      setError(airlineCode ? 'Enter a valid flight number, e.g. 648' : 'Choose the airline and enter the flight number');
      return;
    }
    const dateError = validateDate();
    if (dateError) {
      setError(dateError);
      return;
    }
    setIsFinding(true);
    let found: LookupResponse | null = null;
    try {
      found = await lookupFlight(parsed.airlineCode, parsed.number, date);
    } catch (e) {
      if (e instanceof LookupError && (e.status === 404 || e.reason === 'not_found')) setNotFound(true);
      else setLookupMiss(e instanceof LookupError ? e.message : "We couldn't look that flight up right now.");
    }
    if (found) {
      const single = autoTrackSingle(found, date, track, afterFlightId);
      if (single) {
        const message = await single;
        if (message) setError(message);
      } else {
        setLookup(found);
      }
    }
    setIsFinding(false);
  };

  const goManual = () => {
    setAirportErrors({});
    setManual(true);
    setTab('number');
    setError('');
    setLookup(null);
    setLookupMiss('');
    setNotFound(false);
    setShowRoute(false);
  };

  /** A leg was picked from several: track it. */
  const handlePickLeg = async (leg: LookupLeg) => {
    if (!lookup) return;
    setError('');
    setIsFinding(true);
    const message = await track(legTrackInput(lookup, leg, date, afterFlightId));
    setIsFinding(false);
    if (message) setError(message);
  };

  // Manual mode: check the typed flight against the schedule so a wrong time is flagged (a warning, never a block).
  const manualParsed = parseFlightNumber(flightNumber) ?? (/^\d{1,4}$/.test(flightNumber.trim()) && airlineCode
    ? { airlineCode, number: flightNumber.trim() } : null);
  const manualKey = manual && manualParsed && date ? `${manualParsed.airlineCode}${manualParsed.number}|${date}` : '';
  useEffect(() => {
    setManualLookup(null);
    if (!manualKey) return;
    const [flightKey, day] = manualKey.split('|');
    let cancelled = false;
    const timer = setTimeout(() => {
      lookupFlight(flightKey.slice(0, 2), flightKey.slice(2), day)
        .then((r) => { if (!cancelled) setManualLookup(r); })
        .catch(() => {});
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [manualKey]);
  const timeWarning = manualLookup && manual ? scheduleWarning(manualLookup, originCode, destCode, departureTime) : null;

  const prevFlight = afterFlightId ? getFlightById(afterFlightId) : undefined;
  const prevCity = prevFlight ? (getAirportRef(prevFlight.destination.code)?.city ?? prevFlight.destination.city) : '';
  const typedParsed = parseFlightNumber(flightNumber);
  const bareDigits = /^\d+$/.test(flightNumber.trim());
  const today = dayOffset(0);
  const tomorrow = dayOffset(1);

  return (
    <div className="app-container">
      <main className="screen">
        <Header
          title="Add flight"
          showBack
          onBackClick={goBack}
        />

        <div className="pt-4" />

        <div className="flex-1 px-4">
          <SegmentedTabs
            aria-label="Add flight method"
            className="mb-6"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'number', label: 'Flight number' },
              { value: 'recent', label: 'Recent' },
            ]}
          />

          {tab === 'recent' && (
            <div className="space-y-3">
              {recent.length === 0 ? (
                <p className="text-center text-ink-caption py-10">
                  Flights you add will show up here.
                </p>
              ) : (
                recent.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setAirlineCodeState(f.airline.code);
                      setOtherAirline(!findAirline(f.airline.code));
                      setFlightNumber(f.flightNumber);
                      setOriginCode(f.origin.code);
                      setOriginInfo(getAirport(f.origin.code));
                      setDestCode(f.destination.code);
                      setDestInfo(getAirport(f.destination.code));
                      setDepartureTime(f.scheduledDeparture.split('T')[1]?.slice(0, 5) ?? '');
                      setDate('');
                      setManual(true);
                      setTab('number');
                    }}
                    className="w-full text-left rounded-tile border border-surface-stroke p-4 hover:border-surface-divider"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{f.flightNumber}</span>
                      <span className="text-body-md text-ink-caption">{f.airline.name}</span>
                    </div>
                    <p className="text-body-md text-ink-caption mt-1">
                      {f.origin.code} to {f.destination.code} · {formatTime(f.scheduledDeparture)}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {prevFlight && tab === 'number' && (
            <p className="mb-4 text-body-md text-ink-sub" data-testid="connecting-caption">
              Connecting from {prevCity} ({prevFlight.destination.code}){date ? ` · ${formatDate(`${date}T12:00:00`)}` : ''}
            </p>
          )}

          {tab === 'number' && showRoute && afterFlightId && (
            <>
              <RouteSearch
                initialOrigin={prevFlight?.destination.code ?? profileHome}
                initialDate={date}
                preferredAirline={preferredAirline}
                onPick={(f, day) =>
                  track({
                    airline: f.airline, number: f.flight_number, depISO: legDepartureISO(day, f), arrISO: legArrivalISO(day, f),
                    origin: f.origin, dest: f.dest, after: afterFlightId,
                  })
                }
              />
              <button type="button" className="mt-2 min-h-11 w-full text-center text-body-md text-ink-sub underline" onClick={() => setShowRoute(false)}>
                Search by flight number instead
              </button>
            </>
          )}

          {tab === 'number' && !showRoute && (
            <div className="space-y-4">
              <div>
                <Input
                  id="flight-number"
                  label="Flight number"
                  type="text"
                  value={flightNumber}
                  onChange={(e) => { setFlightNumber(e.target.value.toUpperCase()); setLookup(null); setLookupMiss(''); setNotFound(false); }}
                  placeholder="e.g. AA100 or B6 123"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {typedParsed && (
                  <p className="px-1 pt-1.5 text-body-sm text-ink-caption" data-testid="airline-caption">
                    {findAirline(typedParsed.airlineCode)?.name ?? `Airline code ${typedParsed.airlineCode}`}
                  </p>
                )}
              </div>
              {bareDigits && (
                <>
                  <Select
                    label="Airline"
                    id="airline"
                    value={otherAirline ? OTHER_AIRLINE : airlineCode}
                    placeholderSelected={!airlineCode && !otherAirline}
                    onChange={(e) => {
                      if (e.target.value === OTHER_AIRLINE) {
                        setOtherAirline(true);
                        setAirlineCodeState('');
                        return;
                      }
                      setOtherAirline(false);
                      setAirlineCodeState(AIRLINES.find((x) => x.code === e.target.value)?.code ?? '');
                    }}
                  >
                    <option value="">Select airline</option>
                    {AIRLINES.map((al) => (
                      <option key={al.code} value={al.code}>
                        {al.name}
                      </option>
                    ))}
                    <option value={OTHER_AIRLINE}>Other airline…</option>
                  </Select>
                  {otherAirline && (
                    <Input
                      id="airline-code"
                      label="Airline code"
                      type="text"
                      value={airlineCode}
                      maxLength={2}
                      autoCapitalize="characters"
                      placeholder="2-character IATA code, e.g. QX"
                      onChange={(e) => setAirlineCodeState(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2))}
                    />
                  )}
                </>
              )}
              {manual && <div className="grid grid-cols-2 gap-3">
                <AirportAutocomplete
                  key="mfrom"
                  label="From"
                  placeholder="e.g., SFO"
                  value={originCode}
                  onChange={(code, info) => { setOriginCode(code); setOriginInfo(info); setAirportErrors((e) => ({ ...e, origin: undefined })); }}
                  error={airportErrors.origin}
                  leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
                />
                <AirportAutocomplete
                  key="mto"
                  label="To"
                  placeholder="e.g., JFK"
                  value={destCode}
                  onChange={(code, info) => { setDestCode(code); setDestInfo(info); setAirportErrors((e) => ({ ...e, dest: undefined })); }}
                  error={airportErrors.dest}
                  leftIcon={<Plane className="w-5 h-5 rotate-45" />}
                />
              </div>}
              <div className={manual ? 'grid grid-cols-2 gap-3' : undefined}>
                <div>
                  <div className="flex gap-2 pb-2" role="group" aria-label="Quick dates">
                    {([['Today', today], ['Tomorrow', tomorrow]] as const).map(([label, value]) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="secondary"
                        aria-pressed={date === value}
                        className={date === value ? 'bg-surface-muted' : undefined}
                        onClick={() => { setDate(value); setLookup(null); setLookupMiss(''); setNotFound(false); }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    label="Date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setLookup(null); setLookupMiss(''); setNotFound(false); }}
                    leftIcon={<Calendar />}
                  />
                </div>
                {manual && <Input
                  label="Departure time"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  leftIcon={<Clock />}
                />}
              </div>
              {timeWarning && <Alert status="warning" showIcon={false} lineOne={timeWarning} />}
            </div>
          )}

          {error && !showRoute && (
            <Alert className="mt-4" status="error" showIcon={false} lineOne={error} />
          )}

          {tab === 'number' && !manual && !showRoute && (
            <>
              <Button
                fullWidth
                className="mt-6"
                onClick={handleFind}
                disabled={isFinding}
                icon={isFinding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" />}
              >
                {isFinding ? 'Searching…' : 'Find flight'}
              </Button>

              {lookupMiss && (
                <Alert className="mt-4" status="warning" showIcon={false} lineOne={lookupMiss} />
              )}

              {notFound && (
                <Alert
                  className="mt-4"
                  status="warning"
                  showIcon={false}
                  lineOne={`We couldn't find ${(typedParsed ? `${typedParsed.airlineCode}${typedParsed.number}` : flightNumber.trim()).toUpperCase()} on ${formatDate(`${date}T12:00:00`)}. We cover US domestic flights, and we don't have every schedule yet. Try searching by route instead.`}
                  lineTwo={
                    <span className="mt-1 flex flex-wrap gap-x-2">
                      <Button size="sm" variant="text" onClick={() => { setNotFound(false); if (afterFlightId) setShowRoute(true); else navigate({ to: '/explore' }); }}>Search by route</Button>
                      <Button size="sm" variant="text" onClick={goManual}>Enter details manually</Button>
                    </span>
                  }
                />
              )}

              {lookup && (
                <div className="mt-6">
                  <LookupResults
                    flight={lookup.flight}
                    legs={lookup.matches}
                    note={lookup.note}
                    disabled={isFinding}
                    onPick={handlePickLeg}
                  />
                </div>
              )}

              {afterFlightId ? (
                <button
                  type="button"
                  className="mt-2 min-h-11 w-full text-center text-body-md text-ink-sub underline"
                  onClick={() => setShowRoute(true)}
                >
                  Search by route instead
                </button>
              ) : (
                <p className="mt-3 text-center text-body-md text-ink-sub">
                  No flight number yet?{' '}
                  <Link to="/explore" className="font-semibold text-ink underline underline-offset-2">
                    Compare flights on a route
                  </Link>
                </p>
              )}
              <button
                type="button"
                className="mt-2 min-h-11 w-full text-center text-body-md text-ink-sub underline"
                onClick={goManual}
              >
                Enter details manually
              </button>
            </>
          )}

          {tab === 'number' && manual && !showRoute && (
            <>
              <Button
                fullWidth
                className="mt-6"
                onClick={handleTrackManual}
                disabled={isFinding}
                icon={isFinding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : undefined}
              >
                {isFinding ? 'Tracking…' : 'Track flight'}
              </Button>
              <button
                type="button"
                className="mt-2 min-h-11 w-full text-center text-body-md text-ink-sub underline"
                onClick={() => { setManual(false); setError(''); }}
              >
                Look up by flight number instead
              </button>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
