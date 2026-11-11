import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header, Skeleton } from '~/components/ui';
import { FeedbackError, listFeedback, type FeedbackItem } from '~/lib/feedback';

export const Route = createFileRoute('/account/feedback')({
  component: FeedbackAdminScreen,
});

function FeedbackAdminScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listFeedback()
      .then(setItems)
      .catch((e) => {
        // Not an admin: this page is not for you, so go back to Account (sending feedback is on that screen).
        if (e instanceof FeedbackError && e.status === 403) {
          navigate({ to: '/account', replace: true });
          return;
        }
        setError('Could not load feedback');
      });
  }, [navigate]);

  return (
    <div className="app-container">
      <main className="screen">
        <Header title="Feedback" showBack onBackClick={() => navigate({ to: '/account' })} />
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
          {!items && !error && (
            <div className="space-y-3" role="status" aria-label="Loading">
              <Skeleton className="h-24 rounded-tile" />
              <Skeleton className="h-24 rounded-tile" />
              <Skeleton className="h-24 rounded-tile" />
            </div>
          )}
          {error && <div className="py-16 text-center text-status-error-text">{error}</div>}
          {items && items.length === 0 && <div className="py-16 text-center text-ink-caption opacity-70">No feedback yet</div>}
          {items?.map((it) => {
            const f = it.context?.flight;
            return (
              <article key={it.id} className="rounded-tile border border-surface-stroke bg-white p-4">
                <div className="flex items-center justify-between gap-2 text-body-sm text-ink-caption">
                  <span className="truncate font-medium">{it.email}</span>
                  <time dateTime={it.ts_utc}>{new Date(it.ts_utc).toLocaleString()}</time>
                </div>
                {it.category && <p className="mt-1 text-body-sm font-semibold text-primary-600">{it.category}</p>}
                <p className="mt-2 whitespace-pre-wrap text-body-md text-ink">{it.message}</p>
                {it.context && (
                  <p className="mt-2 break-words text-body-sm text-ink-caption opacity-70">
                    {it.context.route}
                    {f && ` · ${f.airline ?? ''}${f.flight_number ?? ''} ${f.origin ?? ''}→${f.destination ?? ''}`}
                    {f?.delay_probability != null && ` · ${Math.round(f.delay_probability * 100)}% ${f.risk_level ?? ''}`}
                    {it.context.app_version && ` · ${it.context.app_version}`}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
