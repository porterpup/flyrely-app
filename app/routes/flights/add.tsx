import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, Calendar, Plane, Check, ArrowRight } from 'lucide-react';
import { Header, Button, Input, Modal } from '~/components/ui';
import { DelaySeverityBar } from '~/components/flight';
import { cn, formatDate, formatTime, getRiskBadgeClass, getRiskLabel } from '~/lib/utils';
import { flyrelyApi, buildPredictPayload } from '~/lib/api';
import { saveFlight } from '~/lib/flightStore';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/add')({
  component: AddFlightScreen,
});

type SearchMode = 'number' | 'route';

function AddFlightScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SearchMode>('number');

  // Flight number search
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
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
      if (!airline || !flightNumber || !date || !originInput || !destinationInput) {
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
        const match = flightNumber.match(/^([A-Z]{2})/i);
        const airlineCode = match ? match[1].toUpperCase() : airline.slice(0, 2).toUpperCase();
        const numericFlight = flightNumber.replace(/^[A-Z]+/i, '');
        const fullFlightNumber = `${airlineCode}${numericFlight}`;
        const originCode = originInput.toUpperCase().slice(0, 3);
        const destCode = destinationInput.toUpperCase().slice(0, 3);
        const depISO = `${date}T09:00:00`;
        const payload = buildPredictPayload(originCode, destCode, depISO, airline);
        const prediction = await flyrelyApi.predict(payload);

        const estimatedDelay = prediction.delay_severity
          ? Math.round(
              prediction.delay_probability *
              (prediction.delay_severity.expected_delay_label === 'severe' ? 150
               : prediction.delay_severity.expected_delay_label === 'moderate' ? 75
               : 25)
            )
          : prediction.risk_level === 'high'
          ? Math.round(prediction.delay_probability * 90)
          : prediction.risk_level === 'medium'
          ? Math.round(prediction.delay_probability * 45)
          : 0;
        const flight: Flight = {
          id: `flight-${Date.now()}`,
          flightNumber: fullFlightNumber,
          airline: { code: airlineCode, name: airline },
          origin: { code: originCode, name: originInput, city: originInput, timezone: 'UTC' },
          destination: { code: destCode, name: destinationInput, city: destinationInput, timezone: 'UTC' },
          scheduledDeparture: depISO,
          scheduledArrival: new Date(new Date(depISO).getTime() + 5 * 3600000).toISOString(),
          status: 'scheduled',
          riskLevel: prediction.risk_level,
          delayMinutes: estimatedDelay,
          delayReason: prediction.risk_factors.slice(0, 2).join(' • ') || undefined,
          airlineStatus: 'On time',
          delaySeverity: prediction.delay_severity ?? undefined,
        };
        setSearchResult(flight);
      } catch (e) {
        setError('Could not get prediction. Please check your inputs and try again.');
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
        const departures = [
          { suffix: '07:00' },
          { suffix: '12:00' },
          { suffix: '17:00' },
        ];

        const results = await Promise.all(
          departures.map(async ({ suffix }, i) => {
            const depISO = `${routeDate}T${suffix}:00`;
            const payload = buildPredictPayload(origin, destination, depISO);
            const prediction = await flyrelyApi.predict(payload);
            const originCode = origin.toUpperCase().slice(0, 3);
            const destCode = destination.toUpperCase().slice(0, 3);
            const estimatedDelay = prediction.delay_severity
              ? Math.round(
                  prediction.delay_probability *
                  (prediction.delay_severity.expected_delay_label === 'severe' ? 150
                   : prediction.delay_severity.expected_delay_label === 'moderate' ? 75
                   : 25)
                )
              : prediction.risk_level === 'high'
              ? Math.round(prediction.delay_probability * 90)
              : prediction.risk_level === 'medium'
              ? Math.round(prediction.delay_probability * 45)
              : 0;
            return {
              id: `route-${Date.now()}-${i}`,
              flightNumber: `FL${100 + i * 11}`,
              airline: { code: 'FL', name: 'Various Airlines' },
              origin: { code: originCode, name: origin, city: origin, timezone: 'UTC' },
              destination: { code: destCode, name: destination, city: destination, timezone: 'UTC' },
              scheduledDeparture: depISO,
              scheduledArrival: new Date(new Date(depISO).getTime() + 5 * 3600000).toISOString(),
              status: 'scheduled' as const,
              riskLevel: prediction.risk_level,
              delayMinutes: estimatedDelay,
              delayReason: prediction.risk_factors.slice(0, 1).join('') || undefined,
              delaySeverity: prediction.delay_severity ?? undefined,
            } satisfies Flight;
          })
        );

        setRouteResults(results);
      } catch (e) {
        setError('Could not get predictions. Please check your inputs and try again.');
      }
    }

    setIsSearching(false);
  };

  const handleAddFlight = async () => {
    const flightToSave = searchResult || routeResults.find((f) => f.id === selectedFlight);
    if (!flightToSave) return;
    setIsAdding(true);
    saveFlight(flightToSave);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsAdding(false);
    setShowConfirmModal(false);
    navigate({ to: '/flights/$flightId', params: { flightId: flightToSave.id } });
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

        <div className="px-4 py-4">
          <div className="flex bg-navy-100 rounded-xl p-1">
            <button
              onClick={() => { setMode('number'); setSearchResult(null); setRouteResults([]); setError(''); }}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                mode === 'number' ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600'
              )}
            >
              Flight number
            </button>
            <button
              onClick={() => { setMode('route'); setSearchResult(null); setRouteResults([]); setError(''); }}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                mode === 'route' ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600'
              )}
            >
              Route
            </button>
          </div>
        </div>

        <div className="flex-1 px-4">
          {mode === 'number' ? (
            <div className="space-y-4">
              <Input
                label="Airline"
                placeholder="e.g., United Airlines"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                leftIcon={<Plane className="w-5 h-5" />}
              />
              <Input
                label="Flight number"
                placeholder="e.g., UA1071 or 1071"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="From"
                  placeholder="e.g., SFO"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                />
                <Input
                  label="To"
                  placeholder="e.g., JFK"
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                />
              </div>
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
                label="From (airport code)"
                placeholder="e.g., SFO"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                leftIcon={<Plane className="w-5 h-5 -rotate-45" />}
              />
              <Input
                label="To (airport code)"
                placeholder="e.g., JFK"
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
              <Button fullWidth size="lg" className="mt-4" onClick={() => setShowConfirmModal(true)}>
                Track this flight
              </Button>
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

        {selectedFlight && mode === 'route' && (
          <div className="sticky bottom-0 p-4 bg-white border-t border-navy-100">
            <Button fullWidth size="lg" onClick={() => setShowConfirmModal(true)}>
              Track this flight
            </Button>
          </div>
        )}

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
                <div className="mt-3 pt-3 border-t border-navy-200 flex items-center gap-2">
                  <span className={getRiskBadgeClass(flightToAdd.riskLevel)}>
                    {getRiskLabel(flightToAdd.riskLevel)}
                  </span>
                  {flightToAdd.delayMinutes > 0 && (
                    <span className="text-sm text-navy-600">
                      · {flightToAdd.delayMinutes}-{flightToAdd.delayMinutes + 30} min delay expected
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
                You'll receive delay predictions and alerts for this flight.
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
          <p className="text-xs text-navy-500">{formatTime(flight.scheduledArrival)}</p>
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
