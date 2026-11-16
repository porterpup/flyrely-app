import { Pill, type PillTone } from '~/components/ui/Pill';
import { getRiskLabel } from '~/lib/utils';
import type { RiskLevel } from '~/types';

export const riskTone: Record<RiskLevel, PillTone> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

/** "Low risk" / "Some risk" / "High risk" pill. Label comes from getRiskLabel. */
export function RiskPill({
  risk,
  detail,
  size = 'default',
  className,
}: {
  risk: RiskLevel;
  /** Optional trailing text, e.g. "33% chance of a 15+ min delay". */
  detail?: string | null;
  size?: 'default' | 'small';
  className?: string;
}) {
  return (
    <Pill tone={riskTone[risk]} size={size} className={className}>
      {getRiskLabel(risk)}
      {detail && (
        <>
          <span aria-hidden className="mx-1">·</span>
          <span className="font-semibold tabular-nums">{detail}</span>
        </>
      )}
    </Pill>
  );
}
