import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Calendar, Plane, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { Header, Button, Input, Modal } from '~/components/ui';
import { cn, formatDate, formatTime, getRiskBadgeClass, getRiskLabel } from '~/lib/utils';
import { flyrelyApi, buildPredictPayload } from '~/lib/api';
import type { Flight, RiskLevel } from '~/types';

export const Route = createFileRoute('/flights/add')({
  component: AddFlightScreen,
});

type SearchMode = 'number' | 'route';

// Mock search results
const mockSearchResult: Flight = {
  id: 'new-1',
  flightNumber: 'UA1071',
  airline: { code: 'UA', name: 'United Airlines' },
  origin: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', timezone: 'America/Los_Angeles' },
  destination: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
  scheduledDeparture: '2024-12-03T18:15:00',
  scheduledArrival: '2024-12-04T02:45:00',
  status: 'scheduled',
  riskLevel: 'medium',
  delayMinutes: 45,
  delayReason: 'Historically late at this hour',
  airlineStatus: 'On time',
};

const mockRouteResults: Flight[] = [
  mockSearchResult,
  {
    ...mockSearchResult,
    id: 'new-2',
    flightNumber: 'UA1089',
    scheduledDeparture: '2024-12-03T20:30:00',
    scheduledArrival: '2024-12-04T04:50:00',
    riskLevel: 'low',
    delayMinutes: 0,
  },
  {
    ...mockSearchResult,
    id: 'new-3',
    flightNumber: 'AA178',
    airline: { code: 'AA', name: 'American Airlines' },
    scheduledDeparture: '2024-12-03T19:45:00',
    scheduledArrival: '2024-12-04T04:15:00',
    riskLevel: 'low',
    delayMinutes: 0,
  },
];

function AddFlightScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SearchMode>('number');

  // Flight number search
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState('');

  // Route search
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeDate, setRouteDate] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Flight | null>(null);
  const [routeResults, setRouteResults] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setError('');
    setIsSearching(true);
    setSearchResult(null);
    setRouteResults([]);

    if (mode === 'number') {
      if (!airline || !flightNumber || !date) {
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
        // Parse airline code from airline name input (e.g. "United" → "UA")
        // We use the flightNumber prefix if it contains letters, else fall back
        const match = flightNumber.match(/^([A-Z]{2})/i);
        const airlineCode = match ? match[1].toUpperCase() : airline.slice(0, 2).toUpperCase();
        const numericFlight = flightNumber.replace(/^[A-Z]+/i, '');
        const fullFlightNumber = `${airlineCode}${numericFlight}`;

        const depISO = `${date}T09:00:00`; // default morning if no time known
        const payload = buildPredictPayload('', '', depISO, airline);
        // For flight-number mode we don't have origin/destination yet — use placeholders
        // and show the result with real risk from API
        const originCode = 'SFO';
        const destCode = 'JFK';
        const realPayload = buildPredictPayload(originCode, destCode, depISO, airline);
        const prediction = await flyrelyApi.predict(realPayload);

        const flight: Flight = {
          id: `search-${Date.now()}`,
          flightNumber: fullFlightNumber,
          airline: { code: airlineCode, name: airline },
          origin: { code: originCode, name: 'Departure Airport', city: 'Origin', timezone: 'UTC' },
          destination: { code: destCode, name: 'Arrival Airport', city: 'Destination', timezone: 'UTC' },
          scheduledDeparture: depISO,
          scheduledArrival: new Date(new Date(depISO).getTime() + 5 * 3600000).toISOString(),
          status: 'scheduled',
          riskLevel: prediction.risk_level,
          delayMinutes: prediction.predicted_delay_minutes,
          delayReason: prediction.factors.slice(0, 2).join(' • ') || undefined,
          airlineStatus: 'On time',
        };
        setSearchResult(flight);
      } catch (e) {
        // Fall back to mock if API is unavailable
        setSearchResult(mockSearchResult);
      }
    } else {
      if (!origin || !destination || !routeDate) {
        setError('Please fill in all fields');
        setIsSearching(false);
        return;
      }
      if (origin.toUpperCase() === destination.toUpperCase()) {
        setError('Origin and destination cannot be the same');
        setIsSearching(false);
        return;
      }

      try {
        // Generate a few departure times and get predictions for each
        const departures = [
          { hour: 7, suffix: '07:00' },
          { hour: 12, suffix: '12:00' },
          { hour: 17, suffix: '17:00' },
        ];

        const results = await Promise.all(
          departures.map(async ({ hour, suffix }, i) => {
            const depISO = `${routeDate}T${suffix}:00`;
            const payload = buildPredictPayload(origin, destination, depISO);
            const prediction = await flyrelyApi.predict(payload);
            return {
              id: `route-${i}`,
              flightNumber: `AA${(100 + i * 11 + parseInt(origin.charCodeAt(0).toString())).toString().slice(-3)}`,
              airline: { code: 'AA', name: 'American Airlines' },
              origin: { code: origin.toUpperCase(), name: origin, city: origin, timezone: 'UTC' },
              destination: { code: destination.toUpperCase(), name: destination, city: destination, timezone: 'UTC' },
              scheduledDeparture: depISO,
              scheduledArrival: new Date(new Date(depISO).getTime() + 5 * 3600000).toISOString(),
              status: 'scheduled' as const,
              riskLevel: prediction.risk_level,
              delayMinutes: prediction.predicted_delay_minutes,
              delayReason: prediction.factors.slice(0, 1).join('') || undefined,
            } satisfies Flight;
          })
        );

        setRouteResults(results);
      } catch (e) {
        setRouteResults(mockRouteResults);
      }
    }

    setIsSearching(false);
  };

  const handleAddFlight = async () => {
    setIsAdding(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsAdding(false);
    setShowConfirmModal(false);
    navigate({ to: '/flights/$flightId', params: { flightId: searchResult?.id || selectedFlight || '1' } });
  };

  const flightToAdd = searchResult || routeResults.find((f) => f.id === selectedFlight);

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Add Flight"
          showBack
          onBackClick={() => navigate({ to: '/' })}
        />

        {/* Tab Switcher */}
        <div className="px-4 py-4">
          <div className="flex bg-navy-100 rounded-xl p-1">
            <button
              onClick={() => {
                setMode('number');
                setSearchResult(null);
                setRouteResults([]);
                setError('');
              }}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                mode === 'number'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600'
              )}
            >
              Flight number
            </button>
            <button
              onClick={() => {
                setMode('route');
                setSearchResult(null);
                setRouteResults([]);
                setError('');
              }}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                mode === 'route'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600'
              )}
            >
              Route
            </button>
          </div>
        </div>

        {/* Search Form */}
        <div className="flex-1 px-4">
          {mode === 'number' ? (
            <div className="space-y-4">
              <Input
                label="Airline"
                placeholder="e.g., American Airlines"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                leftIcon={<Plane className="w-5 h-5" />}
              />

              <Input
                label="Flight number"
                placeholder="e.g., 123"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                leftIcon={<span className="text-navy-400 font-medium">AA</span>}
              />

              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                leftIcon={<Calendar className="w-5 h-5" />}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="From"
                placeholder="City or airport code"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
              />

              <Input
                label="To"
                placeholder="City or airport code"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                leftIcon={<Plane className="w-5 h-5 rotate-45" />}
              />

              <Input
                label="Date"
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                leftIcon={<Calendar className="w-5 h-5" />}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
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

          {/* Search Results */}
          {searchResult && mode === 'number' && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                Your Flight
              </h3>
              <FlightSearchResult
                flight={searchResult}
                selected
                onSelect={() => setShowConfirmModal(true)}
              />
            </div>
          )}

          {routeResults.length > 0 && mode === 'route' && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                Available Flights
              </h3>
              <div className="space-y-3">
                {routeResults.map((flight) => (
                  <FlightSearchResult
                    key={flight.id}
                    flight={flight}
                    selected={selectedFlight === flight.id}
                    onSelect={() => setSelectedFlight(flight.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom action for route search */}
        {selectedFlight && mode === 'route' && (
          <div className="sticky bottom-0 p-4 bg-white border-t border-navy-100">
            <Button
              fullWidth
              size="lg"
              onClick={() => setShowConfirmModal(true)}
            >
              Track this flight
            </Button>
          </div>
        )}

        {/* Confirm Modal */}
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
                </div>
              </div>

              <p className="text-sm text-navy-500">
                You'll receive delay predictions and alerts for this flight.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowConfirmModal(false)}
                >
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

// Flight search result card component
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
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-navy-200 bg-white hover:border-navy-300'
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
          <p className="text-xs text-navy-500">{formatTime(flight.scheduledArrival)}</p>
        </div>
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-primary-200 flex items-center justify-center gap-2 text-primary-600 font-medium">
          <Check className="w-4 h-4" />
          <span>Selected</span>
        </div>
      )}
    </button>
  );
}
