import { useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe } from '~/lib/flightStore';
import type { StoreSnapshot } from '~/lib/flightStore';
import { getSyncStatus } from '~/lib/syncEngine';
import type { SyncStatus } from '~/lib/syncEngine';

/** The signed-in user's flights and trips. Re-renders when a download lands or a local change is made. */
export function useFlights(): StoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Upload status for the Account screen. The server snapshot is the same object the client starts with, so React sees
 * no difference during hydration (a separate constant object made it re-render early: minified React error #421).
 */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, getSyncStatus);
}
