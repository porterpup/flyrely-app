import { flyrelyApi, buildPredictPayload, type PredictResponse } from '~/lib/api';
import { topReasons } from '~/lib/utils';
import { weatherFromPrediction } from '~/lib/weather';
import type { Flight } from '~/types';

/** The flight fields a /predict response fills in. One mapping, used by add, detail and Home. */
export function predictionFields(
  p: PredictResponse
): Pick<Flight, 'riskLevel' | 'delayProbability' | 'delayReason' | 'warnings' | 'delaySeverity' | 'weather'> {
  return {
    riskLevel: p.risk_level,
    delayProbability: p.delay_probability,
    delayReason: topReasons(p.risk_factors),
    warnings: p.warnings,
    delaySeverity: p.delay_severity ?? undefined,
    weather: weatherFromPrediction(p),
  };
}

/** Asks the model again and returns the flight with fresh prediction fields, stamped as checked now. */
export async function rescoreFlight(f: Flight): Promise<Flight> {
  const payload = buildPredictPayload(
    f.origin.code,
    f.destination.code,
    f.scheduledDeparture,
    f.airline.code,
    f.id,
    f.flightNumber
  );
  const prediction = await flyrelyApi.predict(payload);
  return { ...f, ...predictionFields(prediction), lastCheckedAt: Date.now() };
}

/** Copies only the prediction fields and check time onto the current saved flight, so edits made meanwhile survive. */
export function applyRescore(current: Flight, fresh: Flight): Flight {
  return {
    ...current,
    riskLevel: fresh.riskLevel,
    delayProbability: fresh.delayProbability,
    delayReason: fresh.delayReason,
    warnings: fresh.warnings,
    delaySeverity: fresh.delaySeverity,
    weather: fresh.weather,
    lastCheckedAt: fresh.lastCheckedAt,
  };
}

/**
 * Rescores due flights one at a time (at most `max`), ignoring errors. Calls `onRescored` with each fresh copy.
 * Returns how many flights were attempted.
 */
export async function refreshDueFlights(
  flights: Flight[],
  isDue: (f: Flight) => boolean,
  rescore: (f: Flight) => Promise<Flight>,
  onRescored: (f: Flight) => void,
  max = 3
): Promise<number> {
  const due = flights.filter(isDue).slice(0, max);
  for (const f of due) {
    try {
      onRescored(await rescore(f));
    } catch {
      // Keep the saved prediction; the next visit tries again.
    }
  }
  return due.length;
}
