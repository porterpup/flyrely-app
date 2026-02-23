import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Plus, ChevronDown, ChevronRight, Plane, Calendar, MoreVertical } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button, Modal, Input } from '~/components/ui';
import { FlightCard } from '~/components/flight';
import { cn, formatDate, getRiskBadgeClass, getRiskLabel } from '~/lib/utils';
import type { Trip, Flight } from '~/types';

export const Route = createFileRoute('/trips/')({
  component: TripsScreen,
});

// Mock data
const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    name: 'NYC Business Trip',
    createdAt: '2024-11-28',
    flights: [
      {
        id: '1',
        flightNumber: 'UA1071',
        airline: { code: 'UA', name: 'United Airlines' },
        origin: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', timezone: 'America/Los_Angeles' },
        destination: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
        scheduledDeparture: '2024-12-03T18:15:00',
        scheduledArrival: '2024-12-04T02:45:00',
        status: 'scheduled',
        riskLevel: 'medium',
        delayMinutes: 45,
      },
      {
        id: '2',
        flightNumber: 'UA1089',
        airline: { code: 'UA', name: 'United Airlines' },
        origin: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
        destination: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', timezone: 'America/Los_Angeles' },
        scheduledDeparture: '2024-12-06T09:30:00',
        scheduledArrival: '2024-12-06T12:45:00',
        status: 'scheduled',
        riskLevel: 'low',
      },
    ],
  },
];

const mockUnorganizedFlights: Flight[] = [
  {
    id: '3',
    flightNumber: 'AA245',
    airline: { code: 'AA', name: 'American Airlines' },
    origin: { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', timezone: 'America/Los_Angeles' },
    destination: { code: 'ORD', name: "O'Hare International", city: 'Chicago', timezone: 'America/Chicago' },
    scheduledDeparture: '2024-12-10T14:00:00',
    scheduledArrival: '2024-12-10T20:15:00',
    status: 'scheduled',
    riskLevel: 'low',
  },
];

function TripsScreen() {
  const navigate = useNavigate();
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set(['trip-1']));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTripName, setNewTripName] = useState('');

  const toggleTrip = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  const getWorstRisk = (flights: Flight[]) => {
    if (flights.some((f) => f.riskLevel === 'high')) return 'high';
    if (flights.some((f) => f.riskLevel === 'medium')) return 'medium';
    return 'low';
  };

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy-900">Trips</h1>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Trip
          </Button>
        </div>

        {/* Trips List */}
        <div className="space-y-4">
          {mockTrips.map((trip) => {
            const isExpanded = expandedTrips.has(trip.id);
            const tripRisk = getWorstRisk(trip.flights);

            return (
              <div
                key={trip.id}
                className="bg-white border border-navy-200 rounded-xl overflow-hidden"
              >
                {/* Trip Header */}
                <button
                  onClick={() => toggleTrip(trip.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-navy-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        tripRisk === 'low' && 'bg-green-100',
                        tripRisk === 'medium' && 'bg-amber-100',
                        tripRisk === 'high' && 'bg-red-100'
                      )}
                    >
                      <Plane
                        className={cn(
                          'w-5 h-5',
                          tripRisk === 'low' && 'text-green-600',
                          tripRisk === 'medium' && 'text-amber-600',
                          tripRisk === 'high' && 'text-red-600'
                        )}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-navy-900">{trip.name}</p>
                      <p className="text-sm text-navy-500">
                        {trip.flights.length} flight{trip.flights.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={getRiskBadgeClass(tripRisk)}>
                      {getRiskLabel(tripRisk)}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-navy-400 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </button>

                {/* Expanded Flights */}
                {isExpanded && (
                  <div className="border-t border-navy-100 p-4 space-y-3 bg-navy-50">
                    {trip.flights.map((flight, index) => (
                      <div key={flight.id} className="relative">
                        {/* Timeline connector */}
                        {index < trip.flights.length - 1 && (
                          <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-navy-200" />
                        )}

                        <button
                          onClick={() =>
                            navigate({
                              to: '/flights/$flightId',
                              params: { flightId: flight.id },
                            })
                          }
                          className="w-full text-left bg-white border border-navy-200 rounded-xl p-4 hover:border-navy-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-navy-900">
                                {flight.flightNumber}
                              </span>
                              <span className="text-sm text-navy-500">
                                {flight.airline.name}
                              </span>
                            </div>
                            <span className={getRiskBadgeClass(flight.riskLevel)}>
                              {getRiskLabel(flight.riskLevel)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-navy-600">
                            <span>{flight.origin.code}</span>
                            <ChevronRight className="w-4 h-4 text-navy-400" />
                            <span>{flight.destination.code}</span>
                            <span className="text-navy-400">·</span>
                            <span>{formatDate(flight.scheduledDeparture)}</span>
                          </div>
                        </button>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => navigate({ to: '/flights/add' })}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      Add flight to trip
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unorganized Flights */}
        {mockUnorganizedFlights.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
              Not in a trip
            </h2>
            <div className="space-y-3">
              {mockUnorganizedFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  variant="compact"
                  onClick={() =>
                    navigate({
                      to: '/flights/$flightId',
                      params: { flightId: flight.id },
                    })
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Create Trip Link */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full mt-6 p-4 border-2 border-dashed border-navy-300 rounded-xl text-navy-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Create a new trip</span>
        </button>
      </div>

      {/* Create Trip Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewTripName('');
        }}
        title="Create new trip"
      >
        <div className="space-y-4">
          <Input
            label="Trip name"
            placeholder="e.g., NYC Business Trip"
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setShowCreateModal(false);
                setNewTripName('');
              }}
            >
              Cancel
            </Button>
            <Button fullWidth disabled={!newTripName.trim()}>
              Create Trip
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
