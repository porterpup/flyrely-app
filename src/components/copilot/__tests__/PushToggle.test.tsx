// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { highRiskFlight } from '~/copilot/__tests__/fixtures';

const push = vi.hoisted(() => ({
  env: 'ready' as string,
  getPushEnvironment: vi.fn(),
  getPushStatus: vi.fn(async () => 'prompt'),
  enablePush: vi.fn(),
  disablePush: vi.fn(async () => true),
  registerServiceWorker: vi.fn(async () => null),
}));
vi.mock('~/copilot/push', () => push);

import { PushToggle } from '../PushToggle';

describe('PushToggle', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing where push is unsupported', async () => {
    push.getPushEnvironment.mockReturnValue('unsupported');
    const { container } = render(<PushToggle flight={highRiskFlight} />);
    await waitFor(() => expect(push.getPushEnvironment).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('shows Add to Home Screen help on iOS Safari and never asks for permission', async () => {
    push.getPushEnvironment.mockReturnValue('ios_needs_install');
    render(<PushToggle flight={highRiskFlight} />);
    expect(await screen.findByText('Add FlyRely to your Home Screen to get alerts')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Alert me' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show me how' }));
    expect(screen.getByText(/Add to Home Screen", then tap Add/)).toBeTruthy();
    expect(push.enablePush).not.toHaveBeenCalled();
  });

  it('requests permission only on tap, then shows enabled', async () => {
    push.getPushEnvironment.mockReturnValue('ready');
    push.enablePush.mockResolvedValue({ ok: true });
    render(<PushToggle flight={highRiskFlight} />);
    const btn = await screen.findByRole('button', { name: 'Alert me' });
    expect(push.enablePush).not.toHaveBeenCalled();
    fireEvent.click(btn);
    expect(await screen.findByText('Alerts are on')).toBeTruthy();
    expect(push.enablePush).toHaveBeenCalledWith(highRiskFlight);
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    await waitFor(() => expect(push.disablePush).toHaveBeenCalledWith('flight-1'));
    expect(await screen.findByRole('button', { name: 'Alert me' })).toBeTruthy();
  });

  it('shows blocked state when the user denies', async () => {
    push.getPushEnvironment.mockReturnValue('ready');
    push.enablePush.mockResolvedValue({ ok: false, reason: 'denied' });
    render(<PushToggle flight={highRiskFlight} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Alert me' }));
    expect(await screen.findByText('Notifications are blocked')).toBeTruthy();
  });

  it('shows an error message when the API is unavailable', async () => {
    push.getPushEnvironment.mockReturnValue('ready');
    push.enablePush.mockResolvedValue({ ok: false, reason: 'unavailable' });
    render(<PushToggle flight={highRiskFlight} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Alert me' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/not available/);
  });
});
