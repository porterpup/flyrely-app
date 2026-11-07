export interface FlightCancelledLinkProps {
  onClick: () => void;
}

/** Quiet, always-visible entry to the cancelled-flight flow on flights that show no Plan B card. */
export function FlightCancelledLink({ onClick }: FlightCancelledLinkProps) {
  return (
    <div className="px-1">
      <button
        type="button"
        onClick={onClick}
        className="rounded-sm text-body-sm text-surface-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
      >
        Flight cancelled?
      </button>
    </div>
  );
}
