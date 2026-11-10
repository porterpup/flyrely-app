import { useEffect } from 'react';
import { COPILOT_PUSH_ENABLED } from './flags';
import { registerServiceWorker } from './push';

type HeadLink = { rel: string; href: string; sizes?: string };
type HeadMeta = { name: string; content: string };

/** Brand navy, shown in the browser toolbar and the installed app's status area. */
export const THEME_COLOR = '#123A75';

/**
 * Head links for the installable PWA: manifest and the iOS home-screen icon. Always emitted, so "Add to Home Screen"
 * works for everyone. Only the push service worker (CopilotBootstrap) stays behind the copilot and push flags.
 */
export function pwaHeadLinks(): HeadLink[] {
  return [
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', sizes: '180x180' },
  ];
}

/** theme-color and the iOS standalone-mode tags. Always emitted. */
export function pwaMeta(): HeadMeta[] {
  return [
    { name: 'theme-color', content: THEME_COLOR },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'FlyRely' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  ];
}

function PushBootstrap() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}

/** Registers the push-only service worker. Renders and registers nothing unless both flags are on. */
export function CopilotBootstrap() {
  if (!COPILOT_PUSH_ENABLED) return null;
  return <PushBootstrap />;
}
