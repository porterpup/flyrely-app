import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Meta, Scripts } from '@tanstack/start';
import { AuthProvider } from '~/context/AuthContext';
import { CopilotBootstrap, copilotHeadLinks } from '~/copilot/CopilotHead';
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
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'FlyRely — Know before delays happen' },
      {
        name: 'description',
        content: 'AI-powered flight delay predictions. Stay ahead of delays before they happen.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: globalsCss },
      ...copilotHeadLinks(),
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
            <div className="min-h-screen bg-navy-50">
              <Outlet />
            </div>
          </AuthProvider>
        </QueryClientProvider>
        <CopilotBootstrap />
        <Scripts />
      </body>
    </html>
  );
}
