import { useState } from 'react';
import { Info } from 'lucide-react';
import { Plane } from 'lucide-react';
import { Button, Card, EmptyState } from '~/components/ui';
import { localMinutes, MAX_LAYOVER_MINUTES } from '~/lib/tripGrouping';
import { AIRPORT_TZ } from '~/lib/airportTz';
import { cn, formatDelayPercent, formatMonthYear, topReasons } from '~/lib/utils';
import { RiskPill } from './RiskPill';
import {
  formatClock, minutesOfDay, SCHEDULE_LABEL, SCHEDULE_TOOLTIP, sortByDeparture,
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

export const ROW_CAP = 10;

/**
 * Connecting flights only: keeps flights that leave after the previous leg lands and within 24 hours of it.
 * Same rule as validateTripLegs (more than 0, at most MAX_LAYOVER_MINUTES), so a row shown here can be added.
 * `date` is the searched day; `afterArrivalLocal` is the previous leg's arrival wall-clock (YYYY-MM-DDTHH:MM).
 */
export function filterAfterArrival(flights: SearchFlight[], date: string, afterArrivalLocal: string): SearchFlight[] {
  const arr = localMinutes(afterArrivalLocal);
  if (arr === null) return flights;
  return flights.filter((f) => {
    const dep = localMinutes(`${date}T${f.dep_time}:00`);
    if (dep === null) return true;
    const layover = Math.round(dep - arr);
    return layover > 0 && layover <= MAX_LAYOVER_MINUTES;
  });
}

export type DayPart = 'Morning' | 'Afternoon' | 'Evening';

/** Morning is before 12:00, afternoon 12:00 to 16:59, evening 17:00 on. */
export function dayPart(depTime: string): DayPart {
  const m = minutesOfDay(depTime);
  return m < 12 * 60 ? 'Morning' : m < 17 * 60 ? 'Afternoon' : 'Evening';
}

const pct = (f: SearchFlight) => Math.round(f.delay_probability * 100);

/** Lowest delay chance (by whole percent); ties go to the earliest departure. `tied` is true when others share that percent. */
export function pickBestBet(flights: SearchFlight[]): { flight: SearchFlight; tied: boolean } | null {
  const sorted = sortByDeparture(flights);
  if (sorted.length === 0) return null;
  const lowest = Math.min(...sorted.map(pct));
  const matches = sorted.filter((f) => pct(f) === lowest);
  return { flight: matches[0], tied: matches.length > 1 };
}

/** Flights by part of day, each group by departure; the preferred airline first within a group. */
export function groupByDayPart(flights: SearchFlight[], preferredAirline?: string | null): { part: DayPart; flights: SearchFlight[] }[] {
  const isPref = (f: SearchFlight) => !!preferredAirline && f.airline === preferredAirline;
  const byTime = sortByDeparture(flights);
  return (['Morning', 'Afternoon', 'Evening'] as const)
    .map((part) => {
      const inPart = byTime.filter((f) => dayPart(f.dep_time) === part);
      return { part, flights: [...inPart.filter(isPref), ...inPart.filter((f) => !isPref(f))] };
    })
    .filter((g) => g.flights.length > 0);
}

function utcOffset(tz: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? null;
  } catch {
    return null;
  }
}

/** True when the route crosses time zones, so shown times are local to each end. */
export function crossesTimeZones(origin?: string, dest?: string): boolean {
  const a = origin ? AIRPORT_TZ[origin] : undefined;
  const b = dest ? AIRPORT_TZ[dest] : undefined;
  if (!a || !b || a === b) return false;
  const oa = utcOffset(a);
  const ob = utcOffset(b);
  return oa === null || ob === null ? true : oa !== ob;
}

function times(f: SearchFlight): string {
  return `${formatClock(f.dep_time)} → ${formatClock(f.arr_time)}${f.arr_next_day ? ' (+1 day)' : ''}`;
}

/** The most reliable flight on the route, with a Track button. */
function BestBet({ flight: f, tied, disabled, onPick }: { flight: SearchFlight; tied: boolean; disabled?: boolean; onPick: (f: SearchFlight) => void }) {
  return (
    <Card tone="light" data-testid="best-bet">
      <p className="text-body-md font-semibold text-status-success-text">{tied ? 'Best bet (tied on risk)' : 'Best bet'}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-semibold text-ink">{f.flight}</span>
        <span className="text-body-md text-ink-caption">{f.airline_name}</span>
      </div>
      <p className="mt-1 text-body-md text-ink-caption">{times(f)}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <RiskPill risk={f.risk_level} emphasis="soft" size="small" detail={formatDelayPercent(f.delay_probability)} />
        <Button size="sm" disabled={disabled} onClick={() => onPick(f)} aria-label={`Track ${f.flight}`}>Track</Button>
      </div>
      {f.risk_factors && f.risk_factors.length > 0 && (
        <p className="mt-2 text-body-md text-ink-caption">Why: {topReasons(f.risk_factors)}</p>
      )}
    </Card>
  );
}

