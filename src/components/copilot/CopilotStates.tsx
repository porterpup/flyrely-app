import { PlaneTakeoff, RefreshCw, TriangleAlert } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui';
import type { Handoff } from '~/copilot/types';
import { PartnerButton } from './PartnerButton';

export interface NoAlternativesProps {
  origin: string;
  destination: string;
  /** Search hand-offs from the API (Google Flights, KAYAK ...). Shown so the user still has a next step. */
  searchHandoffs: Handoff[];
  onDark?: boolean;
  className?: string;
}

/** Empty state: no other flights found on the route today. */
export function NoAlternatives({ origin, destination, searchHandoffs, onDark = true, className }: NoAlternativesProps) {
  return (
    <div className={cn('space-y-3 text-center', className)}>
      <PlaneTakeoff className="mx-auto h-8 w-8 opacity-80" aria-hidden />
      <div>
        <p className="text-body-lg font-medium">No other flights found today</p>
        <p className={cn('text-body-md', onDark ? 'text-white/80' : 'text-ink-caption')}>
          We don&apos;t have other typical flights on {origin} to {destination} today. Search for options, or ask your
          airline.
        </p>
      </div>
      {searchHandoffs.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {searchHandoffs.map((h) => (
            <PartnerButton key={h.partner} handoff={h} onDark={onDark} />
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
  onDark?: boolean;
  className?: string;
}

/** Error state when the options request fails. The flight itself is unaffected. */
export function CopilotError({ title, description, onRetry, onDark = true, className }: CopilotErrorProps) {
  return (
    <div role="alert" className={cn('space-y-3 text-center', className)}>
      <TriangleAlert className="mx-auto h-8 w-8 opacity-80" aria-hidden />
      <div>
        <p className="text-body-lg font-medium">{title ?? "We couldn't load your options"}</p>
        <p className={cn('text-body-md', onDark ? 'text-white/80' : 'text-ink-caption')}>
          {description ?? 'Your flight details are fine. Check your connection and try again, or contact your airline directly.'}
        </p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          icon={<RefreshCw className="h-4 w-4" aria-hidden />}
          className={onDark ? '!border-white/40 !text-white hover:!bg-white/10' : undefined}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
