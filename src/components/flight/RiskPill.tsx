import { cn, getRiskLabel } from '~/lib/utils';
import type { RiskLevel } from '~/types';

/** Amber "At risk", red "High risk" or green "On track" pill. Label comes from getRiskLabel. */
export function RiskPill({
  risk,
  detail,
  className,
}: {
  risk: RiskLevel;
  /** Optional trailing text, e.g. "33% chance of a 15+ min delay". */
  detail?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        risk === 'low' && 'bg-ok text-white',
        risk === 'medium' && 'bg-warn text-warn-ink',
        risk === 'high' && 'bg-red-500 text-white',
        className
      )}
    >
      {getRiskLabel(risk)}
      {detail && (
        <>
          <span aria-hidden>·</span>
          <span className="font-semibold">{detail}</span>
        </>
      )}
    </span>
  );
}
