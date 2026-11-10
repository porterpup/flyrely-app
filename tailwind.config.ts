import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary - Blue
        primary: {
          50: '#EBF5FF',
          100: '#E1EFFE',
          200: '#C3DDFD',
          300: '#A4CAFE',
          400: '#76A9FA',
          500: '#3B82F6',
          600: '#1C64F2',
          700: '#1A56DB',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Navy
        navy: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          // Figma redesign surfaces
          card: '#123A75',
          panel: '#1A4A8F',
          ink: '#000006',
          caption: '#3D4553',
          stroke: '#EBEDF1',
        },
        // Figma accent blue (active tab, links)
        brand: '#276EF1',
        // Figma warning (At risk) badge / prediction panel
        warn: {
          DEFAULT: '#FFB400',
          ink: '#000006',
          bg: '#FFF4D6',
          text: '#7A5200',
        },
        // Figma green pill (On track / Already tracking)
        ok: {
          DEFAULT: '#0E9F4A',
          bg: '#DDF5E6',
        },
        // ── Semantic tokens (Figma "Aviato" variables) ───────────────────
        // Use these in components. Raw scales above are legacy / palette only.
        surface: {
          DEFAULT: '#FFFFFF', // Surface/background
          card: '#123A75', // Brand/primary, dark ticket + screen surfaces
          panel: '#1A4A8F', // raised panel on a dark card
          muted: '#F2F3F6', // Surface/card-dark, tiles and default pill
          divider: '#DDE1E8', // Surface/divider, field borders
          stroke: '#EBEDF1', // Surface/stroke, hairlines, nav border
          accent: '#276EF1', // Surface/accent, active tab, links, plane
          icon: '#000006', // Surface/icon, outline button border
        },
        ink: {
          DEFAULT: '#000006', // Type/heading
          sub: '#0A1220', // Type/subheading
          caption: '#3D4553', // Type/caption
          'on-dark': '#FFFFFF',
          'on-dark-muted': 'rgba(255, 255, 255, 0.5)',
        },
        // Alert + pill status pairs (Status/*-text on Status/*-background)
        status: {
          'success-bg': '#EAFFF3',
          'success-text': '#008344',
          'warning-bg': '#FFF7E2',
          'warning-text': '#966A00',
          'error-bg': '#FFE3E9',
          'error-text': '#CD1A3B',
          'info-bg': '#DBE7FF',
          'info-text': '#2F5DB2',
          // Solid, high-emphasis fills used on the dark ticket / prediction panel
          'warning-solid': '#FFB400',
          'success-solid': '#0E9F4A',
          'error-solid': '#CD1A3B',
          'info-solid': '#276EF1',
        },
        // Accent - Orange/Amber
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Risk status colors
        risk: {
          low: '#10B981',
          'low-bg': '#D1FAE5',
          medium: '#F59E0B',
          'medium-bg': '#FEF3C7',
          high: '#EF4444',
          'high-bg': '#FEE2E2',
        },
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
