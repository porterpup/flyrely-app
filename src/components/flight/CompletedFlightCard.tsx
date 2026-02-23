import { Check, Clock, AlertTriangle, Plane } from 'lucide-react';
import { cn, formatDate, formatTime } from '~/lib/utils';
import type { Flight } from '~/types';

interface CompletedFlightCardProps {
  flight: Flight;
  onClick?: () => void;
}

export function CompletedFlightCard({ flight, onClick }: CompletedFlightCardProps) {
  const wasDelayed = flight.delayMinutes && flight.delayMinutes > 15;
  const wasOnTime = !wasDelayed;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-navy-200 rounded-xl p-4 hover:border-navy-300 transition-colors opacity-75 hover:opacity-100"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
            <Plane className="w-5 h-5 text-navy-500" />
          </div>
          <div>
            <p className="font-semibold text-navy-900">{flight.flightNumber}</p>
            <p className="text-sm text-navy-500">{flight.airline.name}</p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            wasOnTime ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          )}
        >
          {wasOnTime ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>On time</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>{flight.delayMinutes}m late</span>
            </>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-3">
        <div>
          <p className="text-lg font-bold text-navy-700">{flight.origin.code}</p>
        </div>
        <div className="flex-1 flex items-center gap-2 px-2">
          <div className="flex-1 border-t border-dashed border-navy-300" />
          <Check className="w-4 h-4 text-green-500" />
          <div className="flex-1 border-t border-dashed border-navy-300" />
        </div>
        <div>
          <p className="text-lg font-bold text-navy-700">{flight.destination.code}</p>
        </div>
      </div>

      {/* Date & Times */}
      <div className="flex items-center justify-between text-sm text-navy-500">
        <span>{formatDate(flight.scheduledDeparture)}</span>
        <span>Landed {formatTime(flight.scheduledArrival)}</span>
      </div>
    </button>
  );
}
