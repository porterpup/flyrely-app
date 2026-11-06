import { Phone } from "lucide-react";
import { cn } from "~/lib/utils";
import type { AirlineInfo, AirlineNotice } from "~/copilot/types";
import { PartnerButton } from "./PartnerButton";
import { formatMonthYear } from "./format";

export interface AirlineContactProps {
  /** null when the airline isn't in our list: the card falls back to "Contact your airline". */
  airline: AirlineInfo | null;
  /** Carrier note and status page, used instead of the fallback when `airline` is null. */
  notice?: AirlineNotice | null;
  onDark?: boolean;
  className?: string;
}

/** Manage-booking link and phone number for the user's airline. */
export function AirlineContact({
  airline,
  notice,
  onDark = true,
  className,
}: AirlineContactProps) {
  const muted = onDark ? "text-white/80" : "text-ink-caption";
  if (!airline && notice && (notice.note || notice.status_url)) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-body-lg font-medium">{notice.name}</p>
        {notice.note && <p className={cn("text-body-md", muted)}>{notice.note}</p>}
        {notice.status_url && (
          <PartnerButton
            size="default"
            variant="primary"
            fullWidth
            onDark={onDark}
            handoff={{
              partner: notice.code,
              label: `Check ${notice.name} flight status`,
              url: notice.status_url,
              is_affiliate: false,
            }}
          />
        )}
      </div>
    );
  }
  if (!airline) {
    return (
      <div className={cn("space-y-1", className)}>
        <p className="text-body-lg font-medium">Contact your airline</p>
        <p className={cn("text-body-md", muted)}>
          Use the phone number or app from your booking confirmation to rebook
          or ask about a refund.
        </p>
      </div>
    );
  }
  return (
    <div className={cn("space-y-3", className)}>
      <p className={cn("text-body-md", muted)}>
        Rebook or manage your booking with {airline.name}
      </p>
      <PartnerButton
        size="default"
        variant="primary"
        fullWidth
        onDark={onDark}
        handoff={{
          partner: airline.code,
          label: `Manage booking with ${airline.name}`,
          url: airline.manage_booking_url,
          is_affiliate: false,
        }}
      />
      {airline.phone && (
        <a
          href={`tel:${airline.phone}`}
          className={cn(
            "flex items-center justify-center gap-2 rounded-btn py-3 text-action-lg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent focus-visible:ring-offset-2",
            onDark
              ? "text-white hover:bg-white/10"
              : "text-ink hover:bg-surface-muted",
          )}
        >
          <Phone className="h-5 w-5" aria-hidden />
          <span>
            Call <span className="sr-only">{airline.name} on </span>
            {airline.phone_display}
          </span>
        </a>
      )}
      {airline.verified_on && (
        <p className={cn("text-body-sm", muted)}>
          Contact details checked {formatMonthYear(airline.verified_on)}.
        </p>
      )}
    </div>
  );
}
