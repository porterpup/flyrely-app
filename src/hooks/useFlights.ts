import { useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe } from '~/lib/flightStore';
import type { StoreSnapshot } from '~/lib/flightStore';
import { getSyncStatus } from '~/lib/syncEngine';
import type { SyncStatus } from '~/lib/syncEngine';

/** The signed-in user's flights and trips. Re-renders when a download lands or a local change is made. */
export function useFlights(): StoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const SERVER_STATUS: SyncStatus = { pending: 0, state: 'synced' };

/** Upload status for the Account screen. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, () => SERVER_STATUS);
}
