import type { RouterHistory } from '@tanstack/react-router';

/**
 * Knows whether the previous history entry belongs to this app. The browser's history.length
 * cannot tell (it also counts pages visited before the app), and this router version has no
 * canGoBack. We follow the router's per-entry keys: a new key is a push (history length grew)
 * or a replace (it did not); a known key is a Back/Forward move.
 */
const trackers = new WeakMap<RouterHistory, () => boolean>();

/** True when Back would stay inside this app. False for untracked histories. */
export function canGoBackInApp(history: RouterHistory): boolean {
  return trackers.get(history)?.() ?? false;
}

export function trackInAppHistory(history: RouterHistory) {
  let keys: string[] = [];
  let pos = -1;
  let length = history.length;
  const keyOf = () => history.location.state?.key ?? history.location.href;

  const seen = (k: string) => {
    const i = keys.indexOf(k);
    if (i >= 0) {
      pos = i;
    } else if (pos < 0) {
      keys = [k];
      pos = 0;
    } else if (history.length > length) {
      keys = [...keys.slice(0, pos + 1), k];
      pos += 1;
    } else {
      keys[pos] = k;
    }
    length = history.length;
  };

  seen(keyOf());
  history.subscribe(() => seen(keyOf()));
  trackers.set(history, () => pos > 0);
}
