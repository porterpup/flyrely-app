import { Check, Plane } from 'lucide-react';
import { formatDate, formatTime } from '~/lib/utils';
import type { Flight } from '~/types';
import { RiskPill } from './RiskPill';

interface CompletedFlightCardProps {
  flight: Flight;
  onClick?: () => void;
}

/** A past flight. We don't track actual outcomes, so the pill shows the prediction made for it. */
export function CompletedFlightCard({ flight, onClick }: CompletedFlightCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-tile border border-surface-stroke bg-white p-4 text-left transition duration-150 hover:border-surface-divider motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-body-lg font-semibold tabular-nums text-ink">{flight.flightNumber}</span>
          <span className="text-ink-caption">·</span>
          <span className="truncate text-body-md text-ink-caption">{flight.airline.name}</span>
        </div>
        <RiskPill risk={flight.riskLevel} emphasis="soft" />
      </div>
      <div className="flex items-center gap-2 text-body-md text-ink-caption">
        <span>{flight.origin.code}</span>
        <Plane className="h-4 w-4 rotate-45" aria-hidden />
        <span>{flight.destination.code}</span>
        <Check className="h-4 w-4 text-status-success-text" aria-label="Completed" />
        <span>·</span>
        <span>{formatDate(flight.scheduledDeparture)}</span>
        <span>·</span>
        <span className="tabular-nums">{formatTime(flight.scheduledDeparture)}</span>
      </div>
    </button>
  );
}
