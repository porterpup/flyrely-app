import { useState, useRef, useEffect, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, Calendar, Plane, Clock, Loader2 } from 'lucide-react';
import { Header, Button, Input, Select, SegmentedTabs, Alert } from '~/components/ui';
import { AirportAutocomplete } from '~/components/flight/AirportAutocomplete';
import { LookupResults } from '~/components/flight/LookupResults';
import { RouteResults } from '~/components/flight/RouteResults';
import { lookupFlight, searchFlights, LookupError, scheduleWarning } from '~/lib/flightLookup';
import type { LookupLeg, LookupResponse, SearchFlight, SearchResponse } from '~/lib/flightLookup';
import { planAddFlight, shiftClock } from '~/lib/addFlightForm';
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
  // Route path: B (From, To, departure time) -> the flights near that time, each with a delay chance.
  const [routeResult, setRouteResult] = useState<SearchResponse | null>(null);
  const [routeNote, setRouteNote] = useState('');

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

  /** Manual path (after a lookup miss): needs the flight number AND the route and time, then tracks directly. */
  const handleTrackManual = async () => {
    setError('');
    setAirportErrors({});
    const plan = planAddFlight({ ...formFields(), timeOptional: false });
    if (plan.kind === 'error') {
      setError(plan.message);
      return;
    }
    if (plan.kind !== 'number') {
      setError('Enter the flight number to track it by hand.');
      return;
    }
    if (originCode.length !== 3 || destCode.length !== 3 || !departureTime) {
      setError('To track it by hand, choose From, To and a departure time as well as the flight number.');
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
    setIsFinding(true);
    const message = await track({ airline: plan.airline, number: plan.number, depISO: `${date}T${departureTime}:00`, origin: originCode, dest: destCode, after: afterFlightId });
    setIsFinding(false);
    if (message) setError(message);
  };

  const validateDate = (): string | null => {
    if (!date) return 'Pick the flight date.';
    const [y, m, d] = date.split('-').map(Number);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) < startOfToday ? 'Cannot track flights in the past' : null;
  };

  const formFields = (over: { flightNumber?: string } = {}) => ({
    flightNumber: over.flightNumber ?? flightNumber, airlineCode, date, origin: originCode, dest: destCode, departureTime,
    otherAirline, timeOptional: !!afterFlightId,
  });
  const routeReady = originCode.length === 3 && destCode.length === 3 && (!!departureTime || !!afterFlightId);

  const resetResults = () => { setError(''); setLookup(null); setLookupMiss(''); setNotFound(false); setRouteResult(null); setRouteNote(''); };

  /** Either-or search: a flight number (lookup), or From + To + departure time (route search). Flight number wins when both are filled. */
  const handleFind = async (over?: { flightNumber?: string }) => {
    setError('');
    resetResults();
    setAirportErrors({});
    const plan = planAddFlight(formFields(over));
    if (plan.kind === 'error') {
      setError(plan.message);
      return;
    }
    const dateError = validateDate();
    if (dateError) {
      setError(dateError);
      return;
    }
    if (plan.kind === 'route') {
      const problems = validateAirports(plan.origin, plan.dest);
      setAirportErrors(problems);
      if (problems.origin || problems.dest) return;
      setIsFinding(true);
      const day = { after: '', before: '' };
      if (plan.departureTime) {
        // Flights leaving within an hour either side of the time entered.
        day.after = shiftClock(plan.departureTime, -60);
        day.before = shiftClock(plan.departureTime, 60);
      }
      try {
        try {
          setRouteResult(await searchFlights(plan.origin, plan.dest, date, day));
        } catch (e) {
          if (!(day.after && e instanceof LookupError && e.status === 404)) throw e;
          // Nothing near that time: show the whole day instead of a dead end.
          setRouteResult(await searchFlights(plan.origin, plan.dest, date));
          setRouteNote('Nothing leaves near that time, so here is the whole day.');
        }
      } catch (e) {
        setLookupMiss(e instanceof LookupError ? e.message : "We couldn't search flights right now.");
      }
      setIsFinding(false);
      return;
    }
    setIsFinding(true);
    let found: LookupResponse | null = null;
    try {
      found = await lookupFlight(plan.airline, plan.number, date);
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

  /** A route-search flight was picked: track it. */
  const handlePickRoute = async (f: SearchFlight) => {
    setError('');
    setIsFinding(true);
    const message = await track({
      airline: f.airline, number: f.flight_number, depISO: legDepartureISO(date, f), arrISO: legArrivalISO(date, f),
      origin: f.origin, dest: f.dest, after: afterFlightId,
    });
    setIsFinding(false);
    if (message) setError(message);
  };

  const goManual = () => {
    setAirportErrors({});
    setManual(true);
    setTab('number');
    setError('');
    setLookup(null);
    setLookupMiss('');
    setNotFound(false);
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
              { value: 'number', label: 'Search' },
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
                      setManual(false);
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

          {tab === 'number' && (
            <div className="space-y-4">
              {manual ? (
                <p className="px-1 text-body-md text-ink-sub">Fill in everything to track this flight by hand.</p>
              ) : (
                <p id="either-or-hint" className="px-1 text-body-md text-ink-sub">
                  Enter a flight number, or the route and time.
                </p>
              )}

              <div>
                <Input
                  label="Date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => { setDate(e.target.value); resetResults(); }}
                  leftIcon={<Calendar />}
                />
                <div className="flex gap-2 pt-2" role="group" aria-label="Quick dates">
                  {([['Today', today], ['Tomorrow', tomorrow]] as const).map(([label, value]) => (
                    <Button
                      key={label}
                      size="sm"
                      variant="secondary"
                      aria-pressed={date === value}
                      className={date === value ? 'border-surface-accent bg-surface-panel' : undefined}
                      onClick={() => { setDate(value); resetResults(); }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <section aria-label="Search by flight number" className="space-y-4">
                <div>
                  <Input
                    id="flight-number"
                    label="Flight number"
                    type="text"
                    value={flightNumber}
                    onChange={(e) => { setFlightNumber(e.target.value.toUpperCase()); resetResults(); }}
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
              </section>

              {!manual && (
                <div role="separator" aria-label="or" className="flex items-center gap-3 text-body-md font-semibold text-ink-sub">
                  <span className="h-px flex-1 bg-surface-divider" aria-hidden />
                  or
                  <span className="h-px flex-1 bg-surface-divider" aria-hidden />
                </div>
              )}

              <section aria-label="Search by route and departure time" className="space-y-4">
                <AirportAutocomplete
                  key="mfrom"
                  label="From"
                  placeholder="e.g., SFO"
                  value={originCode}
                  onChange={(code, info) => { setOriginCode(code); setOriginInfo(info); setAirportErrors((e) => ({ ...e, origin: undefined })); resetResults(); }}
                  error={airportErrors.origin}
                  leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
                />
                <AirportAutocomplete
                  key="mto"
                  label="To"
                  placeholder="e.g., JFK"
                  value={destCode}
                  onChange={(code, info) => { setDestCode(code); setDestInfo(info); setAirportErrors((e) => ({ ...e, dest: undefined })); resetResults(); }}
                  error={airportErrors.dest}
                  leftIcon={<Plane className="w-5 h-5 rotate-45" />}
                />
                <Input
                  label={afterFlightId && !manual ? 'Departure time (optional)' : 'Departure time'}
                  hint="Local time at the departure airport"
                  type="time"
                  value={departureTime}
                  onChange={(e) => { setDepartureTime(e.target.value); resetResults(); }}
                  leftIcon={<Clock />}
                />
              </section>
              {timeWarning && <Alert status="info" showIcon={false} lineOne={timeWarning} />}
            </div>
          )}

          {error && (
            <Alert className="mt-4" status="error" showIcon={false} lineOne={error} />
          )}

          {tab === 'number' && !manual && (
            <>
              <Button
                fullWidth
                className="mt-6"
                onClick={() => handleFind()}
                disabled={isFinding}
                icon={isFinding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="w-4 h-4" />}
              >
                {isFinding ? 'Searching…' : 'Find flight'}
              </Button>

              {lookupMiss && (
                <Alert
                  className="mt-4"
                  status="info"
                  showIcon={false}
                  lineOne={lookupMiss}
                  lineTwo={
                    <span className="mt-1 flex flex-wrap gap-x-2">
                      <Button size="sm" variant="text" onClick={goManual}>Enter details manually</Button>
                    </span>
                  }
                />
              )}

              {notFound && (
                <Alert
                  className="mt-4"
                  status="info"
                  showIcon={false}
                  lineOne={`We couldn't find ${(typedParsed ? `${typedParsed.airlineCode}${typedParsed.number}` : flightNumber.trim()).toUpperCase()} on ${formatDate(`${date}T12:00:00`)}. We cover US domestic flights, and we don't have every schedule yet.${routeReady ? '' : ' You can also search by route.'}`}
                  lineTwo={
                    <span className="mt-1 flex flex-wrap gap-x-2">
                      {routeReady && (
                        <Button size="sm" variant="text" onClick={() => { setFlightNumber(''); handleFind({ flightNumber: '' }); }}>
                          Search by route instead
                        </Button>
                      )}
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

              {routeResult && (
                <div className="mt-6">
                  {routeNote && <p className="mb-3 text-body-md text-ink-sub">{routeNote}</p>}
                  <RouteResults
                    flights={routeResult.flights}
                    asOf={routeResult.schedule_as_of}
                    disabled={isFinding}
                    preferredAirline={preferredAirline}
                    afterArrivalLocal={prevFlight?.scheduledArrivalLocal}
                    date={date}
                    onPick={handlePickRoute}
                  />
                </div>
              )}
            </>
          )}

          {tab === 'number' && manual && (
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
                Back to searching
              </button>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
