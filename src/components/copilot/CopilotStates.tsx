import { PlaneTakeoff, RefreshCw, TriangleAlert } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui';
import type { Handoff } from '~/copilot/types';
import { PartnerButton } from './PartnerButton';

export interface NoAlternativesProps {
  origin: string;
  destination: string;
  /** "today", "tomorrow" or "on Sat, Nov 15". Default "today". */
  when?: string;
  /** Search hand-offs from the API (Google Flights, KAYAK ...). Shown so the user still has a next step. */
  searchHandoffs: Handoff[];
  className?: string;
}

/** Empty state: no other flights found on the route today. */
export function NoAlternatives({ origin, destination, when = 'today', searchHandoffs, className }: NoAlternativesProps) {
  return (
    <div className={cn('space-y-3 text-center', className)}>
      <PlaneTakeoff className="mx-auto h-8 w-8 opacity-80" aria-hidden />
      <div>
        <p className="text-body-lg font-medium">No other flights found {when}</p>
        <p className={cn('text-body-md', 'text-ink-caption')}>
          We don&apos;t have other typical flights on {origin} to {destination} {when}. Search for options, or ask your
          airline.
        </p>
      </div>
      {searchHandoffs.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {searchHandoffs.map((h) => (
            <PartnerButton key={h.partner} handoff={h} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface CopilotErrorProps {
  /** Override the default heading and text (e.g. a route the copilot does not cover). */
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Error state when the options request fails. The flight itself is unaffected. */
export function CopilotError({ title, description, onRetry, className }: CopilotErrorProps) {
  return (
    <div role="alert" className={cn('space-y-3 text-center', className)}>
      <TriangleAlert className="mx-auto h-8 w-8 opacity-80" aria-hidden />
      <div>
        <p className="text-body-lg font-medium">{title ?? "We couldn't load your options"}</p>
        <p className={cn('text-body-md', 'text-ink-caption')}>
          {description ?? 'Your flight details are fine. Check your connection and try again, or contact your airline directly.'}
        </p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          icon={<RefreshCw className="h-4 w-4" aria-hidden />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
