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
  emphasis = 'solid',
  size = 'default',
  className,
}: {
  risk: RiskLevel;
  /** Optional trailing text, e.g. "33% chance of a 15+ min delay". */
  detail?: string | null;
  /** solid for dark surfaces (the ticket), soft for white surfaces. */
  emphasis?: 'soft' | 'solid';
  size?: 'default' | 'small';
  className?: string;
}) {
  return (
    <Pill tone={riskTone[risk]} emphasis={emphasis} size={size} className={className}>
      {getRiskLabel(risk)}
      {detail && (
        <>
          <span aria-hidden className="mx-1">·</span>
          <span className="font-semibold">{detail}</span>
        </>
      )}
    </Pill>
  );
}