/** Route results: a best bet up top, then flights by part of day (first 10, then "Show all"). Tap a row to track it. */
export function RouteResults({
  flights,
  asOf,
  disabled,
  preferredAirline,
  afterArrivalLocal,
  date,
  onPick,
}: {
  flights: SearchFlight[];
  /** Adding a connecting flight: the previous leg's arrival (local). Earlier or more-than-24-hours-later flights are hidden. */
  afterArrivalLocal?: string;
  /** The searched day (YYYY-MM-DD); needed with afterArrivalLocal. */
  date?: string;
  asOf?: string | null;
  disabled?: boolean;
  /** Airline code from the user's profile; its flights are listed first within each group and marked. */
  preferredAirline?: string | null;
  onPick: (flight: SearchFlight) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const all = flights;
  flights = afterArrivalLocal && date ? filterAfterArrival(all, date, afterArrivalLocal) : all;
  const isPreferred = (f: SearchFlight) => !!preferredAirline && f.airline === preferredAirline;
  const groups = groupByDayPart(flights, preferredAirline);
  const total = flights.length;
  const best = pickBestBet(flights);
  const localHint = flights.length > 0 && crossesTimeZones(flights[0].origin, flights[0].dest);

  let remaining = showAll ? Infinity : ROW_CAP;
  const visible = groups
    .map((g) => {
      const rows = g.flights.slice(0, Math.max(remaining, 0));
      remaining -= rows.length;
      return { part: g.part, flights: rows };
    })
    .filter((g) => g.flights.length > 0);

  if (flights.length === 0 && all.length > 0 && afterArrivalLocal) {
    return (
      <EmptyState
        icon={<Plane />}
        title={`No flights leave after your arrival at ${formatClock(afterArrivalLocal.slice(11, 16))}. Try another day.`}
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-3" data-testid="route-results">
      <ScheduleHonesty asOf={asOf} />
      {best && total > 1 && <BestBet flight={best.flight} tied={best.tied} disabled={disabled} onPick={onPick} />}
      <p className="text-body-md text-ink-sub">
        {total} flight{total === 1 ? '' : 's'}. Compare the delay chances, then tap the one you want.
      </p>
      {localHint && <p className="text-body-md text-ink-caption">Times are local to each airport.</p>}
      {visible.map((g) => (
        <section key={g.part} aria-label={g.part} className="space-y-2">
          <h2 className="pt-1 text-body-md font-semibold text-ink-sub">{g.part}</h2>
          {g.flights.map((f) => (
            <button
              key={`${f.flight}-${f.dep_time}`}
              type="button"
              disabled={disabled}
              onClick={() => onPick(f)}
              aria-label={`${f.flight} ${f.origin} to ${f.dest}, ${formatClock(f.dep_time)} to ${formatClock(f.arr_time)}, ${pct(f)}% chance of a 15+ min delay`}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-tile border bg-white p-3 text-left hover:border-surface-divider',
                isPreferred(f) ? 'border-surface-accent' : 'border-surface-stroke',
                disabled && 'opacity-60'
              )}
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink">
                  {f.flight}
                  <span className="ml-2 text-body-md font-normal text-ink-caption">{f.airline_name}</span>
                </span>
                <span className="block text-body-md text-ink-caption">
                  {times(f)}
                  {f.operating_airline !== f.airline ? ` · operated by ${f.operating_airline_name}` : ''}
                </span>
                {isPreferred(f) && <span className="block text-body-md font-medium text-surface-accent">Your airline</span>}
              </span>
              <RiskPill risk={f.risk_level} emphasis="soft" size="small" detail={formatDelayPercent(f.delay_probability)} />
            </button>
          ))}
        </section>
      ))}
      {!showAll && total > ROW_CAP && (
        <Button variant="secondary" fullWidth onClick={() => setShowAll(true)}>
          Show all {total} flights
        </Button>
      )}
    </div>
  );
}
