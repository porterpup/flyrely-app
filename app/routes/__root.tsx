import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Meta, Scripts } from '@tanstack/start';
import { AuthProvider } from '~/context/AuthContext';
import { AuthGate } from '~/components/AuthGate';
import { FeedbackHost } from '~/components/feedback';
import { LegacyImportModal, SyncNotices } from '~/components/LegacyImportModal';
import { CopilotBootstrap, pwaHeadLinks, pwaMeta } from '~/copilot/CopilotHead';
import globalsCss from '~/styles/globals.css?url';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'FlyRely — Know before delays happen' },
      ...pwaMeta(),
      {
        name: 'description',
        content: 'AI-powered flight delay predictions. Stay ahead of delays before they happen.',
      },
    ],
    links: [
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: '/fonts/inter-latin-wght-normal.woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: globalsCss },
      ...pwaHeadLinks(),
    ],
  }),
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="min-h-dvh bg-navy-50">
              <AuthGate>
                <Outlet />
                <FeedbackHost />
                <LegacyImportModal />
                <SyncNotices />
              </AuthGate>
            </div>
          </AuthProvider>
        </QueryClientProvider>
        <CopilotBootstrap />
        <Scripts />
      </body>
    </html>
  );
}
