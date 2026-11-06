import { ExternalLink } from 'lucide-react';
import { cn } from '~/lib/utils';
import { buttonSizeClasses, buttonVariantClasses, type ButtonSize } from '~/components/ui/Button';
import type { Handoff } from '~/copilot/types';

export interface PartnerButtonProps {
  /** The hand-off to open. `label` is the visible text. */
  handoff: Handoff;
  size?: ButtonSize;
  /** Style for the dark card surface. */
  onDark?: boolean;
  /** Filled (primary) or outlined (secondary). */
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  className?: string;
}

const darkClasses = {
  primary: 'bg-white text-ink hover:bg-white/90 active:bg-white/80',
  secondary: 'border border-white/40 text-white hover:bg-white/10 active:bg-white/20',
};

/** External partner link styled as a button. Opens a new tab; `sponsored` only when the link is an affiliate link. */
export function PartnerButton({
  handoff,
  size = 'sm',
  onDark = false,
  variant = 'secondary',
  fullWidth = false,
  className,
}: PartnerButtonProps) {
  return (
    <a
      href={handoff.url}
      target="_blank"
      rel={handoff.is_affiliate ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
      className={cn(
        'inline-flex items-center justify-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent focus-visible:ring-offset-2',
        onDark ? darkClasses[variant] : buttonVariantClasses[variant],
        buttonSizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {handoff.label}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
