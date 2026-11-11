// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('~/components/layout', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

import { RouteErrorView, isTabRoute } from '../RouteErrorView';

afterEach(cleanup);

const err = new TypeError("Cannot read properties of undefined (reading 'component')");
const setup = (online: boolean, pathname = '/explore') => {
  const onReload = vi.fn();
  render(<RouteErrorView error={err} online={online} pathname={pathname} onReload={onReload} onHome={() => {}} />);
  return onReload;
};

describe('RouteErrorView', () => {
  it('offline: shows the offline message and Try again does not reload', () => {
    const onReload = setup(false);
    expect(screen.getByText("You're offline")).toBeTruthy();
    const retry = screen.getByRole('button', { name: /try again/i }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    fireEvent.click(retry);
    expect(onReload).not.toHaveBeenCalled();
  });

  it('online: Try again reloads the page', () => {
    const onReload = setup(true);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('keeps the shell (tab bar and offline banner) on tab routes only', () => {
    setup(false, '/explore');
    expect(screen.getByTestId('shell')).toBeTruthy();
    cleanup();
    setup(false, '/flights/abc');
    expect(screen.queryByTestId('shell')).toBeNull();
    expect(isTabRoute('/trips/')).toBe(true);
    expect(isTabRoute('/trips/abc')).toBe(false);
  });
});
