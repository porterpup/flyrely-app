import { describe, it, expect, vi } from 'vitest';
import {
  REPORT_OPTIONS,
  pickHomePrompt,
  reportEligibility,
  reportErrorMessage,
  reportNeedsWithdrawal,
  retryUnsentReports,
  sendReport,
  showOnHome,
} from '../flightReport';
import { makeFlight } from './memStorage';
import type { Flight } from '~/types';

const utc = (s: string) => Date.parse(s);
const DAY = 24 * 3600_000;

// SFO 20:00 PDT on 2026-06-10 = 03:00Z; lands JFK 04:30 EDT on 06-11 = 08:30Z. Ask from 09:30Z.
const redEye = (extra: Partial<Flight> = {}) =>
  makeFlight({
    origin: { code: 'SFO', name: 'SFO', city: 'SFO' },
    destination: { code: 'JFK', name: 'JFK', city: 'JFK' },
    scheduledDeparture: '2026-06-10T20:00:00',
    scheduledArrivalLocal: '2026-06-11T04:30:00',
    delayProbability: 0.3,
    ...extra,
  });

describe('REPORT_OPTIONS', () => {
  it('has the exact labels', () => {
    expect(REPORT_OPTIONS.map((o) => o.label)).toEqual([
      'On time (under 15 min late)',
      '15–44 min late',
      '45 min to 2 h late',
      'Over 2 h late',
      'Cancelled',
      "I didn't take this flight",
    ]);
  });
});

describe('reportEligibility', () => {
  it('is no_prediction without a delayProbability', () => {
    expect(reportEligibility(redEye({ delayProbability: undefined }), utc('2026-06-11T12:00:00Z'))).toBe('no_prediction');
  });
  it('asks one hour after arrival in the destination zone, whatever the phone zone', () => {
    const f = redEye();
    expect(reportEligibility(f, utc('2026-06-11T09:29:00Z'))).toBe('too_early');
    expect(reportEligibility(f, utc('2026-06-11T09:30:00Z'))).toBe('ask');
  });
  it('handles a DST date (spring forward at the destination)', () => {
    // SFO 22:00 PST 03-07 = 06:00Z; JFK 03:30 EDT 03-08 = 07:30Z; ask from 08:30Z.
    const f = redEye({ scheduledDeparture: '2026-03-07T22:00:00', scheduledArrivalLocal: '2026-03-08T03:30:00' });
    expect(reportEligibility(f, utc('2026-03-08T08:29:00Z'))).toBe('too_early');
    expect(reportEligibility(f, utc('2026-03-08T08:30:00Z'))).toBe('ask');
  });
  it('never asks before departure plus one hour, even with a bad arrival time', () => {
    // Departs 03:00Z; the manual arrival (00:00Z) is before that.
    const f = redEye({ scheduledArrivalLocal: '2026-06-10T20:00:00' });
    expect(reportEligibility(f, utc('2026-06-11T03:59:00Z'))).toBe('too_early');
    expect(reportEligibility(f, utc('2026-06-11T04:00:00Z'))).toBe('ask');
  });
  it('falls back to departure + 5 h without an arrival time', () => {
    const f = redEye({ scheduledArrivalLocal: undefined });
    expect(reportEligibility(f, utc('2026-06-11T07:59:00Z'))).toBe('too_early');
    expect(reportEligibility(f, utc('2026-06-11T08:00:00Z'))).toBe('ask');
  });
  it('is answered once an answer is set, but a withdrawal asks again', () => {
    const now = utc('2026-06-12T00:00:00Z');
    expect(reportEligibility(redEye({ selfReport: { answer: 'on_time', answeredAt: 'x', sent: true } }), now)).toBe('answered');
    expect(reportEligibility(redEye({ selfReport: { answer: null, answeredAt: 'x', sent: false } }), now)).toBe('ask');
  });
  it('is too_old after 30 days', () => {
    const dep = utc('2026-06-11T03:00:00Z');
    expect(reportEligibility(redEye(), dep + 30 * DAY)).toBe('ask');
    expect(reportEligibility(redEye(), dep + 30 * DAY + 1)).toBe('too_old');
  });
});

