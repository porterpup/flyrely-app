import { describe, expect, it, vi } from 'vitest';
import source from '../../../public/sw.js?raw';

function load() {
  const listeners: Record<string, (e: any) => void> = {};
  const showNotification = vi.fn(async () => {});
  const openWindow = vi.fn(async () => null);
  const matchAll = vi.fn(async () => [] as any[]);
  const self: any = {
    location: { origin: 'https://flyrely.example' },
    registration: { showNotification },
    clients: { claim: vi.fn(async () => {}), matchAll, openWindow },
    skipWaiting: vi.fn(),
    addEventListener: (t: string, fn: (e: any) => void) => (listeners[t] = fn),
  };
  new Function('self', 'URL', source)(self, URL);
  return { listeners, self, showNotification, openWindow, matchAll };
}

const waitable = (extra: object = {}) => {
  const p: Promise<unknown>[] = [];
  return { e: { waitUntil: (x: Promise<unknown>) => p.push(x), ...extra }, done: () => Promise.all(p) };
};

describe('public/sw.js', () => {
  it('has no fetch handler and uses no caches (cannot serve stale app code)', () => {
    const { listeners } = load();
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'install', 'notificationclick', 'push']);
    expect(source).not.toMatch(/caches\./);
    expect(source).not.toMatch(/addEventListener\(\s*['"]fetch['"]/);
  });

  it('shows a notification from the plan 4.6 payload', async () => {
    const { listeners, showNotification } = load();
    const w = waitable({
      data: {
        json: () => ({ v: 1, kind: 'at_risk_heads_up', title: 'DL1234 tomorrow: high delay risk', body: 'Tap for your Plan B.', url: '/flights/flight-1', client_flight_id: 'flight-1' }),
      },
    });
    listeners.push(w.e);
    await w.done();
    expect(showNotification).toHaveBeenCalledWith(
      'DL1234 tomorrow: high delay risk',
      expect.objectContaining({ body: 'Tap for your Plan B.', tag: 'flight-1:at_risk_heads_up', data: { url: '/flights/flight-1' } })
    );
  });

  it('still shows something for a missing or malformed payload', async () => {
    const { listeners, showNotification } = load();
    const w = waitable({ data: { json: () => { throw new Error('bad'); } } });
    listeners.push(w.e);
    await w.done();
    expect(showNotification).toHaveBeenCalledWith('FlyRely', expect.any(Object));
  });

  it('click opens the flight when no window is open', async () => {
    const { listeners, openWindow } = load();
    const close = vi.fn();
    const w = waitable({ notification: { close, data: { url: '/flights/flight-1' } } });
    listeners.notificationclick(w.e);
    await w.done();
    expect(close).toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith('/flights/flight-1');
  });

  it('click focuses and navigates an existing window', async () => {
    const { listeners, matchAll, openWindow } = load();
    const win = { url: 'https://flyrely.example/', navigate: vi.fn(async () => {}), focus: vi.fn(async () => win) };
    matchAll.mockResolvedValue([win]);
    const w = waitable({ notification: { close: vi.fn(), data: { url: '/flights/flight-1' } } });
    listeners.notificationclick(w.e);
    await w.done();
    expect(win.navigate).toHaveBeenCalledWith('/flights/flight-1');
    expect(win.focus).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('click never follows a cross-origin url', async () => {
    const { listeners, openWindow } = load();
    const w = waitable({ notification: { close: vi.fn(), data: { url: 'https://evil.example/phish' } } });
    listeners.notificationclick(w.e);
    await w.done();
    expect(openWindow).toHaveBeenCalledWith('/');
  });
});
