import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadFlags() {
  vi.resetModules();
  return import('../flags');
}

describe('copilot flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is off when unset', async () => {
    vi.stubEnv('VITE_FEATURE_DISRUPTION_COPILOT', '');
    vi.stubEnv('VITE_FEATURE_COPILOT_PUSH', '');
    const f = await loadFlags();
    expect(f.COPILOT_ENABLED).toBe(false);
    expect(f.COPILOT_PUSH_ENABLED).toBe(false);
  });

  it('only the exact string "true" enables it', async () => {
    vi.stubEnv('VITE_FEATURE_DISRUPTION_COPILOT', '1');
    expect((await loadFlags()).COPILOT_ENABLED).toBe(false);
    vi.stubEnv('VITE_FEATURE_DISRUPTION_COPILOT', 'true');
    expect((await loadFlags()).COPILOT_ENABLED).toBe(true);
  });

  it('push requires the master flag', async () => {
    vi.stubEnv('VITE_FEATURE_DISRUPTION_COPILOT', '');
    vi.stubEnv('VITE_FEATURE_COPILOT_PUSH', 'true');
    expect((await loadFlags()).COPILOT_PUSH_ENABLED).toBe(false);
    vi.stubEnv('VITE_FEATURE_DISRUPTION_COPILOT', 'true');
    expect((await loadFlags()).COPILOT_PUSH_ENABLED).toBe(true);
  });
});
