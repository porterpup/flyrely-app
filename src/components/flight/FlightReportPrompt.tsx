import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card } from '~/components/ui';
import { cn } from '~/lib/utils';
import { REPORT_OPTIONS, reportErrorMessage, sendReport } from '~/lib/flightReport';
import { markReportSent, setSelfReport } from '~/lib/flightStore';
import { departureMs, originTz } from '~/lib/flightTime';
import { emitNotice } from '~/lib/syncEngine';
import type { Flight, SelfReportAnswer } from '~/types';

export interface FlightReportPromptProps {
  flight: Flight;
  /** Dark styling, for the flight page. */
  onDark?: boolean;
  /** Home shows a "Not now" button and never the answered row. */
  variant?: 'flight' | 'home';
  onNotNow?: () => void;
  /** Called with true while the thanks strip is showing, so Home keeps the prompt on screen after the flight is answered. */
  onThanksChange?: (showing: boolean) => void;
}

const THANKS_MS = 8000;

export const labelFor = (answer: SelfReportAnswer | null | undefined): string =>
  REPORT_OPTIONS.find((o) => o.value === answer)?.label ?? '';

/** "Sat, Nov 7, 8:00 AM" in the origin airport's time zone (not the phone's). */
function departureWhen(f: Flight): { date: string; time: string } {
  const ms = departureMs(f);
  if (Number.isNaN(ms)) return { date: '', time: '' };
  const tz = originTz(f);
  return {
    date: new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(ms),
    time: new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(ms),
  };
}

/** Sends the answer; a failure stays queued (`sent: false`) and is retried later. Only a 429 tells the user. */
async function deliver(flight: Flight, answer: SelfReportAnswer | null): Promise<void> {
  const status = await sendReport(flight, answer);
  if (status === 200) markReportSent(flight.id, answer);
  else if (status === 429) emitNotice(reportErrorMessage(429), 'info');
}

/** "Did AA100 leave on time?" with six answers, an Undo strip after a tap, and a quiet "You said" row once answered. */
export function FlightReportPrompt({ flight, onDark = false, variant = 'flight', onNotNow, onThanksChange }: FlightReportPromptProps) {
  const isHome = variant === 'home';
  const [thanks, setThanks] = useState<{ answer: SelfReportAnswer; previous: SelfReportAnswer | null } | null>(null);
  const [changing, setChanging] = useState(false);
  const notify = useRef(onThanksChange);
  notify.current = onThanksChange;

  useEffect(() => {
    notify.current?.(thanks !== null);
  }, [thanks]);
  // The strip fades out by itself; the answer is already saved.
  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(() => setThanks(null), THANKS_MS);
    return () => clearTimeout(t);
  }, [thanks]);

  const current = flight.selfReport?.answer ?? null;

  const choose = (answer: SelfReportAnswer) => {
    const previous = current;
    notify.current?.(true); // before the save: Home would otherwise drop this flight from the picker and unmount us
    setSelfReport(flight.id, answer);
    setChanging(false);
    setThanks({ answer, previous });
    void deliver(flight, answer);
  };

  const undo = () => {
    if (!thanks) return;
    const { previous } = thanks;
    setThanks(null);
    setSelfReport(flight.id, previous);
    void deliver(flight, previous);
  };

  if (thanks) {
    return (
      <Alert
        status="info"
        role="status"
        lineOne={`Thanks. You said ${labelFor(thanks.answer)}.`}
        action={
          <button
            type="button"
            onClick={undo}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-body-md font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
          >
            Undo
          </button>
        }
      />
    );
  }

  if (current && !changing) {
    if (isHome) return null;
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-tile px-5 py-1 text-body-sm',
          onDark ? 'bg-surface-panel text-ink-on-dark-muted' : 'bg-surface-muted text-ink'
        )}
      >
        <span>You said: {labelFor(current)}</span>
        <button
          type="button"
          onClick={() => setChanging(true)}
          className={cn(
            'inline-flex min-h-11 items-center rounded px-2 text-body-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2',
            onDark ? 'text-white focus-visible:ring-white' : 'text-ink focus-visible:ring-surface-accent'
          )}
        >
          Change
        </button>
      </div>
    );
  }

  const { date, time } = departureWhen(flight);
  const optionClass = cn(
    'flex min-h-11 w-full items-center rounded-btn-sm border px-4 py-2 text-left text-body-md focus-visible:outline-none focus-visible:ring-2',
    onDark
      ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white'
      : 'border-surface-stroke bg-white text-ink hover:bg-surface-muted focus-visible:ring-surface-accent'
  );
  return (
    <Card tone={onDark ? 'dark' : 'light'} aria-labelledby={`report-q-${flight.id}`}>
      <h2 id={`report-q-${flight.id}`} className="text-heading-sm">
        Did {flight.flightNumber} leave on time?
      </h2>
      <p className={cn('mt-1 mb-4 text-body-sm', onDark ? 'text-ink-on-dark-muted' : 'text-ink-sub')}>
        {flight.origin.code} → {flight.destination.code} · {date}, {time} departure. Your answer helps us check our predictions.
      </p>
      <div className="space-y-2">
        {REPORT_OPTIONS.map((o) => (
          <button key={o.value} type="button" className={optionClass} onClick={() => choose(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {isHome && (
        <div className="mt-2 flex justify-center">
          <Button variant="text" size="sm" onClick={onNotNow}>
            Not now
          </Button>
        </div>
      )}
    </Card>
  );
}
