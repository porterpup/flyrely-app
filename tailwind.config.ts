import type { Config } from 'tailwindcss';
import { palette } from './src/styles/tokens';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (Figma "Aviato" variables) ───────────────────
        // Use these in components; no raw Tailwind palette colours.
        surface: { ...palette.surface },
        ink: { ...palette.ink },
        // Alert + pill status pairs. Text colours are the risk colours; info uses the accent.
        status: {
          ...palette.status,
          'info-text': palette.surface.accent,
          // Solid fills used on the ticket / prediction panel and the usage chart
          'info-solid': palette.surface['accent-fill'],
        },
      },
      // The ring offset is never white on the navy theme.
      ringOffsetColor: {
        DEFAULT: palette.surface.DEFAULT,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Type scale from Figma Typography frame (34:669): size / line-height / tracking / weight
      fontSize: {
        'display-lg': ['64px', { lineHeight: '72px', letterSpacing: '-0.03em' }],
        'display-md': ['56px', { lineHeight: '64px', letterSpacing: '-0.03em' }],
        'display-sm': ['48px', { lineHeight: '56px', letterSpacing: '-0.03em' }],
        'heading-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.025em' }],
        'heading-md': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        'heading-sm': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        'title-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
        'title-md': ['20px', { lineHeight: '30px', letterSpacing: '-0.44921875px', fontWeight: '500' }],
        'title-sm': ['18px', { lineHeight: '27px', letterSpacing: '-0.439453125px' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.3125px' }],
        'body-md': ['14px', { lineHeight: '21px', letterSpacing: '-0.150390625px' }],
        'body-sm': ['12px', { lineHeight: '18px', letterSpacing: '0px' }],
        // Hero number (risk percent): large, tight, semibold
        hero: ['64px', { lineHeight: '64px', letterSpacing: '-0.04em', fontWeight: '600' }],
        // Button label (action/action-md)
        'action-md': ['16px', { lineHeight: '16px', letterSpacing: '-0.5px' }],
        'action-lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.5px' }],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'pop-in': { from: { transform: 'scale(0.96)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out both',
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      boxShadow: {
        // Shadow/elevation-1
        'elevation-1': '0 -1px 20px rgba(0, 0, 6, 0.05)',
        nav: '0 -1px 20px rgba(0, 0, 6, 0.05)',
      },
      // Radii used by Figma components
      borderRadius: {
        '4xl': '2rem',
        btn: '16px', // Button default
        'btn-sm': '12px', // Button small
        field: '14px', // Input / select
        alert: '12px', // Alert
        tile: '16px', // Option tile
        panel: '24px', // Raised panel on a dark card
        ticket: '22px', // Ticket / flight card
        pill: '9999px',
      },
      spacing: {
        gutter: '24px', // screen side padding
        inset: '16px', // card / alert inner padding
      },
    },
  },
  plugins: [],
} satisfies Config;
