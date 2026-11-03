import { useState, useRef, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Calendar, Plane, Check, ArrowRight, Clock } from 'lucide-react';
import { Header, Button, Input, Modal } from '~/components/ui';
import { DelaySeverityBar } from '~/components/flight';
import { cn, formatDate, formatTime, getRiskBadgeClass, getRiskLabel, formatDelayChance, parseFlightNumber } from '~/lib/utils';
import { flyrelyApi, buildPredictPayload, PredictionUnavailableError } from '~/lib/api';
import { saveFlight } from '~/lib/flightStore';
import { searchAirports, searchAirlines } from '~/lib/airports';
import type { AirportInfo, AirlineInfo } from '~/lib/airports';
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
    <div ref={containerRef} className="relative">
      <div className="block text-sm font-medium text-navy-700 mb-1">{label}</div>
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 1 && suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-all',
            'border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            leftIcon && 'pl-10',
            confirmed && 'border-green-400 bg-green-50'
          )}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-navy-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((ap) => (
            <li key={ap.code}>
              <button
                type="button"
                onMouseDown={() => select(ap)}
                className="w-full text-left px-4 py-3 hover:bg-navy-50 flex items-center justify-between"
              >
                <span className="font-semibold text-navy-900">{ap.code}</span>
                <span className="text-sm text-navy-500 truncate ml-3">{ap.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AirlineAutocomplete({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (name: string, info?: AirlineInfo) => void;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AirlineInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) { setQuery(''); setConfirmed(false); }
  }, [value]);

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
      setSuggestions(searchAirlines(q));
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
    onChange(q);
  };

  const select = (airline: AirlineInfo) => {
    setQuery(airline.name);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    onChange(airline.name, airline);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="block text-sm font-medium text-navy-700 mb-1">{label}</div>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
          <Plane className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 1 && suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border bg-white px-4 py-3 pl-10 text-sm text-navy-900 outline-none transition-all',
            'border-navy-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            confirmed && 'border-green-400 bg-green-50'
          )}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-navy-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((al) => (
            <li key={al.code}>
              <button
                type="button"
                onMouseDown={() => select(al)}
                className="w-full text-left px-4 py-3 hover:bg-navy-50 flex items-center justify-between"
              >
                <span className="font-semibold text-navy-900">{al.name}</span>
                <span className="text-xs text-navy-400 ml-2">{al.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

function AddFlightScreen() {
  const navigate = useNavigate();

  // Flight number search
  const [airlineName, setAirlineName] = useState('');
  const [airlineCode, setAirlineCodeState] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [originInfo, setOriginInfo] = useState<AirportInfo | undefined>();
  const [destCode, setDestCode] = useState('');
  const [destInfo, setDestInfo] = useState<AirportInfo | undefined>();
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Flight | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

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
      if (new Date(date) < new Date(new Date().toDateString())) {
        setError('Cannot track flights in the past');
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
            name: originInfo?.name ?? originCode,
            city: originInfo?.city ?? originCode,
          },
          destination: {
            code: destCode,
            name: destInfo?.name ?? destCode,
            city: destInfo?.city ?? destCode,
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
          {(
            <div className="space-y-4">
              <AirlineAutocomplete
                label="Airline"
                placeholder="e.g., United Airlines"
                value={airlineName}
                onChange={(name, info) => {
                  setAirlineName(name);
                  if (info) setAirlineCodeState(info.code);
                }}
              />
              <div>
                <div className="block text-sm font-medium text-navy-700 mb-1">Flight number</div>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., UA1071"
                  className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AirportAutocomplete
                  key={originCode}
                  label="From"
                  placeholder="e.g., SFO"
                  value={originCode}
                  onChange={(code, info) => { setOriginCode(code); setOriginInfo(info); }}
                  leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
                />
                <AirportAutocomplete
                  key={destCode}
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
                  leftIcon={<Calendar className="w-5 h-5" />}
                />
                <div>
                  <div className="block text-sm font-medium text-navy-700 mb-1">
                    Departure time
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                      <Clock className="w-5 h-5" />
                    </div>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full rounded-xl border border-navy-200 bg-white pl-10 pr-4 py-3 text-sm text-navy-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <Button
            fullWidth
            size="lg"
            className="mt-6"
            onClick={handleSearch}
            loading={isSearching}
            icon={<Search className="w-5 h-5" />}
          >
            Search flight
          </Button>

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
              <Button fullWidth size="lg" className="mt-4" onClick={() => setShowConfirmModal(true)}>
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
                  <span className={getRiskBadgeClass(flightToAdd.riskLevel)}>
                    {getRiskLabel(flightToAdd.riskLevel)}
                  </span>
                  {formatDelayChance(flightToAdd.delayProbability) && (
                    <span className="text-sm text-navy-600">
                      · {formatDelayChance(flightToAdd.delayProbability)}
                    </span>
                  )}
                </div>
                {flightToAdd.delaySeverity && flightToAdd.riskLevel !== 'low' && (
                  <div className="mt-3 pt-3 border-t border-navy-200">
                    <DelaySeverityBar severity={flightToAdd.delaySeverity} compact />
                  </div>
                )}
              </div>

              <p className="text-sm text-navy-500">
                You'll see delay predictions for this flight, and can refresh them anytime.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => setShowConfirmModal(false)}>
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
        selected ? 'border-primary-500 bg-primary-50' : 'border-navy-200 bg-white hover:border-navy-300'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">✈️</span>
          <span className="font-semibold text-navy-900">{flight.flightNumber}</span>
          <span className="text-sm text-navy-500">{flight.airline.name}</span>
        </div>
        <span className={getRiskBadgeClass(flight.riskLevel)}>
          {getRiskLabel(flight.riskLevel)}
        </span>
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
        <div className="mt-3 pt-3 border-t border-primary-200 flex items-center justify-center gap-2 text-primary-600 font-medium">
          <Check className="w-4 h-4" />
          <span>Selected — tap to confirm</span>
        </div>
      )}
    </button>
  );
}
