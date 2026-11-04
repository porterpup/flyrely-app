import { Plane } from 'lucide-react';
import { cn } from '~/lib/utils';

export interface DurationProps {
  /** Figma "Kind": text label in the middle, or a plane icon. */
  kind?: 'text' | 'icon';
  /** Label for kind="text", e.g. "2h 6m". Only pass real, computed durations. */
  label?: string;
  /** Use on the dark ticket (muted white line and label). */
  onDark?: boolean;
  className?: string;
}

/** Dotted line with a duration label or a plane in the middle, ends capped with a dot. */
export function Duration({ kind = 'icon', label, onDark = false, className }: DurationProps) {
  const line = cn('h-0 flex-1 border-t-2 border-dotted', onDark ? 'border-white/30' : 'border-surface-divider');
  const dot = cn('h-1 w-1 shrink-0 rounded-full', 'bg-surface-accent');
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-1', className)} aria-hidden={kind === 'icon' ? true : undefined}>
      <span className={dot} />
      <span className={line} />
      {kind === 'text' ? (
        <span className={cn('shrink-0 text-body-sm', onDark ? 'text-ink-on-dark-muted' : 'text-ink-caption')}>{label}</span>
      ) : (
        <Plane className="h-[18px] w-[18px] shrink-0 rotate-45 text-surface-accent" />
      )}
      <span className={line} />
      <span className={dot} />
    </div>
  );
}
