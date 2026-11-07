import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Card, Pill } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import type { CopilotState } from '~/copilot/types';
import type { RiskLevel } from '~/types';

export interface DisruptionCardProps {
  state: CopilotState;
  /** Only used by "at_risk": the cancelled and rebooked cards are always open. */
  expanded?: boolean;
  onToggle?: () => void;
  /** Risk level from the existing prediction (at_risk header). */
  risk?: RiskLevel;
  /** Whole-number percent chance of a 15+ min delay. Never minutes. */
  chancePercent?: number | null;
  /** Expanded content. */
  children?: React.ReactNode;
  /** Action buttons under the content ("I've been rebooked", "Not cancelled after all"). */
  actions?: React.ReactNode;
  className?: string;
}

const header: Record<CopilotState, { title: string; subtitle: string }> = {
  at_risk: { title: 'Plan B', subtitle: "If this flight is cancelled, here's what to do." },
  cancelled: { title: 'Your flight was cancelled', subtitle: "Here's what to do next." },
  rebooked: { title: "You've been rebooked", subtitle: 'Next steps for your new plan.' },
};

/** Shell for the disruption copilot. Sits on the dark flight-details surface. */
export function DisruptionCard({
  state,
  expanded = false,
  onToggle,
  risk,
  chancePercent,
  children,
  actions,
  className,
}: DisruptionCardProps) {
  const bodyId = useId();
  const collapsible = state === 'at_risk';
  const open = collapsible ? expanded : true;
  const { title, subtitle } = header[state];

  const pill =
    state === 'at_risk' && risk ? (
      <RiskPill
        risk={risk}
        size="small"
        detail={typeof chancePercent === 'number' ? `${chancePercent}% chance of a 15+ min delay` : null}
      />
    ) : state === 'cancelled' ? (
      <Pill tone="error" emphasis="solid" size="small">
        Cancelled
      </Pill>
    ) : state === 'rebooked' ? (
      <Pill tone="success" emphasis="solid" size="small">
        Rebooked
      </Pill>
    ) : null;

  const headerInner = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-title-md text-white">{title}</p>
        <p className="mt-0.5 text-body-md text-white/80">{subtitle}</p>
        {pill && <div className="mt-2">{pill}</div>}
      </div>
      {collapsible && (
        <ChevronDown
          className={cn('mt-1 h-6 w-6 shrink-0 text-white transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      )}
    </>
  );

  return (
    <Card tone="dark" className={cn('space-y-5', className)}>
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="-m-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-btn p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {headerInner}
        </button>
      ) : (
        <div className="flex items-start gap-3">{headerInner}</div>
      )}
      {open && (
        <div id={bodyId} className="space-y-5">
          {children}
          {actions && <div className="flex flex-col gap-2">{actions}</div>}
        </div>
      )}
    </Card>
  );
}
