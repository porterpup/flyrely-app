import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card } from '~/components/ui';
import { cn } from '~/lib/utils';
import { REPORT_OPTIONS, reportErrorMessage, sendReport } from '~/lib/flightReport';
import { getFlightById, markReportRejected, markReportSent, setSelfReport } from '~/lib/flightStore';
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

/** Short forms for the middle of a sentence ("You said it left on time."); the buttons keep the long labels. */
const SHORT_LABELS: Record<SelfReportAnswer, string> = {
  on_time: 'on time',
  late_15_44: '15–44 min late',
  late_45_119: '45 min to 2 h late',
  late_120_plus: 'over 2 h late',
  cancelled: 'cancelled',
  did_not_fly: "that you didn't take this flight",
};

/** "it left on time", "it was 15–44 min late", "it was cancelled", "that you didn't take this flight". */
const SAID: Record<SelfReportAnswer, string> = {
  on_time: 'it left on time',
  late_15_44: `it was ${SHORT_LABELS.late_15_44}`,
  late_45_119: `it was ${SHORT_LABELS.late_45_119}`,
  late_120_plus: `it was ${SHORT_LABELS.late_120_plus}`,
  cancelled: 'it was cancelled',
  did_not_fly: SHORT_LABELS.did_not_fly,
};

/** For "You said: on time". */
export const shortLabelFor = (answer: SelfReportAnswer | null | undefined): string =>
  answer ? SHORT_LABELS[answer].replace(/^that /, '') : '';

/** "Sat, Nov 7, 8:00 AM" in the origin airport's time zone (not the phone's). */
function departureWhen(f: Flight): { date: string; time: string } {
  const ms = departureMs(f);
  if (Number.isNaN(ms)) return { date: '', time: '' };
  const tz = originTz(f);
  return {
    date: new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(ms),
    time: new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(ms),
  };
}

/** Sends the answer; a failure stays queued (`sent: false`) and is retried later. Only a 429 tells the user. */
async function deliver(flight: Flight, answer: SelfReportAnswer | null): Promise<void> {
  // Which answer this is: a later answer with the same value is a different answer.
  const answeredAt = getFlightById(flight.id)?.selfReport?.answeredAt;
  try {
    const status = await sendReport(flight, answer);
    if (status === 200 && answeredAt) markReportSent(flight.id, answeredAt);
    else if (status === 422 && answeredAt) markReportRejected(flight.id, answeredAt);
    else if (status === 429) emitNotice(reportErrorMessage(429), 'info');
  } catch {
    /* stays queued and is retried later */
  }
}

type FocusTarget = 'undo' | 'question' | 'option' | 'change';

