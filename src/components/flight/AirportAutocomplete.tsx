import { X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { fieldControlClass } from '~/components/ui/Field';
import { FieldBox, FieldLabel } from '~/components/ui';
import { IconButton } from '~/components/ui/IconButton';
import { InputError } from '~/components/ui/InputError';
import { searchAirports } from '~/lib/airports';
import type { AirportInfo } from '~/lib/airports';
import { cn } from '~/lib/utils';

export function AirportAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  leftIcon,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (code: string, info?: AirportInfo) => void;
  leftIcon?: React.ReactNode;
  error?: string;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AirportInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (clear, profile prefill) without remounting the input.
  // Skip when the value is just what typing or picking a suggestion already produced.
  useEffect(() => {
    if (!value) {
      setQuery('');
      setConfirmed(false);
    } else if (query.toUpperCase().slice(0, 3) !== value) {
      setQuery(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setConfirmed(false);
    if (q.length >= 1) {
      setSuggestions(searchAirports(q));
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
    onChange(q.toUpperCase().slice(0, 3));
  };

  const select = (airport: AirportInfo) => {
    setQuery(`${airport.code} – ${airport.city}`);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    onChange(airport.code, airport);
  };

  const clear = () => {
    setQuery('');
    setConfirmed(false);
    setSuggestions([]);
    setOpen(false);
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <FieldBox leading={leftIcon} className={cn(confirmed && 'border-status-success-text bg-status-success-bg')}>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          ref={inputRef}
          onFocus={(e) => {
            // A prefilled or picked value: select it all so typing replaces it instead of appending.
            if (e.target.value && (confirmed || e.target.value === value)) e.target.select();
            else if (query.length >= 1 && suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label={label}
          className={cn(fieldControlClass, leftIcon && 'pl-2')}
        />
        {query && (
          <IconButton aria-label="Clear" kind="text" onClick={clear} className="self-center">
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
        )}
      </FieldBox>
      {error && <InputError message={error} className="mt-0" />}
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-field border border-surface-divider bg-white shadow-lg">
          {suggestions.map((ap) => (
            <li key={ap.code}>
              <button
                type="button"
                onMouseDown={() => select(ap)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-muted"
              >
                <span className="font-semibold text-ink">{ap.code}</span>
                <span className="ml-3 truncate text-body-md text-ink-caption">{ap.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
