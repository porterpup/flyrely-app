import { Duration } from '~/components/ui/Duration';
import { Divider } from '~/components/ui/Divider';
import { cn } from '~/lib/utils';

export interface TicketEnd {
  /** Small caption above the time, e.g. "Scheduled departure". Ignored if originalTime is set. */
  label?: string;
  /** Previous time, rendered struck through (Figma shows the original above the new time). */
  originalTime?: string;
  /** Large line: a time ("5:52 PM") or an airport code. */
  primary: string;
  date?: string;
  place?: string;
}

export interface TicketProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as a button when the whole ticket is tappable. */
  as?: 'div' | 'button';
  /** Optional heading above the flight number row, e.g. "Your trip to Jacksonville, FL". */
  title?: string;
  /** Small line above the title, e.g. a departure countdown ("Leaves in 42 min"). */
  eyebrow?: string;
  flightNumber: string;
  /** Top right slot, usually a RiskPill. */
  badge?: React.ReactNode;
  departure: TicketEnd;
  arrival: TicketEnd;
  /** Replaces the default plane Duration between the two ends. */
  middle?: React.ReactNode;
  /** Centered caption under the times, e.g. "Operated by United Airlines". */
  footer?: string;
  /** Extra classes for the footer line (e.g. hide it on very narrow screens). */
  footerClassName?: string;
  /** Rendered under a divider, normally an Alert. */
  children?: React.ReactNode;
}

function End({ end, align }: { end: TicketEnd; align: 'left' | 'right' }) {
  return (
    <div className={cn('flex w-[104px] max-[359px]:w-24 min-w-0 shrink flex-col', align === 'right' && 'items-end text-right')}>
      {end.originalTime ? (
        <p className="text-body-sm text-ink-on-dark-muted line-through">{end.originalTime}</p>
      ) : (
        <p className="text-body-sm text-ink-on-dark-muted">{end.label ?? ' '}</p>
      )}
      <p className="text-title-lg tabular-nums text-white">{end.primary}</p>
      <p className="text-body-sm text-ink-on-dark-muted">{end.date ?? ' '}</p>
      {end.place && <p className="text-body-sm text-ink-on-dark-muted">{end.place}</p>}
    </div>
  );
}

/** Figma "Ticket": navy card with flight number, status badge, times and an optional alert. */
export function Ticket({
  as: Tag = 'div',
  title,
  eyebrow,
  flightNumber,
  badge,
  departure,
  arrival,
  middle,
  footer,
  footerClassName,
  children,
  className,
  ...props
}: TicketProps) {
  return (
    <Tag
      className={cn('flex w-full flex-col gap-4 rounded-ticket bg-surface-card p-4 text-left text-white', className)}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {eyebrow && <p className="-mb-2 text-body-sm text-ink-on-dark-muted">{eyebrow}</p>}
      {title && <p className="text-title-sm text-white">{title}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-title-md tabular-nums">{flightNumber}</span>
        {badge}
      </div>
      <div className="flex items-start gap-2.5">
        <End end={departure} align="left" />
        <div className="flex min-w-0 flex-1 pt-[27px]">{middle ?? <Duration onDark />}</div>
        <End end={arrival} align="right" />
      </div>
      {footer && <p className={cn('text-center text-body-sm text-ink-on-dark-muted', footerClassName)}>{footer}</p>}
      {children && (
        <>
          <Divider tone="dark" dashed />
          {children}
        </>
      )}
    </Tag>
  );
}
