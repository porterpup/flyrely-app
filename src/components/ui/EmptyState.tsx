import { cn } from '~/lib/utils';

export interface EmptyStateProps {
  /** A lucide icon element; shown in a soft circle. */
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Calm "nothing here yet" block: icon, one line, one next step. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-16 text-center', className)}>
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-surface-accent [&_svg]:h-7 [&_svg]:w-7"
      >
        {icon}
      </div>
      <h2 className={'text-title-md text-ink'}>{title}</h2>
      {description && (
        <p className="mt-2 max-w-xs text-body-lg text-ink-caption">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
