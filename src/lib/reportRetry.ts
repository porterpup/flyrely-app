import { markReportRejected, markReportSent } from '~/lib/flightStore';
import { retryUnsentReports, sendReport } from '~/lib/flightReport';
import type { Flight } from '~/types';

/** Resend queued answers and withdrawals for these flights, and drop the ones that can never be accepted. Errors are ignored. */
export function retryQueuedReports(flights: Flight[]): Promise<number> {
  return retryUnsentReports(
    flights,
    (f, answer) => sendReport(f, answer),
    (f) => markReportSent(f.id, f.selfReport!.answeredAt),
    (f) => markReportRejected(f.id, f.selfReport!.answeredAt)
  );
}
