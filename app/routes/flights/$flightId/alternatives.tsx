import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, Info, RefreshCw } from 'lucide-react';
import { Button, Header, Modal } from '~/components/ui';
import { AlternateFlightCard } from '~/components/flight/AlternateFlightCard';
import type { AlternateFlight, Flight } from '~/types';

export const Route = createFileRoute('/flights/$flightId/alternatives')({
  component: AlternativeFlightsScreen,
});

// Mock data - in real app this would come from API
const mockCurrentFlight: Flight = {
  id: '1',
  flightNumber: 'UA1071',
  airline: { code: 'UA', name: 'United Airlines' },
  origin: { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', timezone: 'America/Los_Angeles' },
  destination: { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', timezone: 'America/New_York' },
  scheduledDeparture: '2024-12-03T18:15:00',
  scheduledArrival: '2024-12-04T02:45:00',
  predictedDeparture: '2024-12-03T19:15:00',
  status: 'scheduled',
  riskLevel: 'high',
  delayMinutes: 60,
  delayReason: 'Weather conditions at destination',
};

const mockAlternatives: AlternateFlight[] = [
  {
    id: 'alt-1',
    flightNumber: 'UA1089',
    airline: { code: 'UA', name: 'United Airlines' },
    scheduledDeparture: '2024-12-03T20:30:00',
    scheduledArrival: '2024-12-04T04:50:00',
    riskLevel: 'low',
    availableSeats: 12,
  },
  {
    id: 'alt-2',
    flightNumber: 'AA178',
    airline: { code: 'AA', name: 'American Airlines' },
    scheduledDeparture: '2024-12-03T19:45:00',
    scheduledArrival: '2024-12-04T04:15:00',
    riskLevel: 'low',
    availableSeats: 8,
  },
  {
    id: 'alt-3',
    flightNumber: 'DL405',
    airline: { code: 'DL', name: 'Delta Air Lines' },
    scheduledDeparture: '2024-12-03T21:00:00',
    scheduledArrival: '2024-12-04T05:20:00',
    riskLevel: 'medium',
    availableSeats: 23,
  },
];

function AlternativeFlightsScreen() {
  const navigate = useNavigate();
  const { flightId } = Route.useParams();
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const currentFlight = mockCurrentFlight;
  const alternatives = mockAlternatives;
  const selectedFlight = alternatives.find((f) => f.id === selectedAlt);

  const handleSwitch = async () => {
    if (!selectedFlight) return;

    setIsSwitching(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSwitching(false);
    setShowConfirmModal(false);
    navigate({ to: '/flights/$flightId', params: { flightId: selectedFlight.id } });
  };

  return (
    <div className="app-container">
      <div className="screen">
        <Header
          title="Alternative Flights"
          showBack
          onBackClick={() => navigate({ to: '/flights/$flightId', params: { flightId } })}
        />

        {/* Current Flight Warning */}
        <div className="px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">
                  High delay risk on {currentFlight.flightNumber}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Expected {currentFlight.delayMinutes}+ min delay due to{' '}
                  {currentFlight.delayReason?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alternatives List */}
        <div className="flex-1 px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-900">
              Available alternatives
            </h2>
            <button className="p-2 text-navy-500 hover:text-navy-700 rounded-lg hover:bg-navy-50">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {alternatives.map((alt) => (
              <AlternateFlightCard
                key={alt.id}
                flight={alt}
                originCode={currentFlight.origin.code}
                destinationCode={currentFlight.destination.code}
                onSelect={() => setSelectedAlt(alt.id)}
                isSelected={selectedAlt === alt.id}
              />
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-navy-50 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-navy-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-navy-600">
                FlyRely helps you find alternatives, but rebooking must be done
                directly with the airline. Contact your airline or use their app
                to change your reservation.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        {selectedAlt && (
          <div className="sticky bottom-0 p-4 bg-white border-t border-navy-100">
            <Button
              fullWidth
              size="lg"
              onClick={() => setShowConfirmModal(true)}
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
            >
              Switch to {selectedFlight?.flightNumber}
            </Button>
          </div>
        )}

        {/* Confirm Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Switch flight?"
        >
          <div className="space-y-4">
            <p className="text-navy-600">
              This will replace <strong>{currentFlight.flightNumber}</strong> with{' '}
              <strong>{selectedFlight?.flightNumber}</strong> in your tracked
              flights. You'll receive alerts for the new flight instead.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                Remember: You'll need to rebook with the airline separately.
                FlyRely only tracks your flights.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={handleSwitch} loading={isSwitching}>
                Confirm Switch
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
