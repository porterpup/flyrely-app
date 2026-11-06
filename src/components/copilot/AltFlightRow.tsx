import { cn } from '~/lib/utils';
import { Pill } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import type { AlternativeItem } from '~/copilot/types';
import { PartnerButton } from './PartnerButton';
import { formatChance, formatLocalTime } from './format';

export interface AltFlightRowProps {
  item: AlternativeItem;
  onDark?: boolean;
  className?: string;
}

/** One alternative flight: airline, times, risk level plus chance, and a "Check seats" hand-off. */
export function AltFlightRow({ item, onDark = true, className }: AltFlightRowProps) {
  const operatedBy = item.operating_airline !== item.marketing_airline;
  const handoff = item.handoffs[0];
  return (
    <div
      className={cn(
        'rounded-btn p-inset',
        onDark ? 'bg-white/10 text-white' : 'bg-surface-muted text-ink',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-lg font-medium">
            {formatLocalTime(item.dep_local)} <span aria-label="to">→</span> {formatLocalTime(item.arr_local)}
          </p>
          <p className={cn('mt-0.5 text-body-sm', onDark ? 'text-white/80' : 'text-ink-caption')}>
            {item.marketing_airline} {item.flight_number} · {item.origin} to {item.destination}
            {operatedBy && ` · Operated by ${item.operating_airline_name}`}
          </p>
        </div>
        {item.risk_level ? (
          <RiskPill
            risk={item.risk_level}
            size="small"
            emphasis={onDark ? 'solid' : 'soft'}
            className="shrink-0"
          />
        ) : (
          <Pill size="small" emphasis={onDark ? 'solid' : 'soft'} className="shrink-0">
            Risk unavailable
          </Pill>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={cn('text-body-sm', onDark ? 'text-white/80' : 'text-ink-caption')}>
          {item.delay_probability !== null ? formatChance(item.delay_probability) : 'No delay estimate for this flight'}
        </p>
        {handoff && <PartnerButton handoff={handoff} onDark={onDark} className="shrink-0" />}
      </div>
    </div>
  );
}
