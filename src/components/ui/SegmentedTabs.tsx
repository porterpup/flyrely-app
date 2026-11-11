import { cn } from '~/lib/utils';

export interface SegmentedTabsProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  className?: string;
}

/** Pill-shaped segmented control (Flight number | Route | Recent in the Add Flight screen). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('flex rounded-pill bg-surface-stroke p-1', className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-11 flex-1 rounded-pill py-2 text-body-md transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent',
            value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink-caption'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
