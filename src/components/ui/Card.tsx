import { cn } from '~/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** default = bordered navy card, raised = lighter panel that sits on a card, muted = quiet tile. */
  tone?: 'default' | 'raised' | 'muted';
  padded?: boolean;
}

export function Card({ tone = 'default', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-panel',
        tone === 'raised' && 'bg-surface-panel text-ink',
        tone === 'default' && 'border border-surface-stroke bg-surface-card text-ink',
        tone === 'muted' && 'bg-surface-muted text-ink',
        padded && 'p-5',
        className
      )}
      {...props}
    />
  );
}
