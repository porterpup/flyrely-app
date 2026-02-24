import { Plane, AlertCircle, Clock } from 'lucide-react';
import { cn, formatDate, formatTime, getRiskLabel } from '~/lib/utils';
import type { Flight, RiskLevel } from '~/types';
import { DelaySeverityBar } from './DelaySeverityBar';

interface FlightCardProps {
  flight: Flight;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

const riskStyles: Record<RiskLevel, { bg: string; text: string; icon: string }> = {
  low: {
    bg: 'bg-green-500/20',
    text: 'text-green-100',
    icon: 'text-green-400',
  },
  medium: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-100',
    icon: 'text-amber-400',
  },
  high: {
    bg: 'bg-red-500/20',
    text: 'text-red-100',
    icon: 'text-red-400',
  },
};

export function FlightCard({ flight, onClick, variant = 'default' }: FlightCardProps) {
  const risk = riskStyles[flight.riskLevel];
  const showRiskAlert = flight.riskLevel !== 'low';

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-white border border-navy-200 rounded-xl p-4 hover:border-navy-300 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-navy-900">{flight.flightNumber}</span>
            <span className="text-navy-400">·</span>
            <span className="text-sm text-navy-500">{flight.airline.name}</span>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              flight.riskLevel === 'low' && 'bg-green-100 text-green-700',
              flight.riskLevel === 'medium' && 'bg-amber-100 text-amber-700',
              flight.riskLevel === 'high' && 'bg-red-100 text-red-700'
            )}
          >
            {getRiskLabel(flight.riskLevel)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-navy-600">
          <span>{flight.origin.code}</span>
          <Plane className="w-4 h-4 text-navy-400 rotate-90" />
          <span>{flight.destination.code}</span>
          <span className="text-navy-400">·</span>
          <span>{formatTime(flight.scheduledDeparture)}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left flight-card hover:scale-[1.02] transition-transform"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">✈️</div>
          <div>
            <p className="font-bold text-lg text-white">{flight.flightNumber}</p>
            <div className="flex items-center gap-2 text-white/80">
              <span className="text-xl font-semibold">{flight.origin.code}</span>
              <Plane className="w-5 h-5 rotate-90" />
              <span className="text-xl font-semibold">{flight.destination.code}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <p className="text-white/70 text-sm mb-4">
        {formatDate(flight.scheduledDeparture)} · Departs {formatTime(flight.scheduledDeparture)}
      </p>

      {/* Risk Alert */}
      {showRiskAlert && (
        <div className={cn('rounded-xl p-4', risk.bg)}>
          <div className="flex items-start gap-3">
            <AlertCircle className={cn('w-5 h-5 mt-0.5 flex-shrink-0', risk.icon)} />
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold', risk.text)}>
                {flight.riskLevel === 'high' ? 'High risk' : 'At risk'} ·{' '}
                {flight.delayMinutes
                  ? `${flight.delayMinutes}-${flight.delayMinutes + 30} min delay expected`
                  : 'Delay expected'}
              </p>
              {flight.delayReason && (
                <p className={cn('text-sm mt-1', risk.text, 'opacity-80')}>
                  {flight.delayReason}
                </p>
              )}
              {flight.delaySeverity && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <DelaySeverityBar severity={flight.delaySeverity} compact onDark />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {flight.riskLevel === 'low' && (
        <div className="bg-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-green-400" />
            <p className="font-semibold text-green-100">On track · No delays expected</p>
          </div>
        </div>
      )}
    </button>
  );
}
