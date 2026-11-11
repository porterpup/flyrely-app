import { Alert } from '~/components/ui';

/** "You're tracking AA100" strip shown on a flight page right after it was added. Renders nothing otherwise. */
export function AddedStrip({ show, flightNumber, onUndo }: { show: boolean; flightNumber: string; onUndo: () => void }) {
  if (!show) return null;
  return (
    <Alert
      status="success"
      role="status"
      lineOne={`You're tracking ${flightNumber}`}
      lineTwo="We'll keep checking it until you fly."
      action={
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-body-md font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
        >
          Undo
        </button>
      }
    />
  );
}
