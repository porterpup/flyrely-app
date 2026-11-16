import { Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { fieldControlClass } from '~/components/ui/Field';
import { FieldBox, FieldLabel } from '~/components/ui';
import { IconButton } from '~/components/ui/IconButton';
import { InputError } from '~/components/ui/InputError';
import { getAirport, searchAirports } from '~/lib/airports';
import { getAirportRef } from '~/lib/airportRef';
import type { AirportInfo } from '~/lib/airports';
import { cn } from '~/lib/utils';

/** "EWR – Newark" for a known code, else null. */
function labelFor(code: string): string | null {
  if (code.length !== 3) return null;
  const city = getAirport(code)?.city ?? getAirportRef(code)?.city;
  return getAirport(code) || getAirportRef(code) ? (city ? `${code} – ${city}` : code) : null;
}

/**
 * Typed text counts as a chosen code only when it is exactly 3 letters, is a known code, and is not the start of
 * another airport's city ("San" is San Diego's code but also San Francisco, San Antonio...: pick from the list).
 */
function autoCode(text: string): string {
  const t = text.trim();
  if (!/^[A-Za-z]{3}$/.test(t)) return '';
  const code = t.toUpperCase();
  if (!labelFor(code)) return '';
  const lower = t.toLowerCase();
  const other = searchAirports(t, 100).some((a) => a.code !== code && a.city.toLowerCase().startsWith(lower));
  return other ? '' : code;
}

export function AirportAutocomplete({
  label: fieldLabel,
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
  const [query, setQuery] = useState(labelFor(value) ?? value);
  const [suggestions, setSuggestions] = useState<AirportInfo[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The last value this field reported to its parent, so the sync effect can tell its own echo from an outside change.
  const emitted = useRef(value);

  // Selected = the parent holds a known airport code and the text shows that code (typed or picked).
  // Typing "EWR" and picking "EWR" from the list look the same.
  const label = labelFor(value);
  const confirmed = !!label && (query.toUpperCase() === value || query === label);

  // Sync outside changes (clear, profile prefill, Recent) without remounting the input.
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setQuery(labelFor(value) ?? value);
  }, [value]);

  const report = (code: string, info?: AirportInfo) => {
    emitted.current = code;
    if (info) onChange(code, info);
    else onChange(code);
  };

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
    if (q.length >= 1) {
      setSuggestions(searchAirports(q));
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
    report(autoCode(q));
  };

  const select = (airport: AirportInfo) => {
    setQuery(`${airport.code} – ${airport.city}`);
    setOpen(false);
    setSuggestions([]);
    report(airport.code, airport);
  };

  const clear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    report('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <FieldLabel>{fieldLabel}</FieldLabel>
      <FieldBox leading={leftIcon} className={cn(confirmed && 'border-surface-accent')}>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          ref={inputRef}
          onFocus={(e) => {
            // A prefilled or picked value: select it all so typing replaces it instead of appending.
            if (e.target.value && confirmed) e.target.select();
            else if (query.length >= 1 && suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            // A typed code like "EWR" expands to "EWR – Newark" once focus leaves, so both fields read the same.
            if (label && query.toUpperCase() === value) setQuery(label);
          }}
          placeholder={placeholder}
          aria-label={fieldLabel}
          title={confirmed ? query : undefined}
          className={cn(fieldControlClass, 'truncate', leftIcon && 'pl-2')}
        />
        {confirmed && <Check role="img" className="mr-1 h-5 w-5 shrink-0 self-center text-surface-accent" aria-label="Selected" />}
        {query && (
          <IconButton aria-label="Clear" kind="text" onClick={clear} className="self-center">
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
        )}
      </FieldBox>
      {error && <InputError message={error} className="mt-0" />}
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-field border border-surface-field-border bg-surface-card shadow-lg">
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
