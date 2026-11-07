import { useEffect } from 'react';
import { COPILOT_PUSH_ENABLED } from './flags';
import { registerServiceWorker } from './push';

type HeadLink = { rel: string; href: string; sizes?: string };

/** Head links for the installable PWA. Empty unless the copilot and push flags are both on. */
export function copilotHeadLinks(): HeadLink[] {
  if (!COPILOT_PUSH_ENABLED) return [];
  return [
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', sizes: '180x180' },
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
