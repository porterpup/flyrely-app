import { Link } from '@tanstack/react-router';
import { getAirportRef } from '~/lib/airportRef';
import { formatLayover, layoverMinutes } from '~/lib/tripGrouping';
import type { Flight } from '~/types';

interface ConnectionRowProps {
  prev: Flight;
  next: Flight;
  /** Reserved for the missed-connection chance (a later release fills these in). Nothing is shown for them yet. */
  missProbability?: number | null;
  minConnectMinutes?: number | null;
}

/** "Connection in Denver · 53 min", between two legs of a trip. */
export function ConnectionRow({ prev, next }: ConnectionRowProps) {
  const hub = prev.destination.code;
  const city = getAirportRef(hub)?.city ?? (prev.destination.city && prev.destination.city !== hub ? prev.destination.city : hub);
  const minutes = layoverMinutes(prev, next);

  return (
    <div className="flex items-center justify-center gap-1 rounded-tile bg-surface-muted px-4 py-2 text-body-md text-ink-caption">
      {minutes === null ? (
        <>
          <span>Connection time unknown ·</span>
          <Link
            to="/flights/$flightId/edit"
            params={{ flightId: prev.id }}
            className="font-semibold text-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
          >
            Add arrival time
          </Link>
        </>
      ) : (
        <span>
          Connection in {city} · {formatLayover(minutes)}
        </span>
      )}
    </div>
  );
}
