export const palette = {
  surface: {
    DEFAULT: '#0B2350',
    muted: '#102C5E',
    card: '#123A75',
    panel: '#1A4A8F',
    field: '#0A1F47',
    stroke: '#23497F',
    divider: '#2E5A9C',
    'field-border': '#8AA2CC',
    icon: '#C3CEE3',
    accent: '#A3C5FF',
    'accent-fill': '#276EF1',
    'accent-fill-pressed': '#1F63E0',
  },
  ink: {
    DEFAULT: '#FFFFFF',
    sub: '#E6ECF5',
    caption: '#C3CEE3',
    placeholder: '#9AABC9',
    subtle: '#8FA0BF',
    inverse: '#0B2350',
  },
  status: {
    'success-text': '#6EE7A0',
    'warning-text': '#FFC94D',
    'error-text': '#FFA3AE',
    'error-solid': '#DC2F48',
    'warning-solid': '#FFB400',
    'success-bg': '#123F4A',
    'warning-bg': '#3A3526',
    'error-bg': '#3D2445',
    'info-bg': '#16386E',
  },
} as const;

function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const h = hex.replace(/^#/, '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid hex colour: ${hex}`);
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** WCAG 2.x contrast ratio between two hex colours, in the range 1..21. */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
