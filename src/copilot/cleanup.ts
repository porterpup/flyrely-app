import { clearFlightPrefs } from './prefs';
import { disablePush } from './push';

/**
 * A flight was edited or removed: drop its saved copilot state and, best-effort, its push watch.
 * Never throws; callers gate this on COPILOT_ENABLED.
 */
export async function releaseFlightCopilot(flightId: string): Promise<void> {
  try {
    clearFlightPrefs(flightId);
  } catch {
    // storage blocked: nothing to clear
  }
  try {
    await disablePush(flightId); // unsubscribePush with the stored watch_id
  } catch {
    // best-effort: the server expires stale watches itself
  }
}
