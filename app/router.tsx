import { useEffect } from 'react';
import { createRouter as createTanStackRouter, useRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { ErrorState } from '~/components/ui';
import { isChunkLoadError, recoverFromStaleChunk } from '../src/lib/reloadGuard';

// TanStack Router catches lazy-route chunk failures itself, so they never reach window-level handlers.
// A stale chunk after a redeploy gets the same one-time reload; anything else shows a recoverable error.
function RouteError({ error }: { error: unknown }) {
  const router = useRouter();
  // Offline, a chunk that fails to load is the network, not a new deploy: show the offline state, don't reload.
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const stale = !offline && isChunkLoadError(error);
  useEffect(() => {
    if (stale) recoverFromStaleChunk();
  }, [stale]);
  if (stale) {
    return (
      <ErrorState
        type="generic"
        title="Updating FlyRely"
        message="A new version is available. Reloading…"
        onAction={() => window.location.reload()}
        actionLabel="Reload now"
      />
    );
  }
  if (offline) {
    return (
      <ErrorState
        type="network"
        title="You're offline"
        message="You're offline. We'll show your saved flights when you're back online."
        onRetry={() => router.invalidate()}
        onAction={() => router.navigate({ to: '/' })}
        actionLabel="Go home"
      />
    );
  }
  return (
    <ErrorState
      type="generic"
      title="Something went wrong"
      onRetry={() => router.invalidate()}
      onAction={() => router.navigate({ to: '/' })}
      actionLabel="Go home"
    />
  );
}

function NotFound() {
  const router = useRouter();
  return (
    <ErrorState
      type="not_found"
      title="Page not found"
      message="That page doesn't exist or has moved."
      onAction={() => router.navigate({ to: '/' })}
      actionLabel="Go home"
    />
  );
}

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
  });
}

export const router = createRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
