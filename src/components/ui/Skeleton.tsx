import { cn } from '~/lib/utils';

/** Placeholder block while content loads. Pulses unless the user prefers reduced motion. */
export function Skeleton({ onDark = false, className, ...props }: { onDark?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('rounded-lg motion-safe:animate-pulse', onDark ? 'bg-white/10' : 'bg-surface-stroke', className)}
      {...props}
    />
  );
}