describe('showOnHome / pickHomePrompt', () => {
  const dep = utc('2026-06-11T03:00:00Z');
  it('shows up to 7 days after departure', () => {
    expect(showOnHome(redEye(), dep + 7 * DAY)).toBe(true);
    expect(showOnHome(redEye(), dep + 7 * DAY + 1)).toBe(false);
  });
  it('hides a dismissed prompt', () => {
    expect(showOnHome(redEye({ reportPromptDismissed: true }), dep + DAY)).toBe(false);
  });
  it('returns only the most recent eligible flight', () => {
    const older = redEye({ id: 'older', scheduledDeparture: '2026-06-08T20:00:00', scheduledArrivalLocal: '2026-06-09T04:30:00' });
    const newer = redEye({ id: 'newer' });
    const early = redEye({ id: 'future', scheduledDeparture: '2026-06-20T20:00:00', scheduledArrivalLocal: '2026-06-21T04:30:00' });
    expect(pickHomePrompt([older, newer, early], dep + DAY)?.id).toBe('newer');
    expect(pickHomePrompt([early], dep + DAY)).toBeNull();
  });
});

describe('sendReport', () => {
  const ok = () => vi.fn().mockResolvedValue({ status: 200 });
  it('posts the contract payload with a bearer token', async () => {
    const fetchImpl = ok();
    const status = await sendReport(redEye({ scheduledDeparture: '2026-06-10T20:00' }), 'late_15_44', fetchImpl as unknown as typeof fetch, async () => 'tok');
    expect(status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toMatch(/\/flight-reports$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({
      flight_id: 'flight-1',
      airline: 'UA',
      flight_number: 'UA648',
      origin: 'SFO',
      dest: 'JFK',
      sched_dep_local: '2026-06-10T20:00:00',
      answer: 'late_15_44',
    });
  });
  it('sends answer: null to withdraw', async () => {
    const fetchImpl = ok();
    await sendReport(redEye(), null, fetchImpl as unknown as typeof fetch, async () => 't');
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).answer).toBeNull();
  });
  it('returns the status for errors, 0 for network failure, 401 without a token', async () => {
    const f = redEye();
    expect(await sendReport(f, 'on_time', vi.fn().mockResolvedValue({ status: 429 }) as unknown as typeof fetch, async () => 't')).toBe(429);
    expect(await sendReport(f, 'on_time', vi.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch, async () => 't')).toBe(0);
    expect(await sendReport(f, 'on_time', ok() as unknown as typeof fetch, async () => { throw new Error('x'); })).toBe(401);
  });
});

describe('retryUnsentReports', () => {
  const NOW = utc('2026-06-12T12:00:00Z');
  const unsent = (id: string, extra: Partial<Flight> = {}) =>
    redEye({ id, selfReport: { answer: 'on_time', answeredAt: 'x', sent: false }, ...extra });
  const old = (id: string, answer: 'on_time' | null = 'on_time') =>
    unsent(id, { scheduledDeparture: '2026-04-01T20:00:00', selfReport: { answer, answeredAt: 'x', sent: false } });
  it('sends at most 3 unsent entries and skips sent ones', async () => {
    const flights = [unsent('a'), unsent('b'), redEye({ id: 's', selfReport: { answer: 'on_time', answeredAt: 'x', sent: true } }), unsent('c'), unsent('d')];
    const send = vi.fn().mockResolvedValue(200);
    const onSent = vi.fn();
    await retryUnsentReports(flights, send, onSent, vi.fn(), 3, NOW);
    expect(send).toHaveBeenCalledTimes(3);
    expect(onSent.mock.calls.map((c) => c[0].id)).toEqual(['a', 'b', 'c']);
  });
  it('swallows errors and does not mark failures as sent', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(503);
    const onSent = vi.fn();
    const onGiveUp = vi.fn();
    await expect(retryUnsentReports([unsent('a'), unsent('b')], send, onSent, onGiveUp, 3, NOW)).resolves.toBe(2);
    expect(onSent).not.toHaveBeenCalled();
    expect(onGiveUp).not.toHaveBeenCalled();
  });
  it('drops entries for flights over 30 days old without sending, and they do not use up max', async () => {
    const send = vi.fn().mockResolvedValue(200);
    const onSent = vi.fn();
    const onGiveUp = vi.fn();
    const flights = [old('o1'), old('o2', null), old('o3'), old('o4'), unsent('a'), unsent('b')];
    await retryUnsentReports(flights, send, onSent, onGiveUp, 2, NOW);
    expect(onGiveUp.mock.calls.map((c) => c[0].id)).toEqual(['o1', 'o2', 'o3', 'o4']);
    expect(send.mock.calls.map((c) => c[0].id)).toEqual(['a', 'b']);
  });
  it('gives up on a 422 and keeps going with the rest', async () => {
    const send = vi.fn().mockResolvedValueOnce(422).mockResolvedValueOnce(200);
    const onSent = vi.fn();
    const onGiveUp = vi.fn();
    await retryUnsentReports([unsent('a'), unsent('b')], send, onSent, onGiveUp, 3, NOW);
    expect(onGiveUp.mock.calls.map((c) => c[0].id)).toEqual(['a']);
    expect(onSent.mock.calls.map((c) => c[0].id)).toEqual(['b']);
  });
});

