import { useCallback } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';

/**
 * Header back action: step back through history when there is a previous page in this tab,
 * otherwise (e.g. the page was opened directly) navigate to `fallback`.
 */
export function useGoBack(fallback: string) {
  const router = useRouter();
  const navigate = useNavigate();
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: fallback });
    }
  }, [router, navigate, fallback]);
}
