import { Info } from 'lucide-react';
import { cn, formatDelayPercent, formatMonthYear, topReasons } from '~/lib/utils';
import { RiskPill } from './RiskPill';
import {
  formatClock, mostReliableIndex, SCHEDULE_LABEL, SCHEDULE_TOOLTIP, sortByDeparture,
} from '~/lib/flightLookup';
import type { SearchFlight } from '~/lib/flightLookup';

/** "Based on recent schedules" with a tooltip: times can change, confirm on your booking. */
export function ScheduleHonesty({ asOf }: { asOf?: string | null }) {
  return (
    <p className="flex items-center gap-1.5 text-body-md text-ink-caption">
      <span>{SCHEDULE_LABEL}{asOf ? ` (as of ${formatMonthYear(asOf)})` : ''}</span>
      <span title={SCHEDULE_TOOLTIP} role="img" aria-label={SCHEDULE_TOOLTIP} tabIndex={0}>
        <Info className="h-4 w-4" />
      </span>
    </p>
  );
}

/** Every scheduled flight on a route, earliest first, each with its delay chance. Tap one to track it. */
export function RouteResults({
  flights,
  asOf,
  disabled,
  preferredAirline,
  onPick,
}: {
  flights: SearchFlight[];
  asOf?: string | null;
  disabled?: boolean;
  /** Airline code from the user's profile; its flights are listed first and marked. */
  preferredAirline?: string | null;
  onPick: (flight: SearchFlight) => void;
}) {
  const byTime = sortByDeparture(flights);
  const isPreferred = (f: SearchFlight) => !!preferredAirline && f.airline === preferredAirline;
  const sorted = preferredAirline ? [...byTime.filter(isPreferred), ...byTime.filter((f) => !isPreferred(f))] : byTime;
  const best = mostReliableIndex(sorted);
  return (
    <div className="space-y-3" data-testid="route-results">
      <ScheduleHonesty asOf={asOf} />
      <p className="text-body-md text-ink-sub">
        {sorted.length} flight{sorted.length === 1 ? '' : 's'}. Compare the delay chances, then tap the one you want.
      </p>
      {sorted.map((f, i) => (
        <button
          key={`${f.flight}-${f.dep_time}`}
          type="button"
          disabled={disabled}
          onClick={() => onPick(f)}
          aria-label={`${f.flight} ${f.origin} to ${f.dest}, ${formatClock(f.dep_time)} to ${formatClock(f.arr_time)}, ${Math.round(f.delay_probability * 100)}% chance of a 15+ min delay${f.risk_factors?.length ? `. Why: ${topReasons(f.risk_factors)}` : ''}`}
          className={cn(
            'w-full rounded-tile border bg-white p-4 text-left hover:border-surface-divider',
            isPreferred(f) ? 'border-surface-accent' : 'border-surface-stroke',
            disabled && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">
              {f.flight}
              {isPreferred(f) && <span className="ml-2 text-body-md font-medium text-surface-accent">Your airline</span>}
            </span>
            <span className="text-body-md text-ink-caption">{f.airline_name}</span>
          </div>
          <p className="mt-1 text-body-md text-ink-caption">
            {formatClock(f.dep_time)} → {formatClock(f.arr_time)}
            {f.arr_next_day ? ' (+1 day)' : ''}
            {f.operating_airline !== f.airline ? ` · operated by ${f.operating_airline_name}` : ''}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <RiskPill risk={f.risk_level} emphasis="soft" size="small" detail={formatDelayPercent(f.delay_probability)} />
            {i === best && sorted.length > 1 && (
              <span className="text-body-md font-semibold text-status-success-text">Most reliable</span>
            )}
          </div>
          {f.risk_factors && f.risk_factors.length > 0 && (
            <p className="mt-1.5 text-body-md text-ink-caption">Why: {topReasons(f.risk_factors)}</p>
          )}
        </button>
      ))}
    </div>
  );
}
