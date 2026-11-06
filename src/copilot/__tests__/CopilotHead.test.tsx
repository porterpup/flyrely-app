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
  ])('registers nothing and adds no links (copilot=%s push=%s)', async (copilot, push) => {
    const register = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    const { CopilotBootstrap, copilotHeadLinks } = await load(copilot, push);
    expect(copilotHeadLinks()).toEqual([]);
    render(<CopilotBootstrap />);
    expect(register).not.toHaveBeenCalled();
  });

  it('with both flags on: manifest link and one registration of /sw.js', async () => {
    const register = vi.fn(async () => ({}));
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    const { CopilotBootstrap, copilotHeadLinks } = await load('true', 'true');
    expect(copilotHeadLinks().map((l) => l.rel)).toEqual(['manifest', 'apple-touch-icon']);
    render(<CopilotBootstrap />);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });
});
