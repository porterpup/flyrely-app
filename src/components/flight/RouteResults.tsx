import { Info } from 'lucide-react';
import { cn, topReasons } from '~/lib/utils';
import { RiskPill } from './RiskPill';
import {
  formatClock, mostReliableIndex, SCHEDULE_LABEL, SCHEDULE_TOOLTIP, sortByDeparture,
} from '~/lib/flightLookup';
import type { SearchFlight } from '~/lib/flightLookup';

/** "Based on recent schedules" with a tooltip: times can change, confirm on your booking. */
export function ScheduleHonesty({ asOf }: { asOf?: string | null }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-navy-caption">
      <span>{SCHEDULE_LABEL}{asOf ? ` (as of ${asOf})` : ''}</span>
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
  onPick,
}: {
  flights: SearchFlight[];
  asOf?: string | null;
  disabled?: boolean;
  onPick: (flight: SearchFlight) => void;
}) {
  const sorted = sortByDeparture(flights);
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
            'w-full rounded-2xl border border-navy-stroke bg-white p-4 text-left hover:border-navy-300',
            disabled && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-navy-ink">{f.flight}</span>
            <span className="text-sm text-navy-caption">{f.airline_name}</span>
          </div>
          <p className="mt-1 text-sm text-navy-caption">
            {formatClock(f.dep_time)} → {formatClock(f.arr_time)}
            {f.arr_next_day ? ' (+1 day)' : ''}
            {f.operating_airline !== f.airline ? ` · operated by ${f.operating_airline_name}` : ''}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <RiskPill risk={f.risk_level} emphasis="soft" size="small" />
            <span className="text-sm text-navy-caption">{Math.round(f.delay_probability * 100)}% chance of a 15+ min delay</span>
            {i === best && sorted.length > 1 && (
              <span className="text-sm font-semibold text-status-success-text">Most reliable</span>
            )}
          </div>
          {f.risk_factors && f.risk_factors.length > 0 && (
            <p className="mt-1.5 text-sm text-navy-caption">Why: {topReasons(f.risk_factors)}</p>
          )}
        </button>
      ))}
    </div>
  );
}
