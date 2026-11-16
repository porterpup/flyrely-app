import { cn } from '~/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** dark = navy panel for use on a dark screen, light = bordered navy card, muted = grey tile. */
  tone?: 'dark' | 'light' | 'muted';
  padded?: boolean;
}

export function Card({ tone = 'light', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-panel',
        tone === 'dark' && 'bg-surface-panel text-ink',
        tone === 'light' && 'border border-surface-stroke bg-surface-card text-ink',
        tone === 'muted' && 'bg-surface-muted text-ink',
        padded && 'p-5',
        className
      )}
      {...props}
    />
  );
}
