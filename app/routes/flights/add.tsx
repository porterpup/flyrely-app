import { useState, useRef, useEffect, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Calendar, Plane, Check, ArrowRight, Clock } from 'lucide-react';
import { Header, Button, Input, Select, SegmentedTabs, Alert, Modal } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import { AirportAutocomplete } from '~/components/flight/AirportAutocomplete';
import { LookupResults } from '~/components/flight/LookupResults';
import { RouteResults } from '~/components/flight/RouteResults';
import { lookupFlight, searchFlights, LookupError, legDepartureISO, legArrivalISO, scheduleWarning } from '~/lib/flightLookup';
import type { LookupLeg, LookupResponse, SearchFlight, SearchResponse } from '~/lib/flightLookup';
import { cn, formatDate, formatTime, formatDelayChance, formatDelayPercent, newUuid, parseFlightNumber, topReasons } from '~/lib/utils';
import { weatherFromPrediction } from '~/lib/weather';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import { saveFlight, getFlightById, createTrip, appendLeg, getTripById } from '~/lib/flightStore';
import { legsOf, tripErrorMessage, validateTripLegs } from '~/lib/tripGrouping';
import { useFlights } from '~/hooks/useFlights';
import { useAuth } from '~/context/AuthContext';
import { AIRLINES, getAirport } from '~/lib/airports';
import type { AirportInfo } from '~/lib/airports';
import { getAirportRef, validateAirports } from '~/lib/airportRef';
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

function predictionErrorMessage(e: unknown): string {
  return e instanceof PredictionUnavailableError
    ? 'Predictions are temporarily unavailable. Please try again shortly.'
    : 'Could not get prediction. Please check your inputs and try again.';
}

