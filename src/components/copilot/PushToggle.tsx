import { useCallback, useEffect, useState } from 'react';
import type { Flight } from '~/types';
import {
  disablePush,
  enablePush,
  getPushEnvironment,
  getPushStatus,
  registerServiceWorker,
} from '~/copilot/push';
import type { PushEnvironment, PushStatus } from '~/copilot/push';
import { IosInstallHelp } from './IosInstallHelp';
import { PushPermissionPrompt } from './PushPermissionPrompt';

export interface PushToggleProps {
  flight: Flight;
  onDark?: boolean;
  className?: string;
}

const ERRORS = {
  unavailable: 'Alerts are not available right now. Try again later.',
  limit: 'You have reached the limit of flight alerts on this device.',
  unsupported: "This browser can't send alerts.",
  error: "Couldn't turn on alerts. Check your connection and try again.",
} as const;

/**
 * "Alert me" for one flight. The browser permission is requested only from the tap. On iPhone in a
 * Safari tab it shows Add to Home Screen help instead, and renders nothing where push is unsupported.
 * Callers mount it only behind COPILOT_PUSH_ENABLED.
 */
export function PushToggle({ flight, onDark = true, className }: PushToggleProps) {
  const [env, setEnv] = useState<PushEnvironment | null>(null);
  const [status, setStatus] = useState<PushStatus>('prompt');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Browser checks run after mount so the server and first client render match (both render nothing).
  useEffect(() => {
    const e = getPushEnvironment();
    setEnv(e);
    setError(null);
    if (e !== 'ready') return;
    let live = true;
    void registerServiceWorker();
    void getPushStatus(flight.id).then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, [flight.id]);

  const onEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await enablePush(flight);
    if (result.ok) setStatus('enabled');
    else if (result.reason === 'denied') setStatus('denied');
    else setError(ERRORS[result.reason]);
    setBusy(false);
  }, [busy, flight]);

  const onDisable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (await disablePush(flight.id)) setStatus('prompt');
    else setError(ERRORS.error);
    setBusy(false);
  }, [busy, flight.id]);

  if (env === null || env === 'unsupported') return null;
  if (env === 'ios_needs_install') return <IosInstallHelp onDark={onDark} className={className} />;

  return (
    <div className={className}>
      <PushPermissionPrompt status={status} onEnable={() => void onEnable()} onDisable={() => void onDisable()} onDark={onDark} />
      {error && (
        <p role="alert" className={onDark ? 'mt-2 text-body-md text-white' : 'mt-2 text-body-md text-ink'}>
          {error}
        </p>
      )}
    </div>
  );
}
