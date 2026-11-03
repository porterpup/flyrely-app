import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '~/lib/utils';
import { FieldBox, FieldLabel, FieldMessage, fieldControlClass } from './Field';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  /** Muted text colour for the empty / placeholder option. */
  placeholderSelected?: boolean;
}

/** Native select styled as the Figma Input with a trailing chevron cell. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, leftIcon, placeholderSelected, className, id, children, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && <FieldLabel htmlFor={selectId}>{label}</FieldLabel>}
        <FieldBox invalid={!!error} leading={leftIcon} trailing={<ChevronDown aria-hidden />} className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              fieldControlClass,
              'appearance-none',
              // stretch the native control over the chevron cell so the whole box opens the menu
              placeholderSelected && 'text-ink-caption/60',
              className
            )}
            {...props}
          >
            {children}
          </select>
        </FieldBox>
        <FieldMessage error={error} hint={hint} />
      </div>
    );
  }
);

Select.displayName = 'Select';
