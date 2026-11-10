import { ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';

/** A card that groups ListRows with hairline dividers (settings-style list). */
export function ListGroup({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className="mb-2 px-1 text-body-md font-medium text-ink-caption">{title}</h2>}
      <div className="divide-y divide-surface-stroke overflow-hidden rounded-panel border border-surface-stroke bg-white">
        {children}
      </div>
    </section>
  );
}

export interface ListRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Right-hand content (a pill, a value). */
  trailing?: React.ReactNode;
  /** Show a chevron to signal the row opens something. */
  chevron?: boolean;
}

/** One tappable row: icon, title, optional caption, trailing value or chevron. */
export function ListRow({ icon, title, subtitle, trailing, chevron = false, className, type = 'button', ...props }: ListRowProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150',
        'hover:bg-surface-muted active:bg-surface-stroke',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-surface-accent',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-ink-caption [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-lg text-ink">{title}</span>
        {subtitle && <span className="mt-0.5 block text-body-sm text-ink-caption">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-body-md text-ink-caption">{trailing}</span>}
      {chevron && <ChevronRight className="h-5 w-5 shrink-0 text-ink-caption" aria-hidden />}
    </button>
  );
}
