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
      <label htmlFor={id} className="text-body-md font-medium text-white">
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
        className="w-full rounded-btn border border-white/40 bg-white/10 px-4 py-3 text-body-md text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      />
      <p className="text-body-sm text-white/80">Stays on this device. We never send it to FlyRely.</p>
    </div>
  );
}
