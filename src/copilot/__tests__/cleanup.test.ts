// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../push', () => ({ disablePush: vi.fn() }));

import { releaseFlightCopilot } from '../cleanup';
import { disablePush } from '../push';
import { PREFS_KEY, getFlightState, setFlightState } from '../prefs';

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(disablePush).mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('releaseFlightCopilot', () => {
  it('clears the flight prefs and unsubscribes its push watch', async () => {
    setFlightState('f1', 'cancelled');
    setFlightState('f2', 'cancelled');
    vi.mocked(disablePush).mockResolvedValue(true);
    await releaseFlightCopilot('f1');
    expect(getFlightState('f1')).toBeNull();
    expect(getFlightState('f2')).toBe('cancelled');
    expect(disablePush).toHaveBeenCalledWith('f1');
    expect(window.localStorage.getItem(PREFS_KEY)).toBeTruthy();
  });

  it('never throws when the push unsubscribe fails', async () => {
    vi.mocked(disablePush).mockRejectedValue(new Error('network'));
    await expect(releaseFlightCopilot('f1')).resolves.toBeUndefined();
  });
});
