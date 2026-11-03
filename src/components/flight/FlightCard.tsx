import { Plane } from 'lucide-react';
import { formatDate, formatTime, getRiskLabel, formatDelayChance, cn } from '~/lib/utils';
import { getCityLabel, getAirportRef } from '~/lib/airportRef';
import type { Flight } from '~/types';
import { RiskPill } from './RiskPill';
import { Ticket } from './Ticket';

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
        className="w-full rounded-tile border border-surface-stroke bg-white p-4 text-left transition-colors hover:border-surface-divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-body-lg font-semibold text-ink">{flight.flightNumber}</span>
            <span className="text-ink-caption">·</span>
            <span className="text-body-md text-ink-caption">{flight.airline.name}</span>
          </div>
          <RiskPill risk={flight.riskLevel} emphasis="soft" />
        </div>
        <div className="flex items-center gap-2 text-body-md text-ink-caption">
          <span>{flight.origin.code}</span>
          <Plane className="h-4 w-4 rotate-45" aria-hidden />
          <span>{flight.destination.code}</span>
          <span>·</span>
          <span>{formatDate(flight.scheduledDeparture)}</span>
          <span>·</span>
          <span>{formatTime(flight.scheduledDeparture)}</span>
        </div>
      </button>
    );
  }

  const chance = formatDelayChance(flight.delayProbability);
  const originCity = shortCity(flight.origin.code, flight.origin.city);
  const destCity = shortCity(flight.destination.code, flight.destination.city);

  return (
    <Ticket
      as="button"
      onClick={onClick}
      aria-label={`${flight.flightNumber}, ${getRiskLabel(flight.riskLevel)}`}
      className={cn('active:scale-[0.99] transition-transform')}
      title={`Your trip to ${tripCity(flight)}`}
      flightNumber={flight.flightNumber}
      badge={<RiskPill risk={flight.riskLevel} detail={flight.riskLevel === 'low' ? null : chance} />}
      departure={{
        label: 'Departs',
        primary: formatTime(flight.scheduledDeparture),
        date: formatDate(flight.scheduledDeparture),
        place: `${flight.origin.code}${originCity ? ` · ${originCity}` : ''}`,
      }}
      arrival={{
        label: 'Arriving',
        primary: flight.destination.code,
        place: destCity || flight.destination.code,
      }}
      footer={flight.airline.name}
    />
  );
}