function AddFlightScreen() {
  const navigate = useNavigate();
  // "Add connecting flight": ?after=<flightId> pre-fills the route search from that flight's destination and arrival date.
  const { after: afterFlightId } = Route.useSearch();
  const { flights: storedFlights } = useFlights();
  const { user } = useAuth();
  // Profile: the saved home airport pre-fills the route search origin (a connecting flight overrides it below).
  const profileHome = user?.profile.homeAirport ?? '';
  const preferredAirline = user?.profile.preferredAirline ?? null;

  // Flight number search
  const [airlineName, setAirlineName] = useState('');
  const [airlineCode, setAirlineCodeState] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [otherAirline, setOtherAirline] = useState(false);
  const [originCode, setOriginCode] = useState(profileHome);
  const [originInfo, setOriginInfo] = useState<AirportInfo | undefined>(profileHome ? getAirport(profileHome) : undefined);
  const [destCode, setDestCode] = useState('');
  const [destInfo, setDestInfo] = useState<AirportInfo | undefined>();
  const [tab, setTab] = useState<'number' | 'route' | 'recent'>('number');
  const recent = useMemo(() => dedupeRecent(storedFlights), [storedFlights]);
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  // Lookup flow: airline + number + date -> matching legs. `manual` shows the full form instead.
  const [manual, setManual] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [lookupMiss, setLookupMiss] = useState('');
  // Route search: From/To + date (+ optional time window) -> every flight that day, each with a delay chance.
  const [after, setAfter] = useState('');
  const [before, setBefore] = useState('');
  const [routeResult, setRouteResult] = useState<SearchResponse | null>(null);
  const [routeMiss, setRouteMiss] = useState('');
  const [manualLookup, setManualLookup] = useState<LookupResponse | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Flight | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [airportErrors, setAirportErrors] = useState<{ origin?: string; dest?: string }>({});

  const prefilled = useRef(false);
  useEffect(() => {
    if (!afterFlightId || prefilled.current) return;
    const prev = getFlightById(afterFlightId);
    if (!prev) return;
    prefilled.current = true;
    setTab('route');
    setOriginCode(prev.destination.code);
    setOriginInfo(getAirport(prev.destination.code));
    setDate((prev.scheduledArrivalLocal ?? prev.scheduledDeparture).slice(0, 10));
  }, [afterFlightId, storedFlights]);

  // Typing a full flight number like "B6123" picks (or fills in) the airline.
  const handleFlightNumberChange = (value: string) => {
    const parsed = parseFlightNumber(value);
    if (!parsed) {
      setFlightNumber(value);
      return;
    }
    const known = AIRLINES.find((x) => x.code === parsed.airlineCode);
    setAirlineCodeState(parsed.airlineCode);
    setAirlineName(known?.name ?? parsed.airlineCode);
    setOtherAirline(!known);
    setFlightNumber(parsed.number);
  };

  const handleSearch = async () => {
    setError('');
    setAirportErrors({});
    setIsSearching(true);
    setSearchResult(null);

    {
      if (!airlineName || !flightNumber || !date || !departureTime || !originCode || !destCode) {
        setError('Please fill in all fields');
        setIsSearching(false);
        return;
      }
      const airportProblems = validateAirports(originCode, destCode);
      setAirportErrors(airportProblems);
      if (airportProblems.origin || airportProblems.dest) {
        setIsSearching(false);
        return;
      }
      const [y, m, d] = date.split('-').map(Number);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (new Date(y, m - 1, d) < startOfToday) {
        setError('Cannot track flights in the past');
        setIsSearching(false);
        return;
      }

      if (otherAirline && !/^[A-Z0-9]{2}$/.test(airlineCode)) {
        setError('Enter the 2-character airline code, e.g. HA');
        setIsSearching(false);
        return;
      }

      try {
        const parsed = parseFlightNumber(flightNumber);
        const bareNumber = flightNumber.trim().match(/^\d{1,4}[A-Za-z]?$/);
        let derivedCode: string;
        let numericFlight: string;
        if (parsed) {
          derivedCode = parsed.airlineCode;
          numericFlight = parsed.number;
        } else if (bareNumber) {
          derivedCode = airlineCode || airlineName.slice(0, 2).toUpperCase();
          numericFlight = flightNumber.trim().replace(/[A-Za-z]$/, '');
        } else {
          setError('Enter a valid flight number, e.g. DL1234 or B6123');
          setIsSearching(false);
          return;
        }
        const depISO = `${date}T${departureTime}:00`;
        const flight = await predictFlight(derivedCode, numericFlight, depISO, originCode, destCode, originInfo, destInfo);
        setSearchResult(flight);
      } catch (e) {
        setError(predictionErrorMessage(e));
      }
    }

    setIsSearching(false);
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
    setSearchResult(null);
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
    try {
      setLookup(await lookupFlight(parsed.airlineCode, parsed.number, date));
    } catch (e) {
      setLookupMiss(e instanceof LookupError ? e.message : "We couldn't look that flight up right now.");
    }
    setIsFinding(false);
  };

  const handleRouteSearch = async () => {
    setError('');
    setRouteMiss('');
    setRouteResult(null);
    setAirportErrors({});
    if (originCode.length !== 3 || destCode.length !== 3) {
      setError('Choose the From and To airports');
      return;
    }
    const airportProblems = validateAirports(originCode, destCode);
    if (airportProblems.origin || airportProblems.dest) {
      setAirportErrors(airportProblems);
      return;
    }
    const dateError = validateDate();
    if (dateError) {
      setError(dateError);
      return;
    }
    setIsFinding(true);
    try {
      setRouteResult(await searchFlights(originCode, destCode, date, { after, before }));
    } catch (e) {
      setRouteMiss(e instanceof LookupError ? e.message : "We couldn't search flights right now.");
    }
    setIsFinding(false);
  };

  /** A flight was picked from the route list: the stored time is the scheduled one. */
  const handlePickRouteFlight = async (f: SearchFlight) => {
    setError('');
    setIsFinding(true);
    try {
      const flight = await predictFlight(
        f.airline, f.flight_number, legDepartureISO(date, f), f.origin, f.dest,
        getAirport(f.origin), getAirport(f.dest), legArrivalISO(date, f));
      setSearchResult(flight);
      setShowConfirmModal(true);
    } catch (e) {
      setError(predictionErrorMessage(e));
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
    setRouteResult(null);
    setRouteMiss('');
  };

  /** Step 2: a leg was picked; score it and open the "Track this flight?" confirmation. */
  const handlePickLeg = async (leg: LookupLeg) => {
    if (!lookup) return;
    setError('');
    setIsFinding(true);
    try {
      const flight = await predictFlight(
        lookup.airline, lookup.flight_number, legDepartureISO(date, leg),
        leg.origin, leg.dest, getAirport(leg.origin), getAirport(leg.dest), legArrivalISO(date, leg));
      setSearchResult(flight);
      setShowConfirmModal(true);
    } catch (e) {
      setError(predictionErrorMessage(e));
    }
    setIsFinding(false);
  };

  const predictFlight = async (
    code: string, number: string, depISO: string, oCode: string, dCode: string,
    oInfo?: AirportInfo, dInfo?: AirportInfo, arrivalISO?: string
  ): Promise<Flight> => {
    const fullFlightNumber = `${code}${number}`;
    const flightId = `flight-${newUuid()}`;
    const payload = buildPredictPayload(oCode, dCode, depISO, code, flightId, fullFlightNumber);
    const prediction = await flyrelyApi.predict(payload);
    return {
      id: flightId,
      flightNumber: fullFlightNumber,
      airline: { code, name: AIRLINES.find((x) => x.code === code)?.name ?? (airlineName || code) },
      origin: {
        code: oCode,
        name: oInfo?.name ?? getAirportRef(oCode)?.name ?? oCode,
        city: oInfo?.city ?? getAirportRef(oCode)?.city ?? oCode,
      },
      destination: {
        code: dCode,
        name: dInfo?.name ?? getAirportRef(dCode)?.name ?? dCode,
        city: dInfo?.city ?? getAirportRef(dCode)?.city ?? dCode,
      },
      scheduledDeparture: depISO,
      status: 'scheduled',
      riskLevel: prediction.risk_level,
      delayProbability: prediction.delay_probability,
      delayReason: topReasons(prediction.risk_factors),
      delaySeverity: prediction.delay_severity ?? undefined,
      warnings: prediction.warnings,
      weather: weatherFromPrediction(prediction),
      ...(arrivalISO ? { scheduledArrivalLocal: arrivalISO, arrivalSource: 'lookup' as const } : {}),
    };
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

  const handleAddFlight = async () => {
    const flightToSave = searchResult;
    if (!flightToSave) return;
    // "Add connecting flight": check it connects before saving anything.
    const prev = afterFlightId ? getFlightById(afterFlightId) : undefined;
    if (prev) {
      const trip = prev.tripId ? getTripById(prev.tripId) : undefined;
      const chain = [...(trip ? legsOf(trip, storedFlights) : [prev]), flightToSave];
      const check = validateTripLegs(chain);
      if (!check.ok) {
        setShowConfirmModal(false);
        setError(tripErrorMessage(check.reason, chain, check.index));
        return;
      }
    }
    setIsAdding(true);
    saveFlight(flightToSave);
    if (prev) {
      const result = prev.tripId ? appendLeg(prev.tripId, flightToSave.id) : createTrip([prev.id, flightToSave.id]);
      if (!result.ok) setError(result.reason);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsAdding(false);
    setShowConfirmModal(false);
    navigate({ to: '/flights/$flightId', params: { flightId: flightToSave.id } });
  };

  const flightToAdd = searchResult;

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Add flight"
          showBack
          onBackClick={() => navigate({ to: '/' })}
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
              { value: 'route', label: 'Route' },
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
                      setAirlineName(f.airline.name);
                      setAirlineCodeState(f.airline.code);
                      setOtherAirline(!AIRLINES.some((x) => x.code === f.airline.code));
                      setFlightNumber(f.flightNumber.replace(/^[A-Z0-9]{2}/, ''));
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

          {tab === 'route' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <AirportAutocomplete
                  key="rfrom"
                  label="From"
                  placeholder="e.g., EWR"
                  value={originCode}
                  onChange={(code, info) => { setOriginCode(code); setOriginInfo(info); setRouteResult(null); setAirportErrors((e) => ({ ...e, origin: undefined })); }}
                  error={airportErrors.origin}
                  leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
                />
                <AirportAutocomplete
                  key="rto"
                  label="To"
                  placeholder="e.g., SFO"
                  value={destCode}
                  onChange={(code, info) => { setDestCode(code); setDestInfo(info); setRouteResult(null); setAirportErrors((e) => ({ ...e, dest: undefined })); }}
                  error={airportErrors.dest}
                  leftIcon={<Plane className="w-5 h-5 rotate-45" />}
                />
              </div>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setRouteResult(null); setRouteMiss(''); }}
                leftIcon={<Calendar />}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Earliest (optional)" type="time" value={after}
                  onChange={(e) => { setAfter(e.target.value); setRouteResult(null); }} leftIcon={<Clock />} />
                <Input label="Latest (optional)" type="time" value={before}
                  onChange={(e) => { setBefore(e.target.value); setRouteResult(null); }} leftIcon={<Clock />} />
              </div>
            </div>
          )}

          {tab === 'number' && (
            <div className="space-y-4">
              <Select
                label="Airline"
                id="airline"
                value={otherAirline ? OTHER_AIRLINE : airlineCode}
                placeholderSelected={!airlineCode && !otherAirline}
                onChange={(e) => {
                  if (e.target.value === OTHER_AIRLINE) {
                    setOtherAirline(true);
                    setAirlineCodeState('');
                    setAirlineName('');
                    return;
                  }
                  const al = AIRLINES.find((x) => x.code === e.target.value);
                  setOtherAirline(false);
                  setAirlineCodeState(al?.code ?? '');
                  setAirlineName(al?.name ?? '');
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
                  placeholder="2-character IATA code, e.g. HA"
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
                    setAirlineCodeState(code);
                    setAirlineName(AIRLINES.find((x) => x.code === code)?.name ?? code);
                  }}
                />
              )}
              <div>
                <label htmlFor="flight-number" className="block px-1 pb-1.5 text-body-md text-ink-sub">
                  Flight number
                </label>
                <div className="flex items-center gap-3">
                  <span className="w-10 text-body-lg text-ink-caption">{airlineCode || '--'}</span>
                  <Input
                    id="flight-number"
                    type="text"
                    value={flightNumber}
                    onChange={(e) => handleFlightNumberChange(e.target.value.toUpperCase())}
                    placeholder="123 or B6123"
                  />
                </div>
              </div>
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
                <Input
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setLookup(null); setLookupMiss(''); }}
                  leftIcon={<Calendar />}
                />
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

          {error && (
            <Alert className="mt-4" status="error" showIcon={false} lineOne={error} />
          )}

          {tab === 'route' && (
            <>
              <Button
                fullWidth
                className="mt-6"
                onClick={handleRouteSearch}
                loading={isFinding && !routeResult}
                icon={<Search className="w-4 h-4" />}
              >
                Find flights
              </Button>
              {routeMiss && <Alert className="mt-4" status="warning" showIcon={false} lineOne={routeMiss} />}
              {routeResult && (
                <div className="mt-6">
                  <RouteResults
                    flights={routeResult.flights}
                    asOf={routeResult.schedule_as_of}
                    disabled={isFinding}
                    preferredAirline={preferredAirline}
                    onPick={handlePickRouteFlight}
                  />
                </div>
              )}
              <button
                type="button"
                className="mt-4 w-full text-center text-body-md text-ink-sub underline"
                onClick={goManual}
              >
                Enter details manually
              </button>
            </>
          )}

          {tab === 'number' && !manual && (
            <>
              <Button
                fullWidth
                className="mt-6"
                onClick={handleFind}
                loading={isFinding && !lookup}
                icon={<Search className="w-4 h-4" />}
              >
                Find flight
              </Button>

              {lookupMiss && (
                <Alert className="mt-4" status="warning" showIcon={false} lineOne={lookupMiss} />
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

              <button
                type="button"
                className="mt-4 w-full text-center text-body-md text-ink-sub underline"
                onClick={goManual}
              >
                Enter details manually
              </button>
            </>
          )}

          {tab === 'number' && manual && (
            <>
              <Button
                fullWidth
                className="mt-6"
                onClick={handleSearch}
                loading={isSearching}
                icon={<Search className="w-4 h-4" />}
              >
                Search flight
              </Button>
              <button
                type="button"
                className="mt-4 w-full text-center text-body-md text-ink-sub underline"
                onClick={() => { setManual(false); setError(''); setSearchResult(null); }}
              >
                Look up by flight number instead
              </button>
            </>
          )}

          {searchResult && manual && (
            <div className="mt-6">
              <h3 className="text-body-md font-medium text-ink-caption mb-3">
                Your flight
              </h3>
              <FlightSearchResult
                flight={searchResult}
                selected
                onSelect={() => setShowConfirmModal(true)}
              />
              <Button fullWidth className="mt-4" onClick={() => setShowConfirmModal(true)}>
                Track this flight
              </Button>
            </div>
          )}

        </div>

        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Track this flight?"
        >
          {flightToAdd && (
            <div className="space-y-4">
              <div className="bg-surface-muted rounded-tile p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-caption"><Plane className="h-5 w-5 rotate-45" aria-hidden /></div>
                  <div>
                    <p className="font-semibold text-ink">{flightToAdd.flightNumber}</p>
                    <p className="text-body-md text-ink-caption">{flightToAdd.airline.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-body-md text-ink-caption">
                  <span>{flightToAdd.origin.code}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{flightToAdd.destination.code}</span>
                  <span className="text-ink-caption opacity-70">·</span>
                  <span>{formatDate(flightToAdd.scheduledDeparture)}</span>
                  <span className="text-ink-caption opacity-70">·</span>
                  <span>{formatTime(flightToAdd.scheduledDeparture)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-surface-stroke flex items-center gap-2">
                  <RiskPill risk={flightToAdd.riskLevel} emphasis="soft" detail={formatDelayPercent(flightToAdd.delayProbability)} />
                </div>
                {flightToAdd.delayReason && (
                  <p className="mt-2 text-body-md text-ink-caption">Why: {flightToAdd.delayReason}</p>
                )}
              </div>

              <p className="text-body-md text-ink-caption">
                You'll see delay predictions for this flight, and can refresh them anytime.
              </p>

              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </Button>
                <Button fullWidth onClick={handleAddFlight} loading={isAdding}>
                  Track flight
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

function FlightSearchResult({
  flight,
  selected,
  onSelect,
}: {
  flight: Flight;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-tile border-2 transition-all',
        selected ? 'border-surface-card bg-surface-muted' : 'border-surface-stroke bg-white hover:border-surface-divider'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-caption"><Plane className="h-5 w-5 rotate-45" aria-hidden /></div>
          <span className="font-semibold text-ink">{flight.flightNumber}</span>
          <span className="text-body-md text-ink-caption">{flight.airline.name}</span>
        </div>
        <RiskPill risk={flight.riskLevel} emphasis="soft" detail={formatDelayPercent(flight.delayProbability)} />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="font-semibold text-ink">{flight.origin.code}</p>
          <p className="text-body-sm text-ink-caption">{formatTime(flight.scheduledDeparture)}</p>
        </div>
        <div className="flex-1 flex items-center gap-1 px-2">
          <div className="flex-1 border-t border-dashed border-surface-divider" />
          <Plane className="w-4 h-4 text-ink-caption opacity-70 rotate-90" />
          <div className="flex-1 border-t border-dashed border-surface-divider" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-ink">{flight.destination.code}</p>
          <p className="text-body-sm text-ink-caption">{formatDelayChance(flight.delayProbability) ?? ''}</p>
        </div>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-surface-stroke flex items-center justify-center gap-2 text-surface-card font-medium">
          <Check className="w-4 h-4" />
          <span>Selected — tap to confirm</span>
        </div>
      )}
    </button>
  );
}
