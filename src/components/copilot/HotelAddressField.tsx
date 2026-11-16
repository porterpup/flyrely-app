import { useId } from 'react';
import { cn } from '~/lib/utils';

export interface HotelAddressFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Optional "Paste your hotel address" field. Used on the device only to fill the Uber drop-off. */
export function HotelAddressField({ value, onChange, className }: HotelAddressFieldProps) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-body-md font-medium text-ink">
        Paste your hotel address (optional)
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        autoComplete="off"
        placeholder="Fills the Uber drop-off"
        className="w-full rounded-btn border border-surface-field-border bg-surface-field px-4 py-3 text-body-md text-ink placeholder:text-ink-placeholder focus-visible:border-surface-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
      />
      <p className="text-body-sm text-ink-caption">Stays on this device. We never send it to FlyRely.</p>
    </div>
  );
}
