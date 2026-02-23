import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, ChevronRight, Plane, Trash2 } from 'lucide-react';
import { Header, Button, Modal } from '~/components/ui';
import { CompletedFlightCard } from '~/components/flight/CompletedFlightCard';
import { cn, formatDate } from '~/lib/utils';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/history')({
  component: FlightHistoryScreen,
});

// Mock completed flights
const mockCompletedFlights: Flight[] = [
  {
    id: 'past-1',
    flightNumber: 'UA1071',
    airline: { code: 'UA', name: 'United Airlines' },
    origin: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', timezone: 'America/Los_Angeles' },
    destination: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
    scheduledDeparture: '2024-11-28T18:15:00',
    scheduledArrival: '2024-11-29T02:45:00',
    status: 'completed',
    riskLevel: 'low',
    delayMinutes: 0,
  },
  {
    id: 'past-2',
    flightNumber: 'AA245',
    airline: { code: 'AA', name: 'American Airlines' },
    origin: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
    destination: { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', timezone: 'America/Los_Angeles' },
    scheduledDeparture: '2024-11-25T09:30:00',
    scheduledArrival: '2024-11-25T12:45:00',
    status: 'completed',
    riskLevel: 'medium',
    delayMinutes: 45,
  },
  {
    id: 'past-3',
    flightNumber: 'DL892',
    airline: { code: 'DL', name: 'Delta Air Lines' },
    origin: { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', timezone: 'America/Los_Angeles' },
    destination: { code: 'ORD', name: "O'Hare International", city: 'Chicago', timezone: 'America/Chicago' },
    scheduledDeparture: '2024-11-20T14:00:00',
    scheduledArrival: '2024-11-20T20:15:00',
    status: 'completed',
    riskLevel: 'low',
    delayMinutes: 10,
  },
];

type FilterPeriod = 'all' | 'week' | 'month' | '3months';

function FlightHistoryScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const [showClearModal, setShowClearModal] = useState(false);

  const completedFlights = mockCompletedFlights;

  const filterOptions: { value: FilterPeriod; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'week', label: 'Past week' },
    { value: 'month', label: 'Past month' },
    { value: '3months', label: 'Past 3 months' },
  ];

  // Group flights by month
  const groupedFlights = completedFlights.reduce(
    (acc, flight) => {
      const monthKey = new Date(flight.scheduledDeparture).toLocaleDateString(
        'en-US',
        { year: 'numeric', month: 'long' }
      );
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(flight);
      return acc;
    },
    {} as Record<string, Flight[]>
  );

  const stats = {
    total: completedFlights.length,
    onTime: completedFlights.filter((f) => !f.delayMinutes || f.delayMinutes <= 15).length,
    delayed: completedFlights.filter((f) => f.delayMinutes && f.delayMinutes > 15).length,
  };

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Flight History"
          showBack
          onBackClick={() => navigate({ to: '/' })}
          rightAction={
            completedFlights.length > 0 ? (
              <button
                onClick={() => setShowClearModal(true)}
                className="p-2 text-navy-500 hover:text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : undefined
          }
        />

        {completedFlights.length === 0 ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-navy-400" />
            </div>
            <h2 className="text-xl font-semibold text-navy-900 mb-2">
              No past flights
            </h2>
            <p className="text-navy-500 mb-6">
              Completed flights will appear here so you can review your travel
              history.
            </p>
            <Button onClick={() => navigate({ to: '/' })}>
              View Upcoming Flights
            </Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="px-4 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-navy-900">{stats.total}</p>
                  <p className="text-xs text-navy-500">Total flights</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats.onTime}</p>
                  <p className="text-xs text-green-600">On time</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats.delayed}</p>
                  <p className="text-xs text-amber-600">Delayed</p>
                </div>
              </div>
            </div>

            {/* Filter */}
            <div className="px-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                      filter === option.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flight List */}
            <div className="flex-1 px-4 pb-4 space-y-6">
              {Object.entries(groupedFlights).map(([month, flights]) => (
                <div key={month}>
                  <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-3">
                    {month}
                  </h3>
                  <div className="space-y-3">
                    {flights.map((flight) => (
                      <CompletedFlightCard
                        key={flight.id}
                        flight={flight}
                        onClick={() =>
                          navigate({
                            to: '/flights/$flightId',
                            params: { flightId: flight.id },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Clear History Modal */}
        <Modal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          title="Clear flight history?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-navy-600">
              This will permanently remove all {completedFlights.length} completed
              flights from your history. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowClearModal(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={() => setShowClearModal(false)}>
                Clear All
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