/** "Did AA100 leave on time?" with six answers, an Undo strip after a tap, and a quiet "You said" row once answered. */
export function FlightReportPrompt({ flight, onDark = false, variant = 'flight', onNotNow, onThanksChange }: FlightReportPromptProps) {
  const isHome = variant === 'home';
  const [thanks, setThanks] = useState<{
    answer: SelfReportAnswer;
    previous: SelfReportAnswer | null;
  } | null>(null);
  const [changing, setChanging] = useState(false);
  const [hold, setHold] = useState(false); // pointer over or focus inside the strip: keep it open
  const notify = useRef(onThanksChange);
  notify.current = onThanksChange;
  const undoRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);

  // Move focus after the swap below has rendered (the old control unmounts, so focus would otherwise fall to the page).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const el = {
      undo: undoRef,
      question: questionRef,
      option: firstOptionRef,
      change: changeRef,
    }[target].current;
    if (!el) return;
    pendingFocus.current = null;
    el.focus();
  });

  useEffect(() => {
    notify.current?.(thanks !== null);
  }, [thanks]);
  // The strip hides by itself; the answer is already saved. Paused while hovered or focused, then a fresh 8 s.
  useEffect(() => {
    if (!thanks || hold) return;
    const t = setTimeout(() => setThanks(null), THANKS_MS);
    return () => clearTimeout(t);
  }, [thanks, hold]);
  useEffect(() => {
    if (!thanks) setHold(false);
  }, [thanks]);

  const current = flight.selfReport?.answer ?? null;

  const choose = (answer: SelfReportAnswer) => {
    const previous = current;
    notify.current?.(true); // before the save: Home would otherwise drop this flight from the picker and unmount us
    setSelfReport(flight.id, answer);
    setChanging(false);
    pendingFocus.current = 'undo';
    setThanks({ answer, previous });
    void deliver(flight, answer);
  };

  const undo = () => {
    if (!thanks) return;
    const { previous } = thanks;
    setThanks(null);
    pendingFocus.current = previous ? 'change' : 'question';
    setSelfReport(flight.id, previous);
    void deliver(flight, previous);
  };

  const thanksText = thanks ? `Thanks. You said ${SAID[thanks.answer]}.` : '';
  // Always mounted, so screen readers announce the text when it changes (a region that appears with its text is often missed).
  const liveRegion = (
    <div role="status" className="sr-only">
      {thanksText}
    </div>
  );

  if (thanks) {
    return (
      <>
        {liveRegion}
        <Alert
          status="info"
          lineOne={thanksText}
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
          }}
          action={
            <button
              ref={undoRef}
              type="button"
              onClick={undo}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-body-md font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-accent"
            >
              Undo
            </button>
          }
        />
      </>
    );
  }

  if (current && !changing) {
    if (isHome) return liveRegion;
    return (
      <>
        {liveRegion}
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-tile px-5 py-1 text-body-sm',
            onDark ? 'bg-surface-panel text-ink-on-dark-muted' : 'bg-surface-muted text-ink'
          )}
        >
          <span>You said: {shortLabelFor(current)}</span>
          <button
            ref={changeRef}
            type="button"
            onClick={() => {
              pendingFocus.current = 'option';
              setChanging(true);
            }}
            className={cn(
              'inline-flex min-h-11 items-center rounded px-2 text-body-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2',
              onDark ? 'text-white focus-visible:ring-white' : 'text-ink focus-visible:ring-surface-accent'
            )}
          >
            Change
          </button>
        </div>
      </>
    );
  }

  const { date, time } = departureWhen(flight);
  const optionClass = cn(
    'flex min-h-11 w-full items-center rounded-btn-sm border px-4 py-2 text-left text-body-md focus-visible:outline-none focus-visible:ring-2',
    onDark
      ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white'
      : 'border-surface-stroke bg-white text-ink hover:bg-surface-muted focus-visible:ring-surface-accent'
  );
  const Heading = isHome ? 'p' : 'h2'; // Home has an h1 further down: a heading here would come before it
  return (
    <>
      {liveRegion}
      <section aria-labelledby={`report-q-${flight.id}`}>
        <Card tone={onDark ? 'dark' : 'light'}>
          <Heading
            id={`report-q-${flight.id}`}
            ref={questionRef as React.Ref<HTMLParagraphElement & HTMLHeadingElement>}
            tabIndex={-1}
            className="text-heading-sm focus:outline-none"
          >
            Did {flight.flightNumber} leave on time?
          </Heading>
          <p className={cn('mt-1 mb-4 text-body-sm', onDark ? 'text-ink-on-dark-muted' : 'text-ink-sub')}>
            {flight.origin.code} → {flight.destination.code} · {date}, {time} departure. Your answer helps us check our predictions.
          </p>
          <div className="space-y-2">
            {REPORT_OPTIONS.map((o, i) => (
              <button
                key={o.value}
                ref={i === 0 ? firstOptionRef : undefined}
                type="button"
                className={optionClass}
                onClick={() => choose(o.value)}
              >
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
          {!isHome && current && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  pendingFocus.current = 'change';
                  setChanging(false);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>
      </section>
    </>
  );
}
