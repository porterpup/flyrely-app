import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, Trash2 } from 'lucide-react';
import { Header, Button, Modal, EmptyState } from '~/components/ui';
import { CompletedFlightCard } from '~/components/flight/CompletedFlightCard';
import { cn } from '~/lib/utils';
import { selectCompleted, clearCompletedFlights } from '~/lib/flightStore';
import { useFlights } from '~/hooks/useFlights';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/history')({
  component: FlightHistoryScreen,
});

type FilterPeriod = 'all' | 'week' | 'month' | '3months';

function filterFlights(flights: Flight[], period: FilterPeriod): Flight[] {
  if (period === 'all') return flights;
  const ms = period === 'week' ? 7 : period === 'month' ? 30 : 90;
  const cutoff = Date.now() - ms * 24 * 60 * 60 * 1000;
  return flights.filter((f) => new Date(f.scheduledDeparture).getTime() >= cutoff);
}

function FlightHistoryScreen() {
  const navigate = useNavigate();
  const { flights } = useFlights();
  const allCompleted = useMemo(() => selectCompleted(flights), [flights]);
  const [filter, setFilter] = useState<FilterPeriod>('all');
  const [showClearModal, setShowClearModal] = useState(false);

  const completedFlights = filterFlights(allCompleted, filter);

  const filterOptions: { value: FilterPeriod; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'week', label: 'Past week' },
    { value: 'month', label: 'Past month' },
    { value: '3months', label: 'Past 3 months' },
  ];

  const groupedFlights = completedFlights.reduce(
    (acc, flight) => {
      const monthKey = new Date(flight.scheduledDeparture).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(flight);
      return acc;
    },
    {} as Record<string, Flight[]>
  );

  const stats = {
    total: allCompleted.length,
    // Predicted risk at tracking time; actual outcomes are not recorded.
    lowRisk: allCompleted.filter((f) => f.riskLevel === 'low').length,
    elevatedRisk: allCompleted.filter((f) => f.riskLevel !== 'low').length,
  };

  function handleClearAll() {
    clearCompletedFlights();
    setShowClearModal(false);
  }

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Past flights"
          showBack
          onBackClick={() => navigate({ to: '/' })}
          rightAction={
            allCompleted.length > 0 ? (
              <button
                onClick={() => setShowClearModal(true)}
                className="p-2 text-ink-caption hover:text-status-error-text rounded-lg hover:bg-status-error-bg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : undefined
          }
        />

        {allCompleted.length === 0 ? (
          <EmptyState
            className="flex-1 justify-center"
            icon={<Calendar />}
            title="No past flights"
            description="Flights automatically move here after departure. Track a flight to get started."
            action={<Button onClick={() => navigate({ to: '/' })}>View upcoming flights</Button>}
          />
        ) : (
          <>
            {/* Stats */}
            <div className="px-4 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-muted rounded-tile p-3 text-center">
                  <p className="text-title-lg font-semibold text-ink">{stats.total}</p>
                  <p className="text-body-sm text-ink-caption">Total flights</p>
                </div>
                <div className="bg-status-success-bg rounded-tile p-3 text-center">
                  <p className="text-title-lg font-semibold text-status-success-text">{stats.lowRisk}</p>
                  <p className="text-body-sm text-status-success-text">Predicted low risk</p>
                </div>
                <div className="bg-status-warning-bg rounded-tile p-3 text-center">
                  <p className="text-title-lg font-semibold text-status-warning-text">{stats.elevatedRisk}</p>
                  <p className="text-body-sm text-status-warning-text">Predicted at risk</p>
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
                      'px-4 py-2 rounded-full text-body-md font-medium whitespace-nowrap transition-colors',
                      filter === option.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-muted text-ink-caption hover:bg-surface-stroke'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flight List */}
            {completedFlights.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-12">
                <p className="text-ink-caption">No flights in this time period.</p>
              </div>
            ) : (
              <div className="flex-1 px-4 pb-4 space-y-6">
                {Object.entries(groupedFlights).map(([month, flights]) => (
                  <div key={month}>
                    <h3 className="text-body-md font-medium text-ink-caption mb-3">
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
            )}
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
            <p className="text-ink-caption">
              This will permanently remove all {allCompleted.length} completed flights from your
              history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowClearModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
