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
      boxShadow: {
        nav: '0 -1px 20px rgba(0, 0, 6, 0.05)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
