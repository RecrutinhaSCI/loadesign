/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Loa Design brand ───────────────────────
        loa: {
          50:  '#fdf8f5',
          100: '#f5ede7',
          200: '#ede0d9',
          300: '#e2cdc8',
          400: '#d4bab0',
          500: '#c4a898',
          600: '#B08B7D', // PRIMARY
          700: '#9a7568',
          800: '#7a5e57',
          900: '#3d2b24',
        },
        // ── Dark UI surface tokens ──────────────────
        surface: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          900: '#111113',
          950: '#0d0d0f',
        },
        dark: {
          bg:      '#0d0d0f',
          surface: '#111113',
          card:    '#161618',
          border:  '#1f1f23',
          hover:   '#1c1c20',
          muted:   '#2a2a30',
          input:   '#18181c',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-loa':  '0 0 24px rgba(176,139,125,0.18)',
        'glow-sm':   '0 0 8px rgba(176,139,125,0.12)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)',
        'card-hover': '0 1px 3px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.35)',
        'modal':     '0 24px 80px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-up':     'slideUp 0.3s cubic-bezier(.22,1,.36,1)',
        'slide-in-left':'slideInLeft 0.3s cubic-bezier(.22,1,.36,1)',
        'scale-in':     'scaleIn 0.15s cubic-bezier(.22,1,.36,1)',
        'skeleton':     'skeleton 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                    to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        skeleton: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [],
}