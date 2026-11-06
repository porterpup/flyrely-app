import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Modal } from '~/components/ui';

export interface AffiliateDisclosureProps {
  /** `disclosure.required` from the API: true when at least one link on the card carries an affiliate ID. */
  required: boolean;
  onDark?: boolean;
  className?: string;
}

/** Body of the "How we choose these" sheet. Exported so the gallery can preview it inline. */
export function HowWeChooseBody({ required }: { required: boolean }) {
  return (
    <div className="space-y-3 text-body-md text-ink">
      <p>Flights are ranked by FlyRely&apos;s delay risk, never by commission.</p>
      {required && (
        <p>
          FlyRely may earn a commission from some of these links. It doesn&apos;t change the order or the price you
          pay. Links that may earn a commission are marked as sponsored for your browser.
        </p>
      )}
      <p className="text-ink-caption">
        Times come from typical schedules, so check times, seats and prices on the partner site before you decide.
      </p>
    </div>
  );
}

/** One-line disclosure (only when required) plus a "How we choose these" sheet. */
export function AffiliateDisclosure({ required, onDark = true, className }: AffiliateDisclosureProps) {
  const [open, setOpen] = useState(false);
  const muted = onDark ? 'text-white/80' : 'text-ink-caption';
  return (
    <div className={cn('space-y-1', className)}>
      {required && (
        <p className={cn('text-body-sm', muted)}>
          FlyRely may earn a commission from some of these links. It doesn&apos;t change the order or the price you pay.
        </p>
      )}
      <p className={cn('text-body-sm', muted)}>
        Flights are ranked by FlyRely&apos;s delay risk, never by commission.{' '}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'underline underline-offset-2 rounded-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent',
            onDark ? 'text-white' : 'text-surface-accent'
          )}
        >
          How we choose these
        </button>
      </p>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="How we choose these">
        <HowWeChooseBody required={required} />
      </Modal>
    </div>
  );
}
