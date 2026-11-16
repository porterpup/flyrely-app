// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const navigate = vi.fn();
const back = vi.fn();
let canGoBack = true;
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouter: () => ({ history: { back } }),
}));
vi.mock('~/lib/inAppHistory', () => ({ canGoBackInApp: () => canGoBack }));

import { useGoBack } from '../useGoBack';

describe('useGoBack', () => {
  it('steps back when the previous entry is in this app', () => {
    canGoBack = true;
    renderHook(() => useGoBack('/trips')).result.current();
    expect(back).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('replaces with the fallback when there is no in-app entry to go back to', () => {
    canGoBack = false;
    back.mockClear();
    renderHook(() => useGoBack('/trips')).result.current();
    expect(back).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/trips', replace: true });
  });
});