describe('reportNeedsWithdrawal', () => {
  const answered = redEye({ selfReport: { answer: 'on_time', answeredAt: 'x', sent: false } });
  it('is false without a report or without a change', () => {
    expect(reportNeedsWithdrawal(redEye(), { ...redEye(), flightNumber: 'UA1' })).toBe(false);
    expect(reportNeedsWithdrawal(answered, { ...answered, scheduledDeparture: '2026-06-10T20:00' })).toBe(false);
  });
  it('is true when route, time, flight number or airline changes', () => {
    expect(reportNeedsWithdrawal(answered, { ...answered, origin: { ...answered.origin, code: 'OAK' } })).toBe(true);
    expect(reportNeedsWithdrawal(answered, { ...answered, destination: { ...answered.destination, code: 'EWR' } })).toBe(true);
    expect(reportNeedsWithdrawal(answered, { ...answered, scheduledDeparture: '2026-06-10T21:00:00' })).toBe(true);
    expect(reportNeedsWithdrawal(answered, { ...answered, flightNumber: 'UA649' })).toBe(true);
    expect(reportNeedsWithdrawal(answered, { ...answered, airline: { code: 'DL', name: 'Delta' } })).toBe(true);
  });
});

describe('sendReport ordering', () => {
  const body = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body).answer;
  it('starts a later send for the same flight only after the earlier one finishes', async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const fetchImpl = vi.fn(async (_u: unknown, init: { body: string }) => {
      const a = JSON.parse(init.body).answer;
      order.push(`start ${a}`);
      if (a === 'on_time') await new Promise<void>((r) => (releaseFirst = r));
      order.push(`end ${a}`);
      return { status: 200 } as Response;
    });
    const f = redEye({ id: 'ord' });
    const first = sendReport(f, 'on_time', fetchImpl as unknown as typeof fetch, async () => 't');
    const second = sendReport(f, null, fetchImpl as unknown as typeof fetch, async () => 't');
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(['start on_time']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['start on_time', 'end on_time', 'start null', 'end null']);
    expect(fetchImpl.mock.calls.map(body)).toEqual(['on_time', null]);
  });
  it('does not block other flights, and a failed send does not block the next one', async () => {
    const f1 = redEye({ id: 'x1' });
    const f2 = redEye({ id: 'x2' });
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue({ status: 200 });
    const t = async () => 't';
    const a = sendReport(f1, 'on_time', fetchImpl as unknown as typeof fetch, t);
    const b = sendReport(f1, null, fetchImpl as unknown as typeof fetch, t);
    const c = sendReport(f2, 'cancelled', fetchImpl as unknown as typeof fetch, t);
    expect(await Promise.all([a, b, c])).toEqual([0, 200, 200]);
  });
});

describe('reportErrorMessage', () => {
  it('has a message per status', () => {
    for (const s of [0, 401, 422, 429, 503]) expect(reportErrorMessage(s).length).toBeGreaterThan(10);
  });
});
