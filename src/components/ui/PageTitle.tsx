import { cn } from '~/lib/utils';

/** Top-of-screen title for the main tabs: consistent gutter, size and spacing. */
export function PageTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 pb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-heading-sm text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-body-md text-ink-caption">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  );
}
