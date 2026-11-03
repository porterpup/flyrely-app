import { Plane } from 'lucide-react';
import { formatDate, formatTime, getRiskLabel, formatDelayChance } from '~/lib/utils';
import { getCityLabel, getAirportRef } from '~/lib/airportRef';
import type { Flight } from '~/types';
import { RiskPill } from './RiskPill';

interface FlightCardProps {
  flight: Flight;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

/** "Jacksonville, FL" style label for the destination, from airport reference data. */
export function tripCity(flight: Flight): string {
  return getCityLabel(flight.destination.code);
}

function shortCity(code: string, fallback: string): string {
  return getAirportRef(code)?.city ?? (fallback && fallback !== code ? fallback : '');
}

export function FlightCard({ flight, onClick, variant = 'default' }: FlightCardProps) {
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-white border border-navy-stroke rounded-2xl p-4 hover:border-navy-300 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy-ink">{flight.flightNumber}</span>
            <span className="text-navy-400">·</span>
            <span className="text-sm text-navy-caption">{flight.airline.name}</span>
          </div>
          <RiskPill risk={flight.riskLevel} />
        </div>
        <div className="flex items-center gap-2 text-sm text-navy-caption">
          <span>{flight.origin.code}</span>
          <Plane className="w-4 h-4 text-navy-400 rotate-90" />
          <span>{flight.destination.code}</span>
          <span className="text-navy-400">·</span>
          <span>{formatDate(flight.scheduledDeparture)}</span>
          <span className="text-navy-400">·</span>
          <span>{formatTime(flight.scheduledDeparture)}</span>
        </div>
      </button>
    );
  }

  const chance = formatDelayChance(flight.delayProbability);
  const originCity = shortCity(flight.origin.code, flight.origin.city);
  const destCity = shortCity(flight.destination.code, flight.destination.city);

  return (
    <button
      onClick={onClick}
      className="w-full text-left flight-card active:scale-[0.99] transition-transform"
      aria-label={`${flight.flightNumber}, ${getRiskLabel(flight.riskLevel)}`}
    >
      <p className="text-lg text-white mb-4">Your trip to {tripCity(flight)}</p>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <span className="text-xl font-medium underline underline-offset-4">{flight.flightNumber}</span>
        <RiskPill risk={flight.riskLevel} detail={flight.riskLevel === 'low' ? null : chance} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-white/60 mb-1">Scheduled departure</p>
          <p className="text-3xl font-medium tracking-tight">{formatTime(flight.scheduledDeparture)}</p>
          <p className="text-xs text-white/60 mt-1">{formatDate(flight.scheduledDeparture)}</p>
          <p className="text-xs text-white/60">
            {flight.origin.code}
            {originCity && ` · ${originCity}`}
          </p>
        </div>
        <div className="flex-1 flex items-center gap-1 pb-8 min-w-6">
          <div className="flex-1 border-t border-dotted border-brand/60" />
          <Plane className="w-4 h-4 text-brand rotate-90" />
          <div className="flex-1 border-t border-dotted border-brand/60" />
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60 mb-1">Arriving</p>
          <p className="text-3xl font-medium tracking-tight">{flight.destination.code}</p>
          <p className="text-xs text-white/60 mt-1">&nbsp;</p>
          <p className="text-xs text-white/60">{destCity || flight.destination.code}</p>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-dashed border-brand/40 text-center text-xs text-white/50">
        {flight.airline.name}
      </div>
    </button>
  );
}
