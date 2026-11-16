import { cn } from '~/lib/utils';
import { Pill } from '~/components/ui';
import { RiskPill } from '~/components/flight';
import type { AlternativeItem } from '~/copilot/types';
import { PartnerButton } from './PartnerButton';
import { formatChance, formatLocalTime } from './format';

export interface AltFlightRowProps {
  item: AlternativeItem;
  className?: string;
}

/** One alternative flight: airline, times, risk level plus chance, and a "Check seats" hand-off. */
export function AltFlightRow({ item, className }: AltFlightRowProps) {
  const operatedBy = !!item.operating_airline && item.operating_airline !== item.marketing_airline;
  const handoff = item.handoffs[0];
  return (
    <div
      className={cn(
        'rounded-btn p-inset',
        'bg-surface-card text-ink',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-lg font-medium">
            {formatLocalTime(item.dep_local)}
            {item.arr_local && (
              <>
                {' '}
                <span aria-label="to">→</span> {formatLocalTime(item.arr_local)}
              </>
            )}
          </p>
          <p className={cn('mt-0.5 text-body-sm', 'text-ink-caption')}>
            {item.marketing_airline} {item.flight_number} · {item.origin} to {item.destination}
            {operatedBy && ` · Operated by ${item.operating_airline_name ?? item.operating_airline}`}
          </p>
        </div>
        {item.risk_level ? (
          <RiskPill
            risk={item.risk_level}
            size="small"
            className="shrink-0"
          />
        ) : (
          <Pill size="small" className="shrink-0">
            Risk unavailable
          </Pill>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={cn('text-body-sm', 'text-ink-caption')}>
          {item.delay_probability !== null ? formatChance(item.delay_probability) : 'No delay estimate for this flight'}
        </p>
        {handoff && <PartnerButton handoff={handoff} className="shrink-0" />}
      </div>
    </div>
  );
}
