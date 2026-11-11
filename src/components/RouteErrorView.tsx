import { useEffect } from 'react';
import { ErrorState } from '~/components/ui';
import { AppShell } from '~/components/layout';
import { isChunkLoadError, recoverFromStaleChunk } from '~/lib/reloadGuard';

export const TAB_ROUTES = ['/', '/trips', '/explore', '/account'];

/** True for the four tab screens, where the tab bar stays visible even when the screen fails to load. */
export function isTabRoute(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return TAB_ROUTES.includes(p);
}

interface RouteErrorViewProps {
  error: unknown;
  online: boolean;
  pathname: string;
  /** Full page reload: the router keeps a failed lazy module, so only a reload really recovers. */
  onReload: () => void;
  onHome: () => void;
}

/**
 * The router's error screen. Offline: says so, and "Try again" waits until the connection is back (reloading offline
 * would land on the browser's error page). Online: "Try again" reloads the page.
 */
export function RouteErrorView({ error, online, pathname, onReload, onHome }: RouteErrorViewProps) {
  const stale = online && isChunkLoadError(error);
  useEffect(() => {
    if (stale) recoverFromStaleChunk();
  }, [stale]);

  const state = stale ? (
    <ErrorState
      type="generic"
      title="Updating FlyRely"
      message="A new version is available. Reloading…"
      onAction={onReload}
      actionLabel="Reload now"
    />
  ) : (
    <ErrorState
      type={online ? 'generic' : 'network'}
      title={online ? 'Something went wrong' : "You're offline"}
      message={online ? undefined : "You're offline. We'll show your saved flights when you're back online."}
      onRetry={onReload}
      retryDisabled={!online}
      onAction={onHome}
      actionLabel="Go home"
    />
  );
  return isTabRoute(pathname) ? <AppShell>{state}</AppShell> : state;
}
