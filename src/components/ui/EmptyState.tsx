import { cn } from '~/lib/utils';

export interface EmptyStateProps {
  /** A lucide icon element; shown in a soft circle. */
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Use on the dark navy screens. */
  onDark?: boolean;
  className?: string;
}

/** Calm "nothing here yet" block: icon, one line, one next step. */
export function EmptyState({ icon, title, description, action, onDark = false, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-16 text-center', className)}>
      <div
        className={cn(
          'mb-5 flex h-16 w-16 items-center justify-center rounded-full [&_svg]:h-7 [&_svg]:w-7',
          onDark ? 'bg-white/10 text-white' : 'bg-surface-muted text-surface-card'
        )}
      >
        {icon}
      </div>
      <h2 className={cn('text-title-md', onDark ? 'text-white' : 'text-ink')}>{title}</h2>
      {description && (
        <p className={cn('mt-2 max-w-xs text-body-lg', onDark ? 'text-ink-on-dark-muted' : 'text-ink-caption')}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
