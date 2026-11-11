import { ArrowRight } from 'lucide-react';
import { cn } from '~/lib/utils';
import { ScheduleHonesty } from './RouteResults';
import { formatClock, legLabel } from '~/lib/flightLookup';
import type { LookupLeg } from '~/lib/flightLookup';

/** Tappable cards for the leg(s) a flight number flies on the chosen date. */
export function LookupResults({
  flight,
  legs,
  note,
  disabled,
  onPick,
}: {
  flight: string;
  legs: LookupLeg[];
  note?: string;
  disabled?: boolean;
  onPick: (leg: LookupLeg) => void;
}) {
  return (
    <div className="space-y-3" data-testid="lookup-results">
      <ScheduleHonesty />
      <p className="text-body-md text-ink-sub">
        {legs.length === 1 ? 'We found this flight. Tap it to continue.' : `${flight} flies ${legs.length} legs that day. Which one are you on?`}
      </p>
      {legs.map((leg) => (
        <button
          key={`${leg.origin}-${leg.dest}-${leg.dep_time}`}
          type="button"
          disabled={disabled}
          aria-label={legLabel(flight, leg)}
          onClick={() => onPick(leg)}
          className={cn(
            'w-full rounded-tile border border-surface-stroke bg-white p-4 text-left hover:border-surface-divider',
            disabled && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{flight}</span>
            <span className="text-body-md text-ink-caption">{leg.operating_airline_name}</span>
          </div>
          <p className="mt-1 flex items-center gap-2 font-semibold text-ink">
            {leg.origin} <ArrowRight className="h-4 w-4" aria-label="to" /> {leg.dest}
          </p>
          <p className="mt-1 text-body-md text-ink-caption">
            {formatClock(leg.dep_time)} → {formatClock(leg.arr_time)}
            {leg.arr_next_day ? ' (+1 day)' : ''}
          </p>
        </button>
      ))}
      {note && <p className="text-body-md text-ink-caption">{note}</p>}
    </div>
  );
}
