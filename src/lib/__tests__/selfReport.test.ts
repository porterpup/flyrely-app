import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installMemStorage, makeFlight } from './memStorage';

describe('setSelfReport / markReportSent', () => {
  let fs: typeof import('../flightStore');
  beforeEach(async () => {
    installMemStorage({ 'flyrely_cache:u1': JSON.stringify({ flights: [makeFlight({ id: 'f1' })], trips: [] }) });
    fs = await import('../flightStore');
    fs.setActiveUser('u1');
  });
  afterEach(() => {
    fs.setActiveUser(null);
    vi.useRealTimers();
  });
  const at = () => fs.getFlightById('f1')!.selfReport!.answeredAt;

  it('setSelfReport stores an unsent answer', () => {
    fs.setSelfReport('f1', 'late_15_44');
    expect(fs.getFlightById('f1')?.selfReport).toMatchObject({ answer: 'late_15_44', sent: false });
  });

  it('withdrawing with no report does nothing', () => {
    fs.setSelfReport('f1', null);
    expect(fs.getFlightById('f1')?.selfReport).toBeUndefined();
  });

  it('markReportSent flags the matching answer as sent', () => {
    fs.setSelfReport('f1', 'on_time');
    fs.markReportSent('f1', at());
    expect(fs.getFlightById('f1')?.selfReport?.sent).toBe(true);
  });

  it('markReportSent ignores a stale answer', () => {
    fs.setSelfReport('f1', 'on_time');
    const first = at();
    fs.setSelfReport('f1', 'cancelled');
    fs.markReportSent('f1', first);
    expect(fs.getFlightById('f1')?.selfReport).toMatchObject({ answer: 'cancelled', sent: false });
  });

  it('A, Undo, A: the first A\'s 200 does not mark the second A as sent (even in the same millisecond)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z'));
    fs.setSelfReport('f1', 'on_time');
    const firstA = at();
    fs.setSelfReport('f1', null);
    fs.setSelfReport('f1', 'on_time');
    expect(at()).not.toBe(firstA);
    fs.markReportSent('f1', firstA);
    expect(fs.getFlightById('f1')?.selfReport).toMatchObject({ answer: 'on_time', sent: false });
    fs.markReportSent('f1', at());
    expect(fs.getFlightById('f1')?.selfReport?.sent).toBe(true);
  });

  it('a sent withdrawal removes selfReport', () => {
    fs.setSelfReport('f1', 'on_time');
    fs.setSelfReport('f1', null);
    expect(fs.getFlightById('f1')?.selfReport?.answer).toBeNull();
    fs.markReportSent('f1', at());
    expect(fs.getFlightById('f1')?.selfReport).toBeUndefined();
    expect('selfReport' in (fs.getFlightById('f1') ?? {})).toBe(false);
  });

  it('neither overwrites a concurrent change', () => {
    fs.setSelfReport('f1', 'on_time');
    fs.saveFlight({ ...fs.getFlightById('f1')!, status: 'completed' });
    fs.setSelfReport('f1', 'cancelled');
    expect(fs.getFlightById('f1')?.status).toBe('completed');
    fs.saveFlight({ ...fs.getFlightById('f1')!, riskLevel: 'high' });
    fs.markReportSent('f1', at());
    expect(fs.getFlightById('f1')).toMatchObject({ status: 'completed', riskLevel: 'high', selfReport: { sent: true } });
    fs.setSelfReport('f1', null);
    fs.saveFlight({ ...fs.getFlightById('f1')!, status: 'cancelled' });
    fs.markReportSent('f1', at());
    expect(fs.getFlightById('f1')).toMatchObject({ status: 'cancelled' });
  });

  it('markReportSent and markReportRejected return quietly when signed out', () => {
    fs.setSelfReport('f1', 'on_time');
    const a = at();
    fs.setActiveUser(null);
    expect(() => fs.markReportSent('f1', a)).not.toThrow();
    expect(() => fs.markReportRejected('f1', a)).not.toThrow();
  });

  it('markReportRejected stops retries (sent + rejected), or removes a withdrawal', () => {
    fs.setSelfReport('f1', 'on_time');
    fs.markReportRejected('f1', at());
    expect(fs.getFlightById('f1')?.selfReport).toMatchObject({ answer: 'on_time', sent: true, rejected: true });
    fs.setSelfReport('f1', null);
    fs.markReportRejected('f1', at());
    expect(fs.getFlightById('f1')?.selfReport).toBeUndefined();
  });

  describe('withdrawSelfReport (flight edited)', () => {
    it('queues a withdrawal for an answer the server has', () => {
      fs.setSelfReport('f1', 'on_time');
      fs.markReportSent('f1', at());
      fs.withdrawSelfReport('f1');
      expect(fs.getFlightById('f1')?.selfReport).toMatchObject({ answer: null, sent: false });
    });
    it('removes a never-sent answer locally, with nothing queued', () => {
      fs.setSelfReport('f1', 'on_time');
      fs.withdrawSelfReport('f1');
      expect(fs.getFlightById('f1')?.selfReport).toBeUndefined();
    });
    it('removes a rejected answer locally', () => {
      fs.setSelfReport('f1', 'on_time');
      fs.markReportRejected('f1', at());
      fs.withdrawSelfReport('f1');
      expect(fs.getFlightById('f1')?.selfReport).toBeUndefined();
    });
  });
});
