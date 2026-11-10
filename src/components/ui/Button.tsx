import { cn } from '~/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';
export type ButtonSize = 'default' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Figma "Kind": primary (filled), secondary (outlined), text (no chrome). `danger` is app-only. */
  variant?: ButtonVariant;
  /** Figma "Size": default (52px tall) or sm (40px tall). */
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-surface-card text-white hover:bg-surface-panel active:bg-ink-sub',
  secondary: 'border border-surface-icon text-ink hover:bg-surface-muted active:bg-surface-stroke',
  text: 'text-ink hover:bg-surface-muted active:bg-surface-stroke',
  danger: 'bg-status-error-solid text-white hover:opacity-90 active:opacity-80',
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  default: 'gap-1.5 px-4 py-3.5 rounded-btn text-action-lg',
  sm: 'gap-1 px-3.5 py-3 rounded-btn-sm text-action-md',
};

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center transition duration-150 motion-safe:active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
}
