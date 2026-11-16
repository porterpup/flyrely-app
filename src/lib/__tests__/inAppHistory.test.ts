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

describe('same-URL navigation through a real router', () => {
  it('does not add an entry, and Back still goes to the previous page', async () => {
    const { createRouter, createRootRoute, createRoute } = await import('@tanstack/react-router');
    window.history.replaceState({}, '', '/');
    const history = createBrowserHistory();
    trackInAppHistory(history);
    const root = createRootRoute();
    const routeTree = root.addChildren([
      createRoute({ getParentRoute: () => root, path: '/' }),
      createRoute({ getParentRoute: () => root, path: '/explore' }),
    ]);
    const router = createRouter({ routeTree, history });
    await router.load();
    await router.navigate({ to: '/explore' });
    await tick();
    const length = window.history.length;
    await router.navigate({ to: '/explore' });
    await router.navigate({ to: '/explore' });
    await tick();
    expect(window.history.length).toBe(length);
    expect(canGoBackInApp(history)).toBe(true);
    await popped(history, 'back');
    expect(history.location.pathname).toBe('/');
  });
  it('treats search and hash as part of the URL', async () => {
    const h = await setup();
    h.push('/a?x=1#h'); await tick();
    const length = window.history.length;
    h.push('/a?x=1#h'); await tick();
    expect(window.history.length).toBe(length);
    h.push('/a?x=2#h'); await tick();
    expect(window.history.length).toBe(length + 1);
  });
});
