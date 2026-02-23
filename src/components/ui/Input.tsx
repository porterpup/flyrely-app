import { forwardRef } from 'react';
import { cn } from '~/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconClick,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-navy-700 mb-2">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              'input-base',
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              error && 'input-error',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
            >
              {rightIcon}
            </button>
          )}
        </div>

        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-navy-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
