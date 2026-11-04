import { useState, useRef, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Calendar, Plane, Check, ArrowRight, Clock } from 'lucide-react';
import { fieldControlClass } from '~/components/ui/Field';
import { Header, Button, Input, Select, FieldBox, FieldLabel, SegmentedTabs, Alert, Modal } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import { cn, formatDate, formatTime, formatDelayChance, parseFlightNumber } from '~/lib/utils';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import { saveFlight, getFlights } from '~/lib/flightStore';
import { searchAirports, AIRLINES, getAirport } from '~/lib/airports';
import type { AirportInfo } from '~/lib/airports';
import { getAirportRef } from '~/lib/airportRef';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/add')({
  component: AddFlightScreen,
});

// ── Autocomplete components ────────────────────────────────────────────────

function AirportAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  leftIcon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (code: string, info?: AirportInfo) => void;
  leftIcon?: React.ReactNode;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AirportInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. clear)
  useEffect(() => {
    if (!value) { setQuery(''); setConfirmed(false); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setConfirmed(false);
    if (q.length >= 1) {
      setSuggestions(searchAirports(q));
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
    onChange(q.toUpperCase().slice(0, 3));
  };

  const select = (airport: AirportInfo) => {
    setQuery(`${airport.code} – ${airport.city}`);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    onChange(airport.code, airport);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <FieldBox leading={leftIcon} className={cn(confirmed && 'border-status-success-text bg-status-success-bg')}>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 1 && suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-label={label}
          className={cn(fieldControlClass, leftIcon && 'pl-2')}
        />
      </FieldBox>
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-field border border-surface-divider bg-white shadow-lg">
          {suggestions.map((ap) => (
            <li key={ap.code}>
              <button
                type="button"
                onMouseDown={() => select(ap)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-muted"
              >
                <span className="font-semibold text-ink">{ap.code}</span>
                <span className="ml-3 truncate text-body-md text-ink-caption">{ap.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

function AddFlightScreen() {
  const navigate = useNavigate();

  // Flight number search
  const [airlineName, setAirlineName] = useState('');
  const [airlineCode, setAirlineCodeState] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [otherAirline, setOtherAirline] = useState(false);
  const [originCode, setOriginCode] = useState('');
  const [originInfo, setOriginInfo] = useState<AirportInfo | undefined>();
  const [destCode, setDestCode] = useState('');
  const [destInfo, setDestInfo] = useState<AirportInfo | undefined>();
  const [tab, setTab] = useState<'number' | 'recent'>('number');
  const [recent] = useState<Flight[]>(() => dedupeRecent(getFlights()));
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Flight | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

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
    setIsSearching(true);
    setSearchResult(null);

    {
      if (!airlineName || !flightNumber || !date || !departureTime || !originCode || !destCode) {
        setError('Please fill in all fields');
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
        const fullFlightNumber = `${derivedCode}${numericFlight}`;
        const depISO = `${date}T${departureTime}:00`;
        const flightId = `flight-${Date.now()}`;
        const payload = buildPredictPayload(originCode, destCode, depISO, derivedCode, flightId, fullFlightNumber);
        const prediction = await flyrelyApi.predict(payload);

        const flight: Flight = {
          id: flightId,
          flightNumber: fullFlightNumber,
          airline: { code: derivedCode, name: airlineName },
          origin: {
            code: originCode,
            name: originInfo?.name ?? getAirportRef(originCode)?.name ?? originCode,
            city: originInfo?.city ?? getAirportRef(originCode)?.city ?? originCode,
          },
          destination: {
            code: destCode,
            name: destInfo?.name ?? getAirportRef(destCode)?.name ?? destCode,
            city: destInfo?.city ?? getAirportRef(destCode)?.city ?? destCode,
          },
          scheduledDeparture: depISO,
          status: 'scheduled',
          riskLevel: prediction.risk_level,
          delayProbability: prediction.delay_probability,
          delayReason: prediction.risk_factors.slice(0, 2).join(' • ') || undefined,
          delaySeverity: prediction.delay_severity ?? undefined,
          warnings: prediction.warnings,
        };
        setSearchResult(flight);
      } catch (e) {
        setError(e instanceof PredictionUnavailableError
          ? 'Predictions are temporarily unavailable. Please try again shortly.'
          : 'Could not get prediction. Please check your inputs and try again.');
      }
    }

    setIsSearching(false);
  };

  const handleAddFlight = async () => {
    const flightToSave = searchResult;
    if (!flightToSave) return;
    setIsAdding(true);
    saveFlight(flightToSave);
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
          title="Add Flight"
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
              { value: 'recent', label: 'Recent' },
            ]}
          />

          {tab === 'recent' && (
            <div className="space-y-3">
              {recent.length === 0 ? (
                <p className="text-center text-navy-caption py-10">
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
                      setTab('number');
                    }}
                    className="w-full text-left rounded-2xl border border-navy-stroke p-4 hover:border-navy-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-navy-ink">{f.flightNumber}</span>
                      <span className="text-sm text-navy-caption">{f.airline.name}</span>
                    </div>
                    <p className="text-sm text-navy-caption mt-1">
                      {f.origin.code} to {f.destination.code} · {formatTime(f.scheduledDeparture)}
                    </p>
                  </button>
                ))
              )}
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
              <div className="grid grid-cols-2 gap-3">
                <AirportAutocomplete
                  key={`from-${originCode}`}
                  label="From"
                  placeholder="e.g., SFO"
                  value={originCode}
                  onChange={(code, info) => { setOriginCode(code); setOriginInfo(info); }}
                  leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
                />
                <AirportAutocomplete
                  key={`to-${destCode}`}
                  label="To"
                  placeholder="e.g., JFK"
                  value={destCode}
                  onChange={(code, info) => { setDestCode(code); setDestInfo(info); }}
                  leftIcon={<Plane className="w-5 h-5 rotate-45" />}
                />
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
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  leftIcon={<Clock />}
                />
              </div>
            </div>
          )}

          {error && (
            <Alert className="mt-4" status="error" showIcon={false} lineOne={error} />
          )}

          {tab === 'number' && <Button
            fullWidth
            className="mt-6"
            onClick={handleSearch}
            loading={isSearching}
            icon={<Search className="w-4 h-4" />}
          >
            Search flight
          </Button>}

          {searchResult && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                Your Flight
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
              <div className="bg-navy-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">✈️</div>
                  <div>
                    <p className="font-bold text-navy-900">{flightToAdd.flightNumber}</p>
                    <p className="text-sm text-navy-600">{flightToAdd.airline.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-navy-600">
                  <span>{flightToAdd.origin.code}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{flightToAdd.destination.code}</span>
                  <span className="text-navy-400">·</span>
                  <span>{formatDate(flightToAdd.scheduledDeparture)}</span>
                  <span className="text-navy-400">·</span>
                  <span>{formatTime(flightToAdd.scheduledDeparture)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-navy-200 flex items-center gap-2">
                  <RiskPill risk={flightToAdd.riskLevel} emphasis="soft" />
                  {formatDelayChance(flightToAdd.delayProbability) && (
                    <span className="text-sm text-navy-600">
                      · {formatDelayChance(flightToAdd.delayProbability)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-navy-500">
                You'll see delay predictions for this flight, and can refresh them anytime.
              </p>

              <div className="flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </Button>
                <Button fullWidth onClick={handleAddFlight} loading={isAdding}>
                  Track Flight
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
        'w-full text-left p-4 rounded-xl border-2 transition-all',
        selected ? 'border-navy-card bg-navy-50' : 'border-navy-200 bg-white hover:border-navy-300'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">✈️</span>
          <span className="font-semibold text-navy-900">{flight.flightNumber}</span>
          <span className="text-sm text-navy-500">{flight.airline.name}</span>
        </div>
        <RiskPill risk={flight.riskLevel} emphasis="soft" />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="font-bold text-navy-900">{flight.origin.code}</p>
          <p className="text-xs text-navy-500">{formatTime(flight.scheduledDeparture)}</p>
        </div>
        <div className="flex-1 flex items-center gap-1 px-2">
          <div className="flex-1 border-t border-dashed border-navy-300" />
          <Plane className="w-4 h-4 text-navy-400 rotate-90" />
          <div className="flex-1 border-t border-dashed border-navy-300" />
        </div>
        <div className="text-center">
          <p className="font-bold text-navy-900">{flight.destination.code}</p>
          <p className="text-xs text-navy-500">{formatDelayChance(flight.delayProbability) ?? ''}</p>
        </div>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-navy-200 flex items-center justify-center gap-2 text-navy-card font-medium">
          <Check className="w-4 h-4" />
          <span>Selected — tap to confirm</span>
        </div>
      )}
    </button>
  );
}
