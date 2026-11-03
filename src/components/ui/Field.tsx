import { cn } from '~/lib/utils';

export interface FieldBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon cell on the left, separated by a hairline (Figma "Leading Icon"). */
  leading?: React.ReactNode;
  /** Icon cell on the right, separated by a hairline (Figma "Trailing Icon"). */
  trailing?: React.ReactNode;
  invalid?: boolean;
  /** Set false for link-like fields that should not show focus styling. */
  interactive?: boolean;
}

/** The bordered 14px-radius field container from the Figma Input component. */
export function FieldBox({
  leading,
  trailing,
  invalid,
  interactive = true,
  className,
  children,
  ...props
}: FieldBoxProps) {
  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-field border-[0.5px] bg-white text-ink-caption transition-colors',
        invalid ? 'border-status-error-text' : 'border-surface-divider',
        interactive && 'focus-within:border-surface-accent focus-within:ring-2 focus-within:ring-surface-accent/20',
        className
      )}
      {...props}
    >
      {leading && (
        <span className="flex shrink-0 items-center justify-center border-r-[0.5px] border-surface-divider p-4 [&_svg]:h-5 [&_svg]:w-5">
          {leading}
        </span>
      )}
      {children}
      {trailing && (
        <span className="flex shrink-0 items-center justify-center border-l-[0.5px] border-surface-divider p-4 [&_svg]:h-5 [&_svg]:w-5">
          {trailing}
        </span>
      )}
    </div>
  );
}

/** Label above a field (Figma "Label": body-md, 4px inset). */
export function FieldLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('block px-1 text-body-md text-ink-sub', className)}>
      {children}
    </label>
  );
}

export function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="px-1 text-body-sm text-status-error-text">{error}</p>;
  if (hint) return <p className="px-1 text-body-sm text-ink-caption">{hint}</p>;
  return null;
}

/** Shared class for the bare <input>/<select> that sits inside a FieldBox. */
export const fieldControlClass =
  'min-w-0 flex-1 bg-transparent px-4 py-3.5 text-body-lg text-ink outline-none placeholder:text-ink-caption/60';
