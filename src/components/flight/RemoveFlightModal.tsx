import { useState } from 'react';
import { Trash2, BellOff, Plane } from 'lucide-react';
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
        <div className="w-16 h-16 bg-status-error-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-status-error-text" />
        </div>

        {/* Title */}
        <h2 className="text-title-md font-semibold text-ink mb-2">Remove flight?</h2>

        {/* Flight info */}
        <div className="bg-surface-muted rounded-tile p-4 mb-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-caption"><Plane className="h-5 w-5 rotate-45" aria-hidden /></div>
            <div>
              <p className="font-semibold text-ink">{flight.flightNumber}</p>
              <p className="text-body-md text-ink-caption">
                {flight.origin.code} → {flight.destination.code}
              </p>
              <p className="text-body-md text-ink-caption">
                {formatDate(flight.scheduledDeparture)}
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-status-warning-bg border border-status-warning-text/20 rounded-lg p-3 mb-6 text-left">
          <div className="flex items-start gap-2">
            <BellOff className="w-5 h-5 text-status-warning-text flex-shrink-0 mt-0.5" />
            <p className="text-body-md text-status-warning-text">
              This flight and its prediction will be removed from your list.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
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
