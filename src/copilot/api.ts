// Client for the /copilot API (plan §4). Separate from src/lib/api.ts on purpose: copilot
// state and errors stay inside src/copilot/. A 404 means the API has the copilot flag off;
// callers (the panel, S-P4) treat that as "hide the card".
import type { Flight } from '~/types';
import { API_BASE_URL } from '~/lib/api';
import type {
  CopilotConfig,
  FlightRef,
  OptionsRequest,
  OptionsResponse,
  PushSubscribeRequest,
  PushSubscribeResponse,
  PushUnsubscribeRequest,
  PushUnsubscribeResponse,
  StatusRequest,
  StatusResponse,
} from './types';

export class CopilotApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`copilot API responded ${status}`);
    this.name = 'CopilotApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}/copilot${path}`, init);
  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      // Non-JSON error body (e.g. a proxy page). Keep status only.
    }
    throw new CopilotApiError(res.status, parsed);
  }
  return (await res.json()) as T;
}

/**
 * The app stores departures as airport-local ISO without an offset ("2026-11-15T14:30:00",
 * built in add.tsx and edit.tsx). The API wants exactly that. Normalise older shapes: pad
 * "YYYY-MM-DDTHH:MM" with seconds, and drop fractional seconds and any Z/offset suffix.
 */
export function toLocalIso(value: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!m) return value;
  return `${m[1]}T${m[2]}:${m[3]}:${m[4] ?? '00'}`;
}

/** Map the app's Flight to the API's FlightRef. */
export function toFlightRef(flight: Flight): FlightRef {
  return {
    airline: flight.airline.code,
    flight_number: flight.flightNumber,
    origin: flight.origin.code.toUpperCase(),
    destination: flight.destination.code.toUpperCase(),
    departure_time: toLocalIso(flight.scheduledDeparture),
  };
}

export function getCopilotConfig(): Promise<CopilotConfig> {
  return request<CopilotConfig>('GET', '/config');
}

export function getCopilotOptions(body: OptionsRequest): Promise<OptionsResponse> {
  return request<OptionsResponse>('POST', '/options', body);
}

export function getCopilotStatus(body: StatusRequest): Promise<StatusResponse> {
  return request<StatusResponse>('POST', '/status', body);
}

export function subscribePush(body: PushSubscribeRequest): Promise<PushSubscribeResponse> {
  return request<PushSubscribeResponse>('POST', '/push/subscribe', body);
}

export function unsubscribePush(body: PushUnsubscribeRequest): Promise<PushUnsubscribeResponse> {
  return request<PushUnsubscribeResponse>('POST', '/push/unsubscribe', body);
}
