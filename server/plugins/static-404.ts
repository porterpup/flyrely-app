// Hashed build assets that no longer exist (after a redeploy) must 404, not fall through to the SPA HTML
// shell. A 200 text/html answer for a .js chunk makes the browser throw "not a valid JavaScript MIME type".
// Nitro's static handler serves real files first; only misses reach the SSR catch-all, whose HTML Response
// is swapped for a 404 here before it is sent.
const STATIC_PREFIXES = ['/_build/', '/assets/', '/icons/'];

type Hooks = { hook: (name: string, fn: (...args: any[]) => void) => void };

export default function static404(nitroApp: { hooks: Hooks }) {
  nitroApp.hooks.hook('beforeResponse', (event: { path?: string }, response: { body?: unknown }) => {
    const path = String(event.path || '').split('?')[0];
    const isStatic = STATIC_PREFIXES.some((p) => path.startsWith(p));
    const body = response.body;
    if (!(body instanceof Response)) return;
    // The HTML shell names this build's hashed chunks, so it must never be reused from a cache
    // (Safari/PWA shells) after a redeploy.
    if (!isStatic && (body.headers.get('content-type') || '').includes('text/html')) {
      try {
        body.headers.set('cache-control', 'no-store');
      } catch {
        // immutable headers: leave as is
      }
      return;
    }
    if (!isStatic) return;
    if (!(body.headers.get('content-type') || '').includes('text/html')) return;
    response.body = new Response('Not found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  });
}
