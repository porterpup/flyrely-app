// react-query hooks for the copilot API. A 404 from /copilot/* means the API has the copilot
// flag off, so these never retry it and the panel hides itself.
import { useQuery } from '@tanstack/react-query';
import type { Flight } from '~/types';
import { CopilotApiError, getCopilotConfig, getCopilotOptions, getCopilotStatus, toFlightRef } from './api';
import type { CopilotState, OptionsRequest } from './types';

/** Narrow the API's status_source: anything unexpected means "no live status". */
export function statusSourceOrNone(value: unknown): 'none' | 'swim' {
  return value === 'swim' ? 'swim' : 'none';
}

export function isNotFound(error: unknown): boolean {
  return error instanceof CopilotApiError && error.status === 404;
}

// 404 = API flag off; 422 = the request itself is invalid. Neither is worth retrying.
const retryOnce = (failureCount: number, error: unknown) =>
  !(error instanceof CopilotApiError && (error.status === 404 || error.status === 422)) && failureCount < 1;

export function useCopilotConfig() {
  return useQuery({
    queryKey: ['copilot', 'config'],
    queryFn: getCopilotConfig,
    staleTime: 10 * 60 * 1000,
    retry: retryOnce,
    retryDelay: 800,
  });
}

export interface OptionsInput {
  flight: Flight;
  state: CopilotState;
  rebooked: 'today' | 'later' | null;
  homeAirport: string | null;
  enabled: boolean;
}

export function useCopilotOptions({ flight, state, rebooked, homeAirport, enabled }: OptionsInput) {
  const body: OptionsRequest = {
    flight: toFlightRef(flight),
    state,
    rebooked: state === 'rebooked' ? rebooked : null,
    ...(homeAirport ? { home_airport: homeAirport } : {}),
  };
  return useQuery({
    queryKey: ['copilot', 'options', body],
    queryFn: () => getCopilotOptions(body),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: retryOnce,
    retryDelay: 800,
  });
}

const STATUS_POLL_MS = 10 * 60 * 1000;

/** Polls /copilot/status at most every 10 minutes. Only call with enabled=true when the source is not "none". */
export function useCopilotStatus(flight: Flight, enabled: boolean) {
  const ref = toFlightRef(flight);
  return useQuery({
    queryKey: ['copilot', 'status', ref],
    queryFn: () => getCopilotStatus({ flight: ref }),
    enabled,
    staleTime: STATUS_POLL_MS,
    refetchInterval: STATUS_POLL_MS,
    retry: false,
  });
}
