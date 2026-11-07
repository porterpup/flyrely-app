import { describe, it, expect } from 'vitest';
import { shouldReload, isChunkLoadError, RELOAD_KEY, RELOAD_WINDOW_MS } from '../reloadGuard';

function mem(initial: Record<string, string> = {}) {
  const d = { ...initial };
  return { d, getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v) };
}

describe('shouldReload', () => {
  it('reloads the first time and records the timestamp', () => {
    const s = mem();
    expect(shouldReload(s, 1000)).toBe(true);
    expect(s.d[RELOAD_KEY]).toBe('1000');
  });
  it('does not reload again within the window', () => {
    const s = mem();
    shouldReload(s, 1000);
    expect(shouldReload(s, 1000 + RELOAD_WINDOW_MS - 1)).toBe(false);
  });
  it('reloads again after the window', () => {
    const s = mem({ [RELOAD_KEY]: '1000' });
    expect(shouldReload(s, 1000 + RELOAD_WINDOW_MS)).toBe(true);
  });
  it('ignores a garbage stored value', () => {
    expect(shouldReload(mem({ [RELOAD_KEY]: 'abc' }), 5000)).toBe(true);
  });
  it('reloads once anyway when storage throws', () => {
    const bad = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(shouldReload(bad, 1)).toBe(true);
  });
  it('reloads when storage is unavailable', () => {
    expect(shouldReload(null, 1)).toBe(true);
  });
});

describe('isChunkLoadError', () => {
  it('matches known chunk failures', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /x.js'))).toBe(true);
    expect(isChunkLoadError(new Error("'text/html' is not a valid JavaScript MIME type."))).toBe(true);
  });
  it('ignores other errors', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('isChunkLoadError (Track Flight regression)', () => {
  it('recognises the Safari wording seen when add-flight navigates to a stale route chunk', () => {
    expect(isChunkLoadError(new Error("'text/html' is not a valid JavaScript MIME type."))).toBe(true);
  });
  it('recognises Chromium and Firefox wording', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/_build/assets/a.js'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
  });
  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('Network down'))).toBe(false);
  });
});
