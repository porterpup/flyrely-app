import { describe, expect, it } from 'vitest';
import { palette } from '../tokens';
import { THEME_COLOR } from '~/copilot/CopilotHead';

const HEX_ALLOWED = ['src/components/ui/Logo.tsx'];
const SKIP_FILES = ['routeTree.gen.ts', 'src/styles/tokens.ts'];

// Every source file under src/ and app/ (tests excluded), as raw text. Keys look like "/src/components/ui/Pill.tsx".
const sources = import.meta.glob(
  ['/src/**/*.{ts,tsx}', '/app/**/*.{ts,tsx}', '!/**/__tests__/**', '!/**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const files = Object.entries(sources)
  .map(([key, text]) => ({ rel: key.replace(/^\//, ''), text }))
  .filter(({ rel }) => !SKIP_FILES.some((f) => rel.endsWith(f)));

/** Every `file:line: text` where the line matches. */
function offenders(re: RegExp, skip: (rel: string) => boolean = () => false): string[] {
  const hits: string[] = [];
  for (const { rel, text } of files) {
    if (skip(rel)) continue;
    text.split('\n').forEach((line: string, i: number) => {
      if (re.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
    });
  }
  return hits;
}

describe('navy theme guard', () => {
  it('has files to scan', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no bg-white (white text on a white surface); bg-white/NN overlays are fine', () => {
    expect(offenders(/\bbg-white(?!\/)/)).toEqual([]);
  });

  it('has no raw Tailwind palette classes', () => {
    expect(
      offenders(
        /\b(text|bg|border|ring|divide|fill|stroke|from|to)-(gray|slate|zinc|neutral|stone|blue|sky|indigo|red|rose|green|emerald|amber|yellow|orange|primary|navy)-\d/,
      ),
    ).toEqual([]);
  });

  it('has no legacy warn/ok/brand colour classes', () => {
    expect(offenders(/-(warn|ok|brand)\b/)).toEqual([]);
  });

  it('has no hard-coded six-digit hex outside tokens.ts and the logo', () => {
    expect(offenders(/#[0-9A-Fa-f]{6}\b/, (rel) => HEX_ALLOWED.includes(rel))).toEqual([]);
  });

  // opacity-0 / opacity-100 are show-hide toggles, not dimmed text.
  it('has no dimming opacity utility on the same element as a text-ink class', () => {
    const hits: string[] = [];
    for (const { rel, text } of files) {
      // A className string or template: a quoted run of classes.
      for (const m of text.matchAll(/(["'`])((?:(?!\1)[^\n])*)\1/g)) {
        const cls = m[2];
        if (/(^|[\s:!])text-ink(-[a-z-]+)?(\s|$)/.test(cls) && /(^|[\s:!])opacity-(?!0\b|100\b)\d+/.test(cls)) {
          hits.push(`${rel}: ${cls}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});

const manifestRaw = Object.values(
  import.meta.glob('/public/manifest.webmanifest', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
)[0];

describe('platform colours match the surface token', () => {
  const manifest = JSON.parse(manifestRaw) as { theme_color: string; background_color: string };
  it('manifest theme_color and background_color', () => {
    expect(manifest.theme_color).toBe(palette.surface.DEFAULT);
    expect(manifest.background_color).toBe(palette.surface.DEFAULT);
  });
  it('THEME_COLOR', () => {
    expect(THEME_COLOR).toBe(palette.surface.DEFAULT);
  });
});
