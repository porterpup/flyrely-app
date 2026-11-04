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
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, onRightIconClick, className, id, ...props }, ref) => {
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
              <button type="button" onClick={onRightIconClick} className="text-ink-caption hover:text-ink">
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
