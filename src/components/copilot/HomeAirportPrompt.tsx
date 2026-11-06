import { Home } from 'lucide-react';
import { cn } from '~/lib/utils';

export interface HomeAirportPromptProps {
  /** IATA code, or null when the user hasn't set one. */
  homeAirport: string | null;
  /** Opens the picker (the modal arrives in S-P4). Used for both "Set" and "change". */
  onChange: () => void;
  onDark?: boolean;
  className?: string;
}

/** Inline prompt: asks for a home airport when unset, or shows it with a "change" link when set. */
export function HomeAirportPrompt({ homeAirport, onChange, onDark = true, className }: HomeAirportPromptProps) {
  const link = cn(
    'font-medium underline underline-offset-2 rounded-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent',
    onDark ? 'text-white' : 'text-surface-accent'
  );
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-btn p-inset',
        onDark ? 'bg-white/10 text-white' : 'bg-surface-muted text-ink',
        className
      )}
    >
      <Home className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      {homeAirport ? (
        <p className="text-body-md">
          Home airport: <strong className="font-semibold">{homeAirport}</strong> ·{' '}
          <button type="button" onClick={onChange} className={link}>
            change
          </button>
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-body-md font-medium">What&apos;s your home airport?</p>
          <p className={cn('text-body-sm', onDark ? 'text-white/80' : 'text-ink-caption')}>
            We use it to tell if you&apos;re away from home. It stays on this device.
          </p>
          <button type="button" onClick={onChange} className={cn(link, 'text-body-md')}>
            Set home airport
          </button>
        </div>
      )}
    </div>
  );
}
