import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn, getRiskLabel, formatCheckedAgo } from '~/lib/utils';
import type { RiskLevel } from '~/types';

export interface PredictionPanelProps {
  risk: RiskLevel;
  /** Whole-number percent chance of a 15+ min delay. Omit when the model gave no probability. */
  chancePercent?: number | null;
  /** Fallback explanation line when there are no specific reasons. */
  reason: string;
  /** Top reasons from the model's risk factors; shown as "Why: ...". */
  why?: string | null;
  /** Extra content under the reason: severity bar, warnings. */
  children?: React.ReactNode;
  /** When the prediction was last computed (epoch ms). Shows "Checked 12 min ago". */
  checkedAt?: number;
  /** Shows a text "Refresh" button next to the checked time. */
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

const panelClasses: Record<RiskLevel, string> = {
  low: 'bg-white text-ink',
  // 4 px band in the warning fill; the border follows the panel's rounded top corners.
  medium: 'border-t-4 border-status-warning-solid bg-white text-ink',
  high: 'bg-status-error-solid text-white',
};

const iconClasses: Record<RiskLevel, string> = {
  low: 'text-status-success-text',
  medium: 'text-status-warning-text',
  high: '',
};

/** Figma "FlyRely prediction" panel. Calm when risk is low, a warning band when medium, solid fill only when high. */
export function PredictionPanel({ risk, chancePercent, reason, why, children, checkedAt, onRefresh, refreshing, className }: PredictionPanelProps) {
  const Icon = risk === 'low' ? CheckCircle : AlertTriangle;
  const labelClass = risk === 'medium' ? 'text-status-warning-text' : risk === 'low' ? 'text-status-success-text' : '';
  return (
    <div className={cn('rounded-panel p-5', panelClasses[risk], className)}>
      <div className="mb-4 flex items-center gap-2 text-body-sm">
        <Icon className={cn('h-5 w-5', iconClasses[risk])} aria-hidden />
        FlyRely prediction
      </div>
      {typeof chancePercent === 'number' ? (
        <div>
          <p className={cn('text-title-md', labelClass)}>{getRiskLabel(risk)}</p>
          <p className="mt-2 text-hero tabular-nums" aria-label={`${chancePercent} percent chance of a 15 plus minute delay`}>
            {chancePercent}
            <span className="ml-0.5 text-heading-md align-top">%</span>
          </p>
          <p className="mt-2 text-body-sm">chance of a 15+ min delay · based on historical data</p>
          {risk === 'low' && (
            <p className="mt-1 text-body-sm">
              Looks good. {100 - chancePercent}% of flights like this leave within 15 minutes of schedule.
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className={cn('text-heading-sm', labelClass)}>{getRiskLabel(risk)}</p>
          <p className="mt-1 text-body-sm">Based on historical data</p>
        </div>
      )}
      {(checkedAt || onRefresh) && (
        <p className="mt-1 flex flex-wrap items-center text-body-sm">
          {checkedAt ? <span>Checked {formatCheckedAgo(checkedAt, Date.now())}</span> : null}
          {checkedAt && onRefresh ? <span aria-hidden className="mx-1">·</span> : null}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-busy={refreshing || undefined}
              className="inline-flex min-h-[44px] items-center rounded underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:opacity-70"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </p>
      )}
      <div className="mt-5 flex items-start gap-2 text-body-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{why ? `Why: ${why}` : reason}</p>
      </div>
      {children}
    </div>
  );
}
