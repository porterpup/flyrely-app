import { forwardRef, useId } from 'react';
import { cn } from '~/lib/utils';
import { FieldBox, FieldLabel, FieldMessage, fieldControlClass } from './Field';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Figma "Leading Icon". */
  leftIcon?: React.ReactNode;
  /** Figma "Trailing Icon" (clickable when onRightIconClick is given). */
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  /** Accessible name for the trailing icon button. */
  rightIconLabel?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, onRightIconClick, rightIconLabel, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <FieldBox
          invalid={!!error}
          leading={leftIcon}
          trailing={
            rightIcon &&
            (onRightIconClick ? (
              <button
                type="button"
                onClick={onRightIconClick}
                aria-label={rightIconLabel}
                className="-m-4 flex min-h-11 min-w-11 items-center justify-center p-4 text-ink-caption hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-surface-accent"
              >
                {rightIcon}
              </button>
            ) : (
              rightIcon
            ))
          }
        >
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            className={cn(
              fieldControlClass,
              leftIcon && 'pl-2',
              rightIcon && 'pr-2',
              (props.type === 'date' || props.type === 'time') && 'pr-2 text-body-md',
              className
            )}
            {...props}
          />
        </FieldBox>
        <FieldMessage error={error} hint={hint} />
      </div>
    );
  }
);

Input.displayName = 'Input';
