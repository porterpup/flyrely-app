import { cn } from '~/lib/utils';
import { Alert } from '~/components/ui';
import type { RefundRights } from '~/copilot/types';

export interface RefundRightsNoteProps {
  refund: RefundRights;
  /** At-risk (Plan B) wording: "If your flight is cancelled..." */
  conditional?: boolean;
  /** The user already accepted a rebooking: no "if you don't accept" wording. */
  rebooked?: boolean;
  /** An airline-specific notice is shown (e.g. Spirit): do not promise an automatic refund. */
  airlineNotice?: boolean;
  onDark?: boolean;
  className?: string;
}

export const DOT_REFUNDS_URL = 'https://www.transportation.gov/airconsumer/refunds';

/** Plain-language refund rights (US DOT 14 CFR Part 260) with the "accepting a rebooking can forfeit a refund" warning. */
export function RefundRightsNote({
  refund,
  conditional = false,
  rebooked = false,
  airlineNotice = false,
  onDark = true,
  className,
}: RefundRightsNoteProps) {
  const muted = onDark ? 'text-white/80' : 'text-ink-caption';
  const otherCountries =
    refund.international === true || refund.eu_possible === true ? (
      <p className={cn('text-body-md', muted)}>Other countries&apos; rules (for example EU261) may give you more.</p>
    ) : null;
  if (!refund.applies) {
    return (
      <div className={cn('space-y-1', className)}>
        <p className="text-body-lg font-medium">Check your airline&apos;s policy</p>
        <p className={cn('text-body-md', muted)}>
          Refund and rebooking rules differ outside the US. Ask your airline what you&apos;re owed before you accept
          anything.
        </p>
        {otherCountries}
      </div>
    );
  }
  let lead: React.ReactNode;
  if (rebooked) {
    lead = (
      <p className="text-body-md">
        You&apos;ve accepted a rebooking. Taking the new flight usually means{' '}
        <strong className="font-semibold">no refund for the original flight</strong>, but you can still ask your
        airline.
      </p>
    );
  } else if (airlineNotice) {
    lead = (
      <p className="text-body-md">
        Refund handling may differ for this airline. If a refund isn&apos;t provided, contact your card issuer about a
        chargeback.
      </p>
    );
  } else {
    lead = (
      <p className="text-body-md">
        {conditional ? 'If your flight is cancelled and you ' : 'If you '}
        <strong className="font-semibold">don&apos;t accept</strong> the airline&apos;s alternative, you&apos;re owed{' '}
        <strong className="font-semibold">a refund to your original form of payment</strong>, automatically. You
        don&apos;t have to accept a voucher.
      </p>
    );
  }
  return (
    <div className={cn('space-y-3', className)}>
      {lead}
      {!rebooked && (
        <Alert
          solid
          status="warning"
          lineOne={
            <>
              <strong className="font-semibold">
                Accepting the airline&apos;s rebooking (or flying on it) can mean giving up the refund.
              </strong>{' '}
              Decide before you accept.
            </>
          }
        />
      )}
      <p className={cn('text-body-md', muted)}>
        Refunds also apply after a significant delay (3+ hours domestic, 6+ hours international) if you choose not to
        travel. Beyond a refund, delay compensation in cash isn&apos;t required by US law.
      </p>
      {otherCountries}
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
