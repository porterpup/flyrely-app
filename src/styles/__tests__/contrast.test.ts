import { describe, expect, it } from 'vitest';
import { contrastRatio, palette } from '../tokens';

const { surface, ink, status } = palette;
const WHITE = '#FFFFFF';
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3.0;

type Pair = [name: string, fg: string, bg: string];

const textPairs: Pair[] = [
  // ink on surfaces
  ...(['DEFAULT', 'muted', 'card', 'panel', 'field'] as const).flatMap((bg) =>
    (['DEFAULT', 'sub', 'caption'] as const).map(
      (fg): Pair => [`ink.${fg} on surface.${bg}`, ink[fg], surface[bg]],
    ),
  ),
  // accent on surfaces
  ...(['DEFAULT', 'muted', 'card', 'panel'] as const).map(
    (bg): Pair => [`surface.accent on surface.${bg}`, surface.accent, surface[bg]],
  ),
  // risk text on surfaces
  ...(['success-text', 'warning-text', 'error-text'] as const).flatMap((fg) =>
    (['DEFAULT', 'muted', 'card', 'panel'] as const).map(
      (bg): Pair => [`status.${fg} on surface.${bg}`, status[fg], surface[bg]],
    ),
  ),
  // risk text on its own bg, and accent on info bg
  ['status.success-text on status.success-bg', status['success-text'], status['success-bg']],
  ['status.warning-text on status.warning-bg', status['warning-text'], status['warning-bg']],
  ['status.error-text on status.error-bg', status['error-text'], status['error-bg']],
  ['surface.accent on status.info-bg', surface.accent, status['info-bg']],
  // placeholder
  ['ink.placeholder on surface.field', ink.placeholder, surface.field],
  ['ink.placeholder on surface.DEFAULT', ink.placeholder, surface.DEFAULT],
  ['ink.placeholder on surface.card', ink.placeholder, surface.card],
  // subtle
  ['ink.subtle on surface.DEFAULT', ink.subtle, surface.DEFAULT],
  // solid fills
  ['white on surface.accent-fill', WHITE, surface['accent-fill']],
  ['white on status.error-solid', WHITE, status['error-solid']],
  ['ink.inverse on status.warning-solid', ink.inverse, status['warning-solid']],
];

const nonTextPairs: Pair[] = [
  ['surface.field-border on surface.field', surface['field-border'], surface.field],
  ['surface.field-border on surface.DEFAULT', surface['field-border'], surface.DEFAULT],
  ['surface.field-border on surface.card', surface['field-border'], surface.card],
  ['surface.accent on surface.DEFAULT', surface.accent, surface.DEFAULT],
  ['surface.accent on surface.card', surface.accent, surface.card],
];

describe('contrastRatio', () => {
  it('white on black is about 21', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });
});

describe('text contrast (>= 4.5)', () => {
  it.each(textPairs)('%s', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(TEXT_MIN);
  });
});

describe('non-text contrast (>= 3.0)', () => {
  it.each(nonTextPairs)('%s', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(NON_TEXT_MIN);
  });
});
