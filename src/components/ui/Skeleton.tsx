import { cn } from '~/lib/utils';

/** Placeholder block while content loads. Pulses unless the user prefers reduced motion. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('rounded-lg motion-safe:animate-pulse', 'bg-white/10', className)}
      {...props}
    />
  );
}
