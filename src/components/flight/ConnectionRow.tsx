import { Link } from '@tanstack/react-router';
import { getAirportRef } from '~/lib/airportRef';
import { assessConnection } from '~/lib/mct';
import { formatLayover, layoverMinutes } from '~/lib/tripGrouping';
import type { Flight } from '~/types';

interface ConnectionRowProps {
  prev: Flight;
  next: Flight;
  /** Reserved for the missed-connection chance (a later release fills these in). Nothing is shown for them yet. */
  missProbability?: number | null;
  minConnectMinutes?: number | null;
}

/**
 * "Connection in Denver · 53 min", between two legs of a trip. Adds a plain, time-based note when the layover is under
 * the minimum connection time or close to it. No prediction and no percentage.
 */
export function ConnectionRow({ prev, next }: ConnectionRowProps) {
  const hub = prev.destination.code;
  const city = getAirportRef(hub)?.city ?? (prev.destination.city && prev.destination.city !== hub ? prev.destination.city : hub);
  const minutes = layoverMinutes(prev, next);
  const a = assessConnection(minutes, hub, city, prev.airline?.code, next.airline?.code);
  const tight = a.level === 'tight';

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-tile px-4 py-2 text-center text-body-md ${
        tight ? 'bg-warn-bg text-warn-text' : 'bg-surface-muted text-ink-caption'
      }`}
    >
      {minutes === null ? (
        <div className="flex items-center justify-center gap-1">
          <span>Connection time unknown ·</span>
          <Link
            to="/flights/$flightId/edit"
            params={{ flightId: prev.id }}
            className="font-semibold text-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
          >
            Add arrival time
          </Link>
        </div>
      ) : (
        <>
          <span>
            Connection in {city} · {formatLayover(minutes)}
          </span>
          {a.message && <span className={tight ? 'font-semibold' : undefined}>{a.message}</span>}
        </>
      )}
      {a.separateNote && <span>{a.separateNote}</span>}
    </div>
  );
}
