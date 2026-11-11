import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, isTimeoutError } from '../fetchWithTimeout';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A fetch that never resolves, but rejects with an AbortError when its signal aborts. */
const hangingFetch = vi.fn((_input: string, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  })
);

describe('fetchWithTimeout', () => {
  it('rejects with an AbortError when the request never resolves', async () => {
    vi.useFakeTimers();
    hangingFetch.mockClear();
    const pending = fetchWithTimeout('https://example.test/x', {}, 12000, hangingFetch as unknown as typeof fetch);
    const assertion = expect(pending).rejects.toSatisfy((err) => isTimeoutError(err));
    await vi.advanceTimersByTimeAsync(11999);
    let settled = false;
    pending.catch(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(hangingFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('resolves with the response when fetch resolves in time', async () => {
    vi.useFakeTimers();
    const response = new Response('ok', { status: 200 });
    const quickFetch = vi.fn(async () => response);
    const result = await fetchWithTimeout('https://example.test/y', {}, 12000, quickFetch as unknown as typeof fetch);
    expect(result).toBe(response);
    expect(vi.getTimerCount()).toBe(0);
  });
});
