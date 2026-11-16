import { Plane } from 'lucide-react';
import { cn } from '~/lib/utils';

export interface DurationProps {
  /** Figma "Kind": text label in the middle, or a plane icon. */
  kind?: 'text' | 'icon';
  /** Label for kind="text", e.g. "2h 6m". Only pass real, computed durations. */
  label?: string;
  className?: string;
}

/** Dotted line with a duration label or a plane in the middle, ends capped with a dot. */
export function Duration({ kind = 'icon', label, className }: DurationProps) {
  const line = 'h-0 flex-1 border-t-2 border-dotted border-white/30';
  const dot = 'h-1 w-1 shrink-0 rounded-full bg-surface-accent';
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-1', className)} aria-hidden={kind === 'icon' ? true : undefined}>
      <span className={dot} />
      <span className={line} />
      {kind === 'text' ? (
        <span className={'shrink-0 text-body-sm text-ink-caption'}>{label}</span>
      ) : (
        <Plane className="h-[18px] w-[18px] shrink-0 rotate-45 text-surface-accent" />
      )}
      <span className={line} />
      <span className={dot} />
    </div>
  );
}
