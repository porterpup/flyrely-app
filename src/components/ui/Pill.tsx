import { cn } from '~/lib/utils';

export type PillTone = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Property 1". */
  tone?: PillTone;
  /** Figma "Size": default (26px) or small (22px). */
  size?: 'default' | 'small';
  /** soft = tinted background (Figma default). solid = high-emphasis fill for dark surfaces. */
  emphasis?: 'soft' | 'solid';
}

const soft: Record<PillTone, string> = {
  default: 'bg-surface-muted text-ink-caption',
  success: 'bg-status-success-bg text-status-success-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
  error: 'bg-status-error-bg text-status-error-text',
  info: 'bg-status-info-bg text-status-info-text',
};

const solid: Record<PillTone, string> = {
  default: 'bg-white/15 text-white',
  success: 'bg-status-success-solid text-white',
  warning: 'bg-status-warning-solid text-ink',
  error: 'bg-status-error-solid text-white',
  info: 'bg-status-info-solid text-white',
};

export function Pill({
  tone = 'default',
  size = 'default',
  emphasis = 'soft',
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-pill text-body-sm',
        size === 'default' ? 'px-2.5 py-1' : 'px-2 py-0.5',
        emphasis === 'soft' ? soft[tone] : solid[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
