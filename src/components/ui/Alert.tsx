import { ThumbsUp, XCircle, Info, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';

/** Only `error` is red. Success and info are neutral navy: green, amber and red otherwise mean delay risk. */
export type AlertStatus = 'success' | 'error' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: AlertStatus;
  /** Primary line (Figma "Line one"). Accepts nodes so part of it can be bold. */
  lineOne: React.ReactNode;
  /** Secondary supporting line. */
  lineTwo?: React.ReactNode;
  showIcon?: boolean;
  /** Trailing chevron, for alerts that link somewhere. */
  showRightIcon?: boolean;
  /** Trailing control, e.g. an Undo button. */
  action?: React.ReactNode;
}

const icons = {
  success: ThumbsUp,
  error: XCircle,
  info: Info,
} as const;

const neutral = 'border border-surface-stroke bg-surface-panel text-ink';

const statusClasses: Record<AlertStatus, string> = {
  success: neutral,
  info: neutral,
  error: 'border border-status-error-text/40 bg-status-error-bg text-status-error-text',
};

export function Alert({
  status = 'info',
  lineOne,
  lineTwo,
  showIcon = true,
  showRightIcon = false,
  action,
  className,
  ...props
}: AlertProps) {
  const Icon = icons[status];
  return (
    <div
      role={status === 'error' ? 'alert' : undefined}
      className={cn('flex items-center gap-3 rounded-alert p-inset', statusClasses[status], className)}
      {...props}
    >
      {showIcon && <Icon className={cn('h-6 w-6 shrink-0', status !== 'error' && 'text-surface-accent')} aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-body-md">{lineOne}</p>
        {lineTwo && <p className="mt-0.5 text-body-sm">{lineTwo}</p>}
      </div>
      {action}
      {showRightIcon && <ChevronRight className="h-6 w-6 shrink-0 opacity-60" aria-hidden />}
    </div>
  );
}
