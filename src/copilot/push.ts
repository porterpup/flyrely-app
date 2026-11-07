// Web push client for the 24-hour high-risk heads-up (plan §6). Free: VAPID, no Apple account.
// Nothing here runs unless the caller is behind COPILOT_PUSH_ENABLED. The VAPID public key is
// read from /copilot/config at runtime; no key is ever bundled.
import type { Flight } from '~/types';
import { getCopilotConfig, subscribePush, toFlightRef, unsubscribePush } from './api';

export const SW_URL = '/sw.js';
const STORE_KEY = 'flyrely_copilot_push_v1';

/**
 * unsupported: no service worker / Push API (or no notifications).
 * ios_needs_install: iOS Safari tab. iOS 16.4+ only allows web push for Home Screen web apps.
 * ready: can subscribe.
 */
export type PushEnvironment = 'unsupported' | 'ios_needs_install' | 'ready';

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports as a Mac with touch.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return mm || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function hasPushApis(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushEnvironment(): PushEnvironment {
  if (isIos() && !isStandalone()) return 'ios_needs_install';
  return hasPushApis() ? 'ready' : 'unsupported';
}

/** Register the push-only worker. Safe to call repeatedly; never throws. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    // updateViaCache none: the browser always re-fetches sw.js, so an updated worker is picked up on the next visit.
    return await navigator.serviceWorker.register(SW_URL, { scope: '/', updateViaCache: 'none' });
  } catch {
    return null;
  }
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// ---- which flights this device has an alert for (watch ids only, never keys) ----

type Store = Record<string, string>; // client flight id -> watch_id

function readStore(): Store {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Store = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === 'string') out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage blocked: the alert still works; the toggle just can't remember it after a reload.
  }
}

export type PushStatus = 'prompt' | 'enabled' | 'denied';

/** Current state for one flight. Never prompts. */
export async function getPushStatus(flightId: string): Promise<PushStatus> {
  if (!hasPushApis()) return 'prompt';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted' || !readStore()[flightId]) return 'prompt';
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    return sub ? 'enabled' : 'prompt';
  } catch {
    return 'prompt';
  }
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'unsupported' | 'unavailable' | 'limit' | 'error' };

/**
 * Turn on the heads-up for one flight. Call from a tap handler: the permission request is the
 * first await so the browser (Safari especially) still sees the user gesture.
 */
export async function enablePush(flight: Flight): Promise<EnableResult> {
  if (getPushEnvironment() !== 'ready') return { ok: false, reason: 'unsupported' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const config = await getCopilotConfig();
    const key = config.push.vapid_public_key;
    if (!config.enabled || !config.push.enabled || !key) return { ok: false, reason: 'unavailable' };

    const reg = (await registerServiceWorker()) ?? null;
    if (!reg) return { ok: false, reason: 'error' };
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return { ok: false, reason: 'error' };

    const res = await subscribePush({
      subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
      flight: toFlightRef(flight),
      client_flight_id: flight.id,
    });
    writeStore({ ...readStore(), [flight.id]: res.watch_id });
    return { ok: true };
  } catch (e) {
    const status = (e as { status?: unknown } | null)?.status;
    return { ok: false, reason: status === 429 ? 'limit' : status === 404 ? 'unavailable' : 'error' };
  }
}

/** Turn off the heads-up for one flight. Drops the browser subscription once no flight uses it. */
export async function disablePush(flightId: string): Promise<boolean> {
  try {
    const store = readStore();
    const watchId = store[flightId];
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    if (sub && watchId) await unsubscribePush({ endpoint: sub.endpoint, watch_id: watchId });
    delete store[flightId];
    writeStore(store);
    if (sub && Object.keys(store).length === 0) await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}
