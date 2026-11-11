import { ThumbsUp, AlertTriangle, XCircle, Info, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';

export type AlertStatus = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: AlertStatus;
  /** Primary line (Figma "Line one"). Accepts nodes so part of it can be bold. */
  lineOne: React.ReactNode;
  /** Secondary supporting line. */
  lineTwo?: React.ReactNode;
  showIcon?: boolean;
  /** Trailing chevron, for alerts that link somewhere. */
  showRightIcon?: boolean;
  /** Solid high-emphasis fill, used on the dark ticket (warning is the #FFB400 yellow). */
  solid?: boolean;
  /** Trailing control, e.g. an Undo button. */
  action?: React.ReactNode;
}

const icons = {
  success: ThumbsUp,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
} as const;

const softClasses: Record<AlertStatus, string> = {
  success: 'bg-status-success-bg text-status-success-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
  error: 'bg-status-error-bg text-status-error-text',
  info: 'bg-status-info-bg text-status-info-text',
};

export const alertSolidClasses: Record<AlertStatus, string> = {
  success: 'bg-status-success-solid text-white',
  warning: 'bg-status-warning-solid text-ink',
  error: 'bg-status-error-solid text-white',
  info: 'bg-status-info-solid text-white',
};

export function Alert({
  status = 'success',
  lineOne,
  lineTwo,
  showIcon = true,
  showRightIcon = false,
  solid = false,
  action,
  className,
  ...props
}: AlertProps) {
  const Icon = icons[status];
  return (
    <div
      role={status === 'error' ? 'alert' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-alert p-inset',
        solid ? alertSolidClasses[status] : softClasses[status],
        className
      )}
      {...props}
    >
      {showIcon && <Icon className="h-6 w-6 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-body-md">{lineOne}</p>
        {lineTwo && <p className="mt-0.5 text-body-sm">{lineTwo}</p>}
      </div>
      {action}
      {showRightIcon && <ChevronRight className="h-6 w-6 shrink-0 opacity-60" aria-hidden />}
    </div>
  );
}
