# Copilot web push and the service worker (S-P5)

Flags (both must be on; the build-time one controls everything in the app):
`VITE_FEATURE_DISRUPTION_COPILOT=true` and `VITE_FEATURE_COPILOT_PUSH=true`. API side: `FLYRELY_COPILOT_PUSH=1`.
Flags off: no service worker registered and no copilot code in the bundle. The manifest, apple-touch-icon, theme-color and iOS
standalone tags are always in the page head (`pwaHeadLinks`, `pwaMeta`), so Add to Home Screen works for everyone.

## Files
- `public/sw.js`, `public/manifest.webmanifest`, `public/icons/*`: static. TanStack Start / vinxi copies `public/`
  to `.output/public`, served from the site root (no route, `routeTree.gen.ts` untouched). These files are in every
  build. The manifest and icons are always linked; the worker is only registered when the flags are on.
- `src/copilot/push.ts` (subscribe / unsubscribe / feature detection), `src/copilot/CopilotHead.tsx`
  (`pwaHeadLinks`, `pwaMeta`, `CopilotBootstrap`), `src/components/copilot/PushToggle.tsx`, `IosInstallHelp.tsx`.

## Service worker safety
- Scope `/` (served from `/sw.js`). It handles only `push` and `notificationclick`.
- No `fetch` handler and no Cache Storage, so it cannot change how the app loads or serve stale content after a deploy.
- Updates: registered with `updateViaCache: 'none'`, so the browser re-fetches `sw.js` on each visit and installs a changed
  file. `skipWaiting` + `clients.claim` make the new version take over at once (safe: nothing cached to migrate).
- Unregister at any time (DevTools > Application > Service Workers > Unregister, or
  `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`). The app keeps working;
  only alerts stop. To retire it for everyone, ship a `sw.js` that calls `self.registration.unregister()`.
- Notification clicks only follow same-origin paths.

## Keys and domain
The VAPID public key comes from `GET /copilot/config` at runtime. Nothing is bundled or committed. Real-iPhone push
needs an HTTPS domain and the iPhone Home Screen app (iOS 16.4+). Chrome desktop works on `http://localhost`.
