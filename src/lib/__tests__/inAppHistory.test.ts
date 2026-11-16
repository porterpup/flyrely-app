// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createBrowserHistory, createMemoryHistory } from '@tanstack/react-router';
import { canGoBackInApp, trackInAppHistory } from '../inAppHistory';

const tick = () => new Promise((r) => setTimeout(r, 0));
const popped = async (h: { back: () => void; forward: () => void }, dir: 'back' | 'forward') => {
  h[dir]();
  await new Promise((r) => setTimeout(r, 30)); // jsdom fires popstate asynchronously
};

const setup = async () => {
  window.history.replaceState({}, '', '/');
  const h = createBrowserHistory();
  trackInAppHistory(h);
  await tick();
  return h;
};

describe('canGoBackInApp (browser history)', () => {
  it('is false on the first entry (opened directly)', async () => {
    const h = await setup();
    expect(canGoBackInApp(h)).toBe(false);
  });
  it('push -> true; back -> false; push after back -> true; forward works', async () => {
    const h = await setup();
    h.push('/flights/add'); await tick();
    expect(canGoBackInApp(h)).toBe(true);
    await popped(h, 'back');
    expect(h.location.pathname).toBe('/');
    expect(canGoBackInApp(h)).toBe(false);
    h.push('/flights/x'); await tick();
    expect(canGoBackInApp(h)).toBe(true);
    await popped(h, 'back');
    expect(h.location.pathname).toBe('/');
    await popped(h, 'forward');
    expect(h.location.pathname).toBe('/flights/x');
    expect(canGoBackInApp(h)).toBe(true);
  });
  it('replace of the only entry stays false', async () => {
    const h = await setup();
    h.replace('/flights/abc'); await tick();
    expect(canGoBackInApp(h)).toBe(false);
  });
  it('Home -> add -> (replace) flight: back arrow steps back to Home', async () => {
    const h = await setup();
    h.push('/flights/add'); await tick();
    h.replace('/flights/abc?added=1'); await tick();
    expect(canGoBackInApp(h)).toBe(true); // useGoBack -> history.back()
    await popped(h, 'back');
    expect(h.location.pathname).toBe('/');
    expect(canGoBackInApp(h)).toBe(false);
  });
  it('Home -> flight: back arrow can step back (history.back, not replace)', async () => {
    const h = await setup();
    h.push('/flights/abc'); await tick();
    expect(canGoBackInApp(h)).toBe(true);
  });
  it('is false for an untracked history', () => {
    expect(canGoBackInApp(createMemoryHistory({ initialEntries: ['/', '/a'] }))).toBe(false);
  });
});
