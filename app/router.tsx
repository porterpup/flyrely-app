import { createRouter as createTanStackRouter, useRouter, useRouterState } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { ErrorState } from '~/components/ui';
import { RouteErrorView } from '~/components/RouteErrorView';
import { trackInAppHistory } from '~/lib/inAppHistory';
import { useOnline } from '~/hooks/useOnline';

// TanStack Router catches lazy-route chunk failures itself, so they never reach window-level handlers.
function RouteError({ error }: { error: unknown }) {
  const router = useRouter();
  const online = useOnline();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <RouteErrorView
      error={error}
      online={online}
      pathname={pathname}
      onReload={() => window.location.reload()}
      onHome={() => router.navigate({ to: '/' })}
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
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
  });
  trackInAppHistory(router.history);
  return router;
}

export const router = createRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
