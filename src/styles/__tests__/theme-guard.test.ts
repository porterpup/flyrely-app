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

// The stylesheet is scanned too (raw text, same hex rules).
const cssSources = import.meta.glob('/src/styles/globals.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const files = Object.entries(sources)
  .map(([key, text]) => ({ rel: key.replace(/^\//, ''), text }))
  .filter(({ rel }) => !SKIP_FILES.some((f) => rel.endsWith(f)));

const cssFiles = Object.entries(cssSources).map(([key, text]) => ({ rel: key.replace(/^\//, ''), text }));

/** The text of every className={...} / cn(...) / quoted-class expression, so a rule can look across a whole expression. */
function classExpressions(text: string): string[] {
  const out: string[] = [];
  const re = /(?:\bcn\(|\bclassName=\{|\bclassName=(?=["'`]))/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const start = m.index + m[0].length;
    if (m[0].endsWith('=')) {
      // className="..." with a plain quoted string
      const q = text[start];
      const end = text.indexOf(q, start + 1);
      out.push(text.slice(start + 1, end < 0 ? undefined : end));
      continue;
    }
    // Balanced scan to the closing bracket, so nested ternaries and && stay inside one expression.
    let depth = 1;
    let i = start;
    for (; i < text.length && depth > 0; i++) {
      const c = text[i];
      if (c === '(' || c === '{') depth++;
      else if (c === ')' || c === '}') depth--;
    }
    out.push(text.slice(start, i));
  }
  return out;
}

/** Every `file:line: text` where the line matches. */
function offenders(re: RegExp, skip: (rel: string) => boolean = () => false, skipComments = false): string[] {
  const hits: string[] = [];
  for (const { rel, text } of files) {
    if (skip(rel)) continue;
    text.split('\n').forEach((line: string, i: number) => {
      if (skipComments && /^\s*(\*|\/\/|\/\*)/.test(line)) return;
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

  it('has no hard-coded hex (3 or 6 digit) outside tokens.ts and the logo', () => {
    expect(offenders(/#(?:[0-9A-Fa-f]{3}){1,2}\b/, (rel) => HEX_ALLOWED.includes(rel), true)).toEqual([]);
  });

  it('has no rgb( / hsl( colour literals (rgba shadows with black or white are fine)', () => {
    expect(offenders(/\b(?:rgb|hsl)a?\((?!\s*(?:0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\s*[,)])/, (rel) => HEX_ALLOWED.includes(rel), true)).toEqual([]);
  });

  it('globals.css has no hard-coded colours (use theme(...) tokens)', () => {
    const hits: string[] = [];
    for (const { rel, text } of cssFiles) {
      text.split('\n').forEach((line, i) => {
        if (/#(?:[0-9A-Fa-f]{3}){1,2}\b/.test(line.replace(/url\([^)]*\)/g, '')) || /\b(?:rgb|hsl)a?\((?!\s*0\s*,\s*0\s*,\s*0)/.test(line)) {
          hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });

  it('has no onDark, ink-on-dark, tone="dark" or emphasis= leftovers', () => {
    expect(offenders(/\bonDark\b|ink-on-dark|tone=["'{]+dark|\bemphasis=/)).toEqual([]);
  });

  // opacity-0 / opacity-100 are show-hide toggles, not dimmed text.
  it('has no dimming opacity utility anywhere in a className / cn() expression that sets a text-ink class', () => {
    const hits: string[] = [];
    for (const { rel, text } of files) {
      for (const expr of classExpressions(text)) {
        if (/(^|[\s:!'"`])text-ink(-[a-z-]+)?(?=[\s'"`]|$)/.test(expr) && /(^|[\s:!'"`])opacity-(?!0\b|100\b)\d+/.test(expr)) {
          hits.push(`${rel}: ${expr.replace(/\s+/g, ' ').slice(0, 160)}`);
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
