// One-time recovery from stale lazy chunks after a redeploy. Pure logic lives here so it can be unit tested.
export const RELOAD_KEY = 'flyrely:chunk-reload-at';
export const RELOAD_WINDOW_MS = 10_000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** True if a reload should happen now; records the attempt. Never reloads twice within the window. */
export function shouldReload(storage: StorageLike | null | undefined, now: number): boolean {
  try {
    if (!storage) return true;
    const last = Number(storage.getItem(RELOAD_KEY));
    if (Number.isFinite(last) && last > 0 && now - last < RELOAD_WINDOW_MS && now >= last) return false;
    storage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    // sessionStorage unavailable: reload once anyway
    return true;
  }
}

const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|not a valid JavaScript MIME type|Unable to preload CSS/i;

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return CHUNK_ERROR_RE.test(msg);
}

export function installChunkReload(win: Window = window): void {
  const recover = () => {
    let storage: Storage | null = null;
    try {
      storage = win.sessionStorage;
    } catch {
      storage = null;
    }
    if (shouldReload(storage, Date.now())) win.location.reload();
  };
  win.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    recover();
  });
  // Dynamic imports in lazy routes that fail outside Vite's preload helper
  win.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      recover();
    }
  });
}
