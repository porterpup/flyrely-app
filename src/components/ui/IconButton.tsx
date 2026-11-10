import { cn } from '~/lib/utils';
import type { ButtonVariant } from './Button';

type IconButtonKind = Exclude<ButtonVariant, 'danger'>;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  'aria-label': string;
  /** Figma "Kind": primary (filled circle), secondary (outlined circle), text (bare). */
  kind?: IconButtonKind;
  /** Figma "Size": default 44px, sm 36px. */
  size?: 'default' | 'sm';
}

const kindClasses: Record<IconButtonKind, string> = {
  primary: 'bg-surface-card text-white hover:bg-surface-panel',
  secondary: 'border border-surface-icon text-ink hover:bg-surface-muted',
  text: 'text-ink hover:bg-surface-muted',
};

export function IconButton({
  kind = 'text',
  size = 'default',
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition duration-150 motion-safe:active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'default' ? 'h-11 w-11' : 'h-9 w-9',
        kindClasses[kind],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
