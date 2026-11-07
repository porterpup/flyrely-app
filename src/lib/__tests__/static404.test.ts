import { describe, it, expect } from 'vitest';
import static404 from '../../../server/plugins/static-404';

function run(path: string, res: Response) {
  let fn: (e: any, r: any) => void = () => {};
  static404({ hooks: { hook: (_n, f) => void (fn = f) } });
  const response = { body: res as unknown };
  fn({ path }, response);
  return response.body as Response;
}
const html = () => new Response('<html>', { headers: { 'content-type': 'text/html' } });

describe('static-404 plugin', () => {
  it('turns an HTML answer for a missing chunk into a 404', () => {
    const r = run('/_build/assets/add-OLD.js', html());
    expect(r.status).toBe(404);
    expect(r.headers.get('content-type')).toContain('text/plain');
  });
  it('marks HTML pages no-store so a stale shell is never reused after a deploy', () => {
    const r = run('/flights/add', html());
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('leaves real JS untouched', () => {
    const js = new Response('x', { headers: { 'content-type': 'text/javascript' } });
    expect(run('/_build/assets/a.js', js)).toBe(js);
  });
});
