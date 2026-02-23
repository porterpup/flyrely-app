import { Plane, Clock, ArrowRight } from 'lucide-react';
import { cn, formatTime, getRiskBadgeClass, getRiskLabel } from '~/lib/utils';
import type { AlternateFlight } from '~/types';

interface AlternateFlightCardProps {
  flight: AlternateFlight;
  originCode: string;
  destinationCode: string;
  onSelect: () => void;
  isSelected?: boolean;
}

export function AlternateFlightCard({
  flight,
  originCode,
  destinationCode,
  onSelect,
  isSelected = false,
}: AlternateFlightCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all',
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-navy-200 bg-white hover:border-navy-300'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {flight.airline.logo ? (
            <img
              src={flight.airline.logo}
              alt={flight.airline.name}
              className="w-6 h-6 rounded"
            />
          ) : (
            <div className="w-6 h-6 bg-navy-100 rounded flex items-center justify-center">
              <Plane className="w-4 h-4 text-navy-500" />
            </div>
          )}
          <span className="font-semibold text-navy-900">
            {flight.flightNumber}
          </span>
        </div>

        <span className={getRiskBadgeClass(flight.riskLevel)}>
          {getRiskLabel(flight.riskLevel)}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-navy-900">{originCode}</p>
          <p className="text-sm text-navy-500">
            {formatTime(flight.scheduledDeparture)}
          </p>
        </div>

        <div className="flex-1 flex items-center gap-2 px-2">
          <div className="flex-1 border-t border-dashed border-navy-300" />
          <Plane className="w-4 h-4 text-navy-400 rotate-90" />
          <div className="flex-1 border-t border-dashed border-navy-300" />
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-navy-900">{destinationCode}</p>
          <p className="text-sm text-navy-500">
            {formatTime(flight.scheduledArrival)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-navy-500">{flight.airline.name}</span>
        {flight.availableSeats && (
          <span className="text-navy-500">
            {flight.availableSeats} seats left
          </span>
        )}
      </div>

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-primary-200 flex items-center justify-center gap-2 text-primary-600 font-medium">
          <span>Switch to this flight</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </button>
  );
}
