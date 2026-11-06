import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '~/components/ui';
import { AIRPORTS } from '~/lib/airports';

export interface HomeAirportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current home airport (IATA), or null. */
  current: string | null;
  /** Called with an uppercase 3-letter code, or null to clear. */
  onSave: (code: string | null) => void;
}

const IATA = /^[A-Za-z]{3}$/;

/** Picker for the home airport. Stays on the device: the code is only saved to localStorage by the caller. */
export function HomeAirportModal({ isOpen, onClose, current, onSave }: HomeAirportModalProps) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? AIRPORTS.filter((a) => a.code.toLowerCase().startsWith(q) || a.city.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const typedCode = IATA.test(query.trim()) ? query.trim().toUpperCase() : null;
  const typedIsListed = typedCode ? matches.some((a) => a.code === typedCode) : false;

  const save = (code: string | null) => {
    onSave(code);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Home airport">
      <div className="space-y-4 text-ink">
        <p className="text-body-md text-ink-caption">
          We use it to tell if you&apos;re away from home. It stays on this device.
        </p>
        <Input
          label="Airport code or city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. BOS or Boston"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={40}
        />
        <ul className="space-y-1" aria-label="Matching airports">
          {matches.map((a) => (
            <li key={a.code}>
              <button
                type="button"
                onClick={() => save(a.code)}
                className="flex w-full items-baseline gap-3 rounded-btn-sm px-3 py-3 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
              >
                <span className="text-title-sm">{a.code}</span>
                <span className="text-body-md text-ink-caption">
                  {a.city}, {a.name}
                </span>
              </button>
            </li>
          ))}
          {typedCode && !typedIsListed && (
            <li>
              <button
                type="button"
                onClick={() => save(typedCode)}
                className="w-full rounded-btn-sm px-3 py-3 text-left text-body-md hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
              >
                Use {typedCode}
              </button>
            </li>
          )}
        </ul>
        {current && (
          <Button variant="text" size="sm" onClick={() => save(null)}>
            Remove home airport ({current})
          </Button>
        )}
      </div>
    </Modal>
  );
}
