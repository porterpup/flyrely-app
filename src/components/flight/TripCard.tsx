import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '~/components/ui';
import { formatDate } from '~/lib/utils';
import { chainLabel, tripTitle } from '~/lib/tripGrouping';
import type { Flight, Trip } from '~/types';
import { ConnectionRow } from './ConnectionRow';
import { FlightCard } from './FlightCard';

interface TripCardProps {
  trip: Trip;
  /** The trip's flights in leg order. */
  legs: Flight[];
  onOpenTrip: () => void;
  onOpenFlight: (flight: Flight) => void;
}

/** First to last departure date, "Dec 3" or "Dec 3 - Dec 4". */
function dateRange(legs: Flight[]): string {
  const first = formatDate(legs[0].scheduledDeparture);
  const last = formatDate(legs[legs.length - 1].scheduledDeparture);
  return first === last ? first : `${first} - ${last}`;
}

export function TripCard({ trip, legs, onOpenTrip, onOpenFlight }: TripCardProps) {
  if (legs.length === 0) return null;
  return (
    <Card padded={false} className="overflow-hidden">
      <button
        type="button"
        onClick={onOpenTrip}
        className="flex w-full items-center justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
      >
        <div className="min-w-0">
          <p className="truncate text-body-lg font-semibold text-ink">{tripTitle(trip, legs)}</p>
          <p className="truncate text-body-md text-ink-caption">
            {trip.name ? `${chainLabel(legs)} · ` : ''}
            {dateRange(legs)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-caption" aria-hidden />
      </button>
      <div className="space-y-2 px-4 pb-4">
        {legs.map((leg, i) => (
          <Fragment key={leg.id}>
            {i > 0 && <ConnectionRow prev={legs[i - 1]} next={leg} />}
            <FlightCard flight={leg} variant="compact" onClick={() => onOpenFlight(leg)} />
          </Fragment>
        ))}
      </div>
    </Card>
  );
}
