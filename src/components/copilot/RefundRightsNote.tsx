import { cn } from '~/lib/utils';
import { Alert } from '~/components/ui';
import type { RefundRights } from '~/copilot/types';

export interface RefundRightsNoteProps {
  refund: RefundRights;
  /** At-risk (Plan B) wording: "If your flight is cancelled..." */
  conditional?: boolean;
  onDark?: boolean;
  className?: string;
}

export const DOT_REFUNDS_URL = 'https://www.transportation.gov/airconsumer/refunds';

/** Plain-language refund rights (US DOT 14 CFR Part 260) with the "accepting a rebooking can forfeit a refund" warning. */
export function RefundRightsNote({ refund, conditional = false, onDark = true, className }: RefundRightsNoteProps) {
  const muted = onDark ? 'text-white/80' : 'text-ink-caption';
  if (!refund.applies) {
    return (
      <div className={cn('space-y-1', className)}>
        <p className="text-body-lg font-medium">Check your airline&apos;s policy</p>
        <p className={cn('text-body-md', muted)}>
          Refund and rebooking rules differ outside the US. Ask your airline what you&apos;re owed before you accept
          anything.
        </p>
      </div>
    );
  }
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-body-md">
        {conditional ? 'If your flight is cancelled and you ' : 'If you '}
        <strong className="font-semibold">don&apos;t accept</strong> the airline&apos;s alternative, you&apos;re owed a{' '}
        <strong className="font-semibold">cash refund</strong> to your original payment, automatically. You don&apos;t
        have to accept a voucher.
      </p>
      <Alert
        solid
        status="warning"
        lineOne={
          <>
            <strong className="font-semibold">
              Accepting the airline&apos;s rebooking (or flying on it) can mean giving up the cash refund.
            </strong>{' '}
            Decide before you accept.
          </>
        }
      />
      <p className={cn('text-body-md', muted)}>Delay compensation in cash isn&apos;t required by US law.</p>
      <p className={cn('text-body-sm', muted)}>
        This is general information, not legal advice.{' '}
        <a
          href={DOT_REFUNDS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'underline underline-offset-2 rounded-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent',
            onDark ? 'text-white' : 'text-surface-accent'
          )}
        >
          US DOT refunds page<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}
