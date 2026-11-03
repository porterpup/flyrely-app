import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn, getRiskLabel } from '~/lib/utils';
import { alertSolidClasses, type AlertStatus } from '~/components/ui/Alert';
import type { RiskLevel } from '~/types';
import { riskTone } from './RiskPill';

export interface PredictionPanelProps {
  risk: RiskLevel;
  /** Whole-number percent chance of a 15+ min delay. Omit when the model gave no probability. */
  chancePercent?: number | null;
  /** Explanation line (risk factors or generic copy). */
  reason: string;
  /** Extra content under the reason: severity bar, warnings. */
  children?: React.ReactNode;
  className?: string;
}

/** Figma "FlyRely prediction" panel: solid risk colour, risk level on the left, chance on the right. */
export function PredictionPanel({ risk, chancePercent, reason, children, className }: PredictionPanelProps) {
  const Icon = risk === 'low' ? CheckCircle : AlertTriangle;
  return (
    <div className={cn('rounded-panel p-5', alertSolidClasses[riskTone[risk] as AlertStatus], className)}>
      <div className="mb-4 flex items-center gap-2 text-body-sm">
        <Icon className="h-5 w-5" aria-hidden />
        FlyRely prediction
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-title-md">{getRiskLabel(risk)}</p>
          <p className="mt-1 text-body-sm opacity-80">Based on historical data</p>
        </div>
        {typeof chancePercent === 'number' && (
          <div className="text-right">
            <p className="text-title-md">{chancePercent}%</p>
            <p className="mt-1 text-body-sm opacity-80">chance of a 15+ min delay</p>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-start gap-2 text-body-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{reason}</p>
      </div>
      {children}
    </div>
  );
}
