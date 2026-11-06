// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { highRiskFlight } from './fixtures';

const KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

interface Mocks {
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribeBrowser: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
  fetch: ReturnType<typeof vi.fn>;
  existingSub: { value: unknown };
}

function install(opts: { permission?: NotificationPermission; ua?: string; standalone?: boolean; push?: boolean } = {}): Mocks {
  const existingSub = { value: null as unknown };
  const sub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } }),
  };
  const unsubscribeBrowser = vi.fn(async () => true);
  const subscribe = vi.fn(async () => ({ ...sub, unsubscribe: unsubscribeBrowser }));
  const pushManager = {
    getSubscription: vi.fn(async () => existingSub.value),
    subscribe,
  };
  const reg = { pushManager };
  const register = vi.fn(async () => reg);
  vi.stubGlobal('navigator', {
    userAgent: opts.ua ?? 'Mozilla/5.0 Chrome',
    platform: 'Linux',
    maxTouchPoints: 0,
    standalone: opts.standalone,
    serviceWorker: { register, getRegistration: vi.fn(async () => reg), ready: Promise.resolve(reg) },
  });
  const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
  if (opts.push !== false) {
    vi.stubGlobal('PushManager', class {});
    (window as any).PushManager = class {};
  } else {
    delete (window as any).PushManager;
  }
  vi.stubGlobal('Notification', { permission: opts.permission ?? 'default', requestPermission });
  (window as any).Notification = (globalThis as any).Notification;
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith('/copilot/config'))
      return new Response(JSON.stringify({ enabled: true, push: { enabled: true, vapid_public_key: KEY } }), { status: 200 });
    if (url.endsWith('/copilot/push/subscribe'))
      return new Response(JSON.stringify({ watch_id: 'w_1', expires_at: '2026-11-16T22:30:00Z' }), { status: 201 });
    if (url.endsWith('/copilot/push/unsubscribe')) return new Response(JSON.stringify({ removed: 1 }), { status: 200 });
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { subscribe, unsubscribeBrowser, register, requestPermission, fetch: fetchMock, existingSub };
}

describe('push client', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as any).PushManager;
    delete (window as any).Notification;
  });

  it('detects environments', async () => {
    const push = await import('../push');
    install();
    expect(push.getPushEnvironment()).toBe('ready');
    install({ push: false });
    expect(push.getPushEnvironment()).toBe('unsupported');
    install({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari' });
    expect(push.getPushEnvironment()).toBe('ios_needs_install');
    install({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', standalone: true });
    expect(push.getPushEnvironment()).toBe('ready');
  });

  it('decodes a base64url VAPID key', async () => {
    const { urlBase64ToUint8Array } = await import('../push');
    const bytes = urlBase64ToUint8Array(KEY);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });

  it('enables: asks permission first, reads the key from config, subscribes, stores the watch', async () => {
    const m = install();
    const push = await import('../push');
    const result = await push.enablePush(highRiskFlight);
    expect(result).toEqual({ ok: true });
    expect(m.requestPermission).toHaveBeenCalledTimes(1);
    // Permission is requested before any network call (keeps the user gesture).
    expect(m.requestPermission.mock.invocationCallOrder[0]).toBeLessThan(m.fetch.mock.invocationCallOrder[0]);
    expect(m.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(m.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    const subscribeCall = m.fetch.mock.calls.find((c) => String(c[0]).endsWith('/push/subscribe'))!;
    const body = JSON.parse((subscribeCall[1] as RequestInit).body as string);
    expect(body.client_flight_id).toBe('flight-1');
    expect(body.flight.flight_number).toBe('DL1234');
    expect(body.subscription.keys).toEqual({ p256dh: 'p', auth: 'a' });
    expect(JSON.parse(localStorage.getItem('flyrely_copilot_push_v1')!)).toEqual({ 'flight-1': 'w_1' });
  });

  it('does not subscribe when permission is denied', async () => {
    const m = install();
    m.requestPermission.mockResolvedValue('denied');
    const { enablePush } = await import('../push');
    expect(await enablePush(highRiskFlight)).toEqual({ ok: false, reason: 'denied' });
    expect(m.fetch).not.toHaveBeenCalled();
    expect(m.subscribe).not.toHaveBeenCalled();
  });

  it('reports unavailable when the API has no VAPID key', async () => {
    const m = install();
    m.fetch.mockImplementation(async () => new Response(JSON.stringify({ enabled: true, push: { enabled: false, vapid_public_key: null } })));
    const { enablePush } = await import('../push');
    expect(await enablePush(highRiskFlight)).toEqual({ ok: false, reason: 'unavailable' });
    expect(m.subscribe).not.toHaveBeenCalled();
  });

  it('maps a 429 to the limit reason', async () => {
    const m = install();
    const base = m.fetch.getMockImplementation()!;
    m.fetch.mockImplementation(async (url: string) =>
      url.endsWith('/push/subscribe') ? new Response('{}', { status: 429 }) : base(url)
    );
    const { enablePush } = await import('../push');
    expect(await enablePush(highRiskFlight)).toEqual({ ok: false, reason: 'limit' });
  });

  it('refuses on iOS outside the Home Screen app', async () => {
    const m = install({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari' });
    const { enablePush } = await import('../push');
    expect(await enablePush(highRiskFlight)).toEqual({ ok: false, reason: 'unsupported' });
    expect(m.requestPermission).not.toHaveBeenCalled();
  });

  it('status: prompt, enabled, denied', async () => {
    const m = install({ permission: 'granted' });
    const push = await import('../push');
    expect(await push.getPushStatus('flight-1')).toBe('prompt');
    localStorage.setItem('flyrely_copilot_push_v1', JSON.stringify({ 'flight-1': 'w_1' }));
    m.existingSub.value = { endpoint: 'https://fcm.googleapis.com/x' };
    expect(await push.getPushStatus('flight-1')).toBe('enabled');
    install({ permission: 'denied' });
    expect(await push.getPushStatus('flight-1')).toBe('denied');
  });

  it('disables: tells the API and drops the browser subscription when no flight is left', async () => {
    const m = install({ permission: 'granted' });
    m.existingSub.value = { endpoint: 'https://fcm.googleapis.com/x', unsubscribe: m.unsubscribeBrowser };
    localStorage.setItem('flyrely_copilot_push_v1', JSON.stringify({ 'flight-1': 'w_1', 'flight-2': 'w_2' }));
    const { disablePush } = await import('../push');
    expect(await disablePush('flight-1')).toBe(true);
    const call = m.fetch.mock.calls.find((c) => String(c[0]).endsWith('/push/unsubscribe'))!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ endpoint: 'https://fcm.googleapis.com/x', watch_id: 'w_1' });
    expect(m.unsubscribeBrowser).not.toHaveBeenCalled();
    await disablePush('flight-2');
    expect(m.unsubscribeBrowser).toHaveBeenCalledTimes(1);
  });
});
