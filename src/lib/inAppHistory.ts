import type { RouterHistory } from '@tanstack/react-router';

/**
 * Knows whether the previous history entry belongs to this app. The browser's history.length
 * cannot tell (it also counts pages visited before the app), and this router version has no
 * canGoBack. Each entry we create carries an in-app index in its state: a push stores
 * (current + 1), a replace keeps the current one, and an entry we did not create counts as 0.
 * Back/forward and reloads just read the index stored on the entry, so they stay correct.
 */
const KEY = '__flyrelyIdx';

const indexOf = (history: RouterHistory): number => {
  const n = (history.location.state as Record<string, unknown> | undefined)?.[KEY];
  return typeof n === 'number' ? n : 0;
};

const tracked = new WeakSet<RouterHistory>();

/** True when Back would stay inside this app. False for untracked histories. */
export function canGoBackInApp(history: RouterHistory): boolean {
  return tracked.has(history) && indexOf(history) > 0;
}

export function trackInAppHistory(history: RouterHistory) {
  if (tracked.has(history)) return;
  tracked.add(history);
  const push = history.push.bind(history);
  const replace = history.replace.bind(history);
  history.push = (path, state, opts) => {
    // The router skips a same-URL navigation only when the state is also equal. Our index makes the
    // states differ, so do the skip here: re-navigating to the current URL (e.g. tapping the active
    // tab) must not add an entry. `path` is the router's href (path + search + hash), as is location.href.
    if (path === history.location.href) return replace(path, { ...state, [KEY]: indexOf(history) }, opts);
    return push(path, { ...state, [KEY]: indexOf(history) + 1 }, opts);
  };
  history.replace = (path, state, opts) => replace(path, { ...state, [KEY]: indexOf(history) }, opts);
}
