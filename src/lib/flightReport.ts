import { API_BASE_URL } from '~/lib/api';
import { arrivalMs, departureMs } from '~/lib/flightTime';
import type { Flight, SelfReportAnswer } from '~/types';

export const REPORT_OPTIONS: { value: SelfReportAnswer; label: string }[] = [
  { value: 'on_time', label: 'On time (under 15 min late)' },
  { value: 'late_15_44', label: '15–44 min late' },
  { value: 'late_45_119', label: '45 min to 2 h late' },
  { value: 'late_120_plus', label: 'Over 2 h late' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'did_not_fly', label: "I didn't take this flight" },
];

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type ReportEligibility = 'no_prediction' | 'too_early' | 'ask' | 'answered' | 'too_old';

/** Whether (and when) to ask "Were you delayed?" for this flight. */
export function reportEligibility(f: Flight, nowMs: number): ReportEligibility {
  if (typeof f.delayProbability !== 'number') return 'no_prediction';
  if (f.selfReport?.answer) return 'answered';
  const dep = departureMs(f);
  if (Number.isNaN(dep)) return 'no_prediction';
  if (nowMs - dep > 30 * DAY) return 'too_old';
  const arr = arrivalMs(f);
  // A bad manual arrival time (before departure) must not ask before the flight left.
  const askFrom = arr !== undefined ? Math.max(arr, dep) + HOUR : dep + 5 * HOUR;
  return nowMs < askFrom ? 'too_early' : 'ask';
}

/** Show the prompt on Home: still askable, not dismissed, and within 7 days of departure. */
export function showOnHome(f: Flight, nowMs: number): boolean {
  return reportEligibility(f, nowMs) === 'ask' && !f.reportPromptDismissed && nowMs - departureMs(f) <= 7 * DAY;
}

/** The most recently departed flight that should be asked about, or null. */
export function pickHomePrompt(flights: Flight[], nowMs: number): Flight | null {
  let best: Flight | null = null;
  for (const f of flights) {
    if (!showOnHome(f, nowMs)) continue;
    if (!best || departureMs(f) > departureMs(best)) best = f;
  }
  return best;
}

async function accessToken(): Promise<string> {
  const { getSupabase, isSupabaseConfigured } = await import('~/lib/supabaseAuth');
  if (!isSupabaseConfigured()) throw new Error('not signed in');
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not signed in');
  return token;
}

/** Naive local `YYYY-MM-DDTHH:MM:SS` (no offset), as the API expects. */
function naiveLocal(value: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/.exec(value);
  return m ? `${m[1]}T${m[2]}:${m[3] ?? '00'}` : value;
}

/** The last send per flight id, so a later send always starts after the earlier one finishes. */
const sendChains = new Map<string, Promise<unknown>>();

/**
 * POST the answer (null withdraws). Returns the HTTP status: 200 is saved/withdrawn,
 * 0 means the request never got a response, 401 also covers a missing session.
 * Sends for the same flight run one at a time, in call order.
 */
export function sendReport(
  flight: Flight,
  answer: SelfReportAnswer | null,
  fetchImpl: typeof fetch = fetch,
  getToken: () => Promise<string> = accessToken
): Promise<number> {
  const previous = sendChains.get(flight.id) ?? Promise.resolve();
  const run = previous.then(() => sendNow(flight, answer, fetchImpl, getToken));
  sendChains.set(flight.id, run);
  void run.finally(() => {
    if (sendChains.get(flight.id) === run) sendChains.delete(flight.id);
  });
  return run;
}

async function sendNow(
  flight: Flight,
  answer: SelfReportAnswer | null,
  fetchImpl: typeof fetch = fetch,
  getToken: () => Promise<string> = accessToken
): Promise<number> {
  let token: string;
  try {
    token = await getToken();
  } catch {
    return 401;
  }
  try {
    const res = await fetchImpl(`${API_BASE_URL}/flight-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        flight_id: flight.id,
        airline: flight.airline.code,
        flight_number: flight.flightNumber,
        origin: flight.origin.code,
        dest: flight.destination.code,
        sched_dep_local: naiveLocal(flight.scheduledDeparture),
        answer,
      }),
    });
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * Retry reports that were saved locally but not accepted yet (at most `max` sends per call). Errors are ignored.
 * Entries whose flight left more than 30 days ago, and entries the API refuses with a 422, can never succeed:
 * `onGiveUp` is called for them so they leave the queue. The caller identifies the entry by `f.selfReport.answeredAt`.
 * Eligible entries are picked before `max` is applied, so stuck ones cannot starve the rest.
 */
export async function retryUnsentReports(
  flights: Flight[],
  send: (f: Flight, answer: SelfReportAnswer | null) => Promise<number>,
  onSent: (f: Flight, answer: SelfReportAnswer | null) => void,
  onGiveUp: (f: Flight) => void,
  max = 3,
  nowMs = Date.now()
): Promise<number> {
  const eligible: Flight[] = [];
  for (const f of flights) {
    if (!f.selfReport || f.selfReport.sent !== false) continue;
    if (nowMs - departureMs(f) > 30 * DAY) onGiveUp(f);
    else eligible.push(f);
  }
  const pending = eligible.slice(0, max);
  for (const f of pending) {
    const answer = f.selfReport!.answer;
    try {
      const status = await send(f, answer);
      if (status === 200) onSent(f, answer);
      else if (status === 422) onGiveUp(f);
    } catch {
      /* try again next time */
    }
  }
  return pending.length;
}

/** Editing the flight's identity makes an earlier answer describe a different flight. */
export function reportNeedsWithdrawal(before: Flight, after: Flight): boolean {
  return (
    !!before.selfReport &&
    (before.origin.code !== after.origin.code ||
      before.destination.code !== after.destination.code ||
      before.scheduledDeparture.slice(0, 16) !== after.scheduledDeparture.slice(0, 16) || // ignore a missing :00
      before.flightNumber !== after.flightNumber ||
      before.airline.code !== after.airline.code)
  );
}

export function reportErrorMessage(status: number): string {
  if (status === 401) return 'Please sign in again to send your answer.';
  if (status === 429) return "You've sent a lot of answers. Please try again later.";
  if (status === 422) return "We couldn't accept that answer for this flight.";
  if (status === 503) return 'Reports are temporarily unavailable. Please try again shortly.';
  return "Couldn't send your answer. Please try again.";
}
