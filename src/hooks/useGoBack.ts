import { useCallback } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { canGoBackInApp } from '~/lib/inAppHistory';

/**
 * Header back action: step back only when the previous history entry belongs to this app
 * (tracked by `trackInAppHistory`), otherwise navigate to `fallback`, replacing
 * the current entry so Back cannot bounce between the two.
 */
export function useGoBack(fallback: string) {
  const router = useRouter();
  const navigate = useNavigate();
  return useCallback(() => {
    if (canGoBackInApp(router.history)) {
      router.history.back();
    } else {
      navigate({ to: fallback, replace: true });
    }
  }, [router, navigate, fallback]);
}
