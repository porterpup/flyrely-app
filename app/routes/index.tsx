import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus, ChevronRight, Plane, History } from 'lucide-react';
import { AppShell } from '~/components/layout';
import { Button } from '~/components/ui';
import { FlightCard, AlertCard } from '~/components/flight';
import type { Flight } from '~/types';

export const Route = createFileRoute('/')({
  component: HomeScreen,
});

// Mock data - replace with actual API calls
const mockFlights: Flight[] = [
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
    delayReason: 'Historically late at this hour',
  },
];

const mockAlerts = [
  {
    id: '1',
    type: 'risk_increase' as const,
    flightNumber: 'UA1071 · SFO → JFK · 6:15 PM',
    message: 'Delay risk increased for UA1071',
    timestamp: 'Just now',
  },
];

function HomeScreen() {
  const navigate = useNavigate();
  const [flights] = useState<Flight[]>(mockFlights);
  const hasFlights = flights.length > 0;

  if (!hasFlights) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-6xl mb-6">✈️</div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">
            No upcoming flights
          </h1>
          <p className="text-navy-500 mb-8 max-w-xs">
            Add your first flight to start tracking delays and stay informed.
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={() => navigate({ to: '/flights/add' })}
          >
            Add your first flight
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy-900">Home</h1>
          <button
            onClick={() => navigate({ to: '/flights/history' })}
            className="p-2 text-navy-500 hover:text-navy-700 rounded-lg hover:bg-navy-50"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        {/* Next Flight Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-900">Next flight</h2>
            <Link
              to="/flights/add"
              className="flex items-center gap-1 text-primary-600 font-medium text-sm hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Add
            </Link>
          </div>

          <FlightCard
            flight={flights[0]}
            onClick={() =>
              navigate({ to: '/flights/$flightId', params: { flightId: flights[0].id } })
            }
          />
        </section>

        {/* Recent Alerts Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Recent alerts</h2>
          <div className="space-y-3">
            {mockAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                type={alert.type}
                flightNumber={alert.flightNumber}
                message={alert.message}
                timestamp={alert.timestamp}
                onClick={() =>
                  navigate({ to: '/flights/$flightId', params: { flightId: '1' } })
                }
              />
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/flights/history"
              className="flex items-center gap-3 p-4 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors"
            >
              <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-navy-600" />
              </div>
              <div>
                <p className="font-medium text-navy-900">View all flights</p>
                <p className="text-xs text-navy-500">See your full schedule</p>
              </div>
            </Link>

            <Link
              to="/flights/add"
              className="flex items-center gap-3 p-4 bg-white border border-navy-200 rounded-xl hover:border-navy-300 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-navy-900">Add flight</p>
                <p className="text-xs text-navy-500">Track another trip</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
