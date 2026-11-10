// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

async function load(copilot: string, push: string) {
  vi.resetModules();
  vi.stubEnv('VITE_FEATURE_DISRUPTION_COPILOT', copilot);
  vi.stubEnv('VITE_FEATURE_COPILOT_PUSH', push);
  return import('../CopilotHead');
}

describe('CopilotHead', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ['true', ''],
    ['', 'true'],
    ['', ''],
  ])('registers no service worker, but still emits the PWA tags (copilot=%s push=%s)', async (copilot, push) => {
    const register = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    const { CopilotBootstrap, pwaHeadLinks, pwaMeta } = await load(copilot, push);
    expect(pwaHeadLinks().map((l) => l.rel)).toEqual(['manifest', 'apple-touch-icon']);
    expect(pwaMeta().map((m) => m.name)).toContain('theme-color');
    render(<CopilotBootstrap />);
    expect(register).not.toHaveBeenCalled();
  });

  it('with both flags on: one registration of /sw.js', async () => {
    const register = vi.fn(async () => ({}));
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    const { CopilotBootstrap } = await load('true', 'true');
    render(<CopilotBootstrap />);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });
});
