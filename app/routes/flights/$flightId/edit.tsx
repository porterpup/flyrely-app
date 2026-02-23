import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, Plane, Search, Check, AlertCircle } from 'lucide-react';
import { Button, Header, Input, Modal } from '~/components/ui';
import { cn, formatDate } from '~/lib/utils';
import type { Flight } from '~/types';

export const Route = createFileRoute('/flights/$flightId/edit')({
  component: EditFlightScreen,
});

// Mock current flight data
const mockFlight: Flight = {
  id: '1',
  flightNumber: 'UA1071',
  airline: { code: 'UA', name: 'United Airlines' },
  origin: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', timezone: 'America/Los_Angeles' },
  destination: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
  scheduledDeparture: '2024-12-03T18:15:00',
  scheduledArrival: '2024-12-04T02:45:00',
  status: 'scheduled',
  riskLevel: 'medium',
};

// Mock alternative flights on same route/date
const mockSameRouteFlight = [
  { id: '2', flightNumber: 'UA1089', departureTime: '8:30 PM', airline: 'United Airlines' },
  { id: '3', flightNumber: 'UA1095', departureTime: '10:15 PM', airline: 'United Airlines' },
];

type EditMode = 'date' | 'flight';

function EditFlightScreen() {
  const navigate = useNavigate();
  const { flightId } = Route.useParams();

  const [editMode, setEditMode] = useState<EditMode>('date');
  const [selectedDate, setSelectedDate] = useState(mockFlight.scheduledDeparture.split('T')[0]);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentFlight = mockFlight;
  const altFlights = mockSameRouteFlight;

  const handleSearch = async () => {
    setIsSearching(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSearching(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    setShowConfirmModal(false);
    navigate({ to: '/flights/$flightId', params: { flightId } });
  };

  const hasChanges =
    editMode === 'date'
      ? selectedDate !== currentFlight.scheduledDeparture.split('T')[0]
      : selectedFlight !== null;

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Edit Flight"
          showBack
          onBackClick={() => navigate({ to: '/flights/$flightId', params: { flightId } })}
        />

        {/* Current Flight Info */}
        <div className="px-4 py-4">
          <div className="bg-navy-50 rounded-xl p-4">
            <p className="text-sm text-navy-500 mb-1">Currently tracking</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-navy-600" />
              </div>
              <div>
                <p className="font-semibold text-navy-900">
                  {currentFlight.flightNumber}
                </p>
                <p className="text-sm text-navy-600">
                  {currentFlight.origin.code} → {currentFlight.destination.code} ·{' '}
                  {formatDate(currentFlight.scheduledDeparture)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Mode Tabs */}
        <div className="px-4 mb-4">
          <div className="flex bg-navy-100 rounded-xl p-1">
            <button
              onClick={() => setEditMode('date')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                editMode === 'date'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600'
              )}
            >
              Change Date
            </button>
            <button
              onClick={() => setEditMode('flight')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                editMode === 'flight'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600'
              )}
            >
              Different Flight
            </button>
          </div>
        </div>

        {/* Edit Content */}
        <div className="flex-1 px-4 pb-4">
          {editMode === 'date' ? (
            <div className="space-y-4">
              <p className="text-navy-600">
                Select a new date for flight {currentFlight.flightNumber}
              </p>

              <Input
                label="New departure date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                leftIcon={<Calendar className="h-5 w-5" />}
              />

              {selectedDate !== currentFlight.scheduledDeparture.split('T')[0] && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">
                        We'll search for {currentFlight.flightNumber} on the new date
                      </p>
                      <p>
                        If the flight doesn't operate that day, we'll let you know.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-navy-600">
                Pick a different flight on the same route
              </p>

              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search flight number"
                  leftIcon={<Search className="h-5 w-5" />}
                  className="flex-1"
                />
                <Button onClick={handleSearch} loading={isSearching}>
                  Search
                </Button>
              </div>

              {/* Available flights on same route */}
              <div>
                <p className="text-sm font-medium text-navy-700 mb-3">
                  Same route on {formatDate(currentFlight.scheduledDeparture)}
                </p>

                <div className="space-y-2">
                  {altFlights.map((flight) => (
                    <button
                      key={flight.id}
                      onClick={() => setSelectedFlight(flight.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                        selectedFlight === flight.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-navy-200 hover:border-navy-300'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                          <Plane className="w-5 h-5 text-navy-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-navy-900">
                            {flight.flightNumber}
                          </p>
                          <p className="text-sm text-navy-500">
                            {flight.airline} · Departs {flight.departureTime}
                          </p>
                        </div>
                      </div>

                      {selectedFlight === flight.id && (
                        <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        {hasChanges && (
          <div className="sticky bottom-0 p-4 bg-white border-t border-navy-100">
            <Button fullWidth size="lg" onClick={() => setShowConfirmModal(true)}>
              Save Changes
            </Button>
          </div>
        )}

        {/* Confirm Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Update flight?"
        >
          <div className="space-y-4">
            <p className="text-navy-600">
              {editMode === 'date'
                ? `Change ${currentFlight.flightNumber} from ${formatDate(currentFlight.scheduledDeparture)} to ${formatDate(selectedDate + 'T00:00:00')}?`
                : `Replace ${currentFlight.flightNumber} with ${altFlights.find((f) => f.id === selectedFlight)?.flightNumber}?`}
            </p>

            <p className="text-sm text-navy-500">
              Your alerts and predictions will update to reflect this change.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={handleSave} loading={isSaving}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
