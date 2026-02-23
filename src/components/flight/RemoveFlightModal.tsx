import { useState } from 'react';
import { Trash2, AlertTriangle, BellOff } from 'lucide-react';
import { Button, Modal } from '~/components/ui';
import { formatDate } from '~/lib/utils';
import type { Flight } from '~/types';

interface RemoveFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight;
  onConfirm: () => Promise<void>;
}

export function RemoveFlightModal({
  isOpen,
  onClose,
  flight,
  onConfirm,
}: RemoveFlightModalProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    await onConfirm();
    setIsRemoving(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-navy-900 mb-2">Remove flight?</h2>

        {/* Flight info */}
        <div className="bg-navy-50 rounded-xl p-4 mb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✈️</div>
            <div>
              <p className="font-semibold text-navy-900">{flight.flightNumber}</p>
              <p className="text-sm text-navy-600">
                {flight.origin.code} → {flight.destination.code}
              </p>
              <p className="text-sm text-navy-500">
                {formatDate(flight.scheduledDeparture)}
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-left">
          <div className="flex items-start gap-2">
            <BellOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              You'll stop receiving alerts and predictions for this flight.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Keep Flight
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleRemove}
            loading={isRemoving}
          >
            Remove
          </Button>
        </div>
      </div>
    </Modal>
  );
}
