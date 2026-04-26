/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Typography upgrade: distinctive fonts
        display: ['Outfit', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        // Custom palette: refined, sophisticated
        brand: {
          50: '#f0f7f7',
          100: '#d4eded',
          200: '#a8d9d9',
          300: '#7ac5c5',
          400: '#4db1b1',
          500: '#209d9d',  // Primary teal
          600: '#1a7a7a',
          700: '#135d5d',
          800: '#0c4040',
          900: '#052323',
        },
        accent: {
          50: '#fef3e6',
          100: '#fce2c2',
          200: '#f9cf99',
          300: '#f5bc70',
          400: '#f2a947',
          500: '#ee961f',  // Warm amber accent
          600: '#cb7819',
          700: '#a25c13',
          800: '#79400d',
          900: '#502408',
        },
        // Surface colors with warmth
        surface: {
          page: '#fafaf8',    // Warm off-white
          card: '#ffffff',
          elevated: '#fefefe',
        },
        // Semantic colors refined
        success: {
          light: '#dcfce7',
          DEFAULT: '#22c55e',
          dark: '#15803d',
        },
        warning: {
          light: '#fef9c3',
          DEFAULT: '#eab308',
          dark: '#a16207',
        },
        error: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
        // Neutral refined
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sidebar: '#0f172a',
        sidebarHover: '#1e293b',
        sidebarActive: '#334155',
      },
      // Animation utilities
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      // Box shadow refined
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.06), 0 12px 24px rgba(0, 0, 0, 0.04)',
        'elevated': '0 2px 8px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      // Border radius refined
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
      },
    },
  },
  plugins: [],
}