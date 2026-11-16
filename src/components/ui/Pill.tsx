import { cn } from '~/lib/utils';

export type PillTone = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Figma "Property 1". */
  tone?: PillTone;
  /** Figma "Size": default (26px) or small (22px). */
  size?: 'default' | 'small';
}

const tones: Record<PillTone, string> = {
  default: 'bg-surface-muted text-ink-caption',
  // Rule 1: a solid fill means high risk only, so low and medium are outlined.
  success: 'border border-status-success-text text-status-success-text',
  warning: 'border border-status-warning-text text-status-warning-text',
  error: 'bg-status-error-solid text-white',
  info: 'bg-status-info-solid text-white',
};

export function Pill({
  tone = 'default',
  size = 'default',
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-pill text-body-sm',
        size === 'default' ? 'px-2.5 py-1' : 'px-2 py-0.5',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
