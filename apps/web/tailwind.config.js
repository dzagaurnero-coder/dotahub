/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dh: {
          bg: '#0A0B0F',
          bgSecondary: '#101219',
          surface: '#151821',
          surfaceElevated: '#1B202B',
          border: '#282D39',
          text: '#F4F5F7',
          textMuted: '#969CAA',
          lime: '#B7FF45',
          limeHover: '#C8FF6B',
          indigo: '#8D9BFF',
          indigoHover: '#A3AEFF',
          success: '#45D483',
          danger: '#FF5D68',
          warning: '#F5A623',
        },
        rarity: {
          common: '#B0C3D9',
          uncommon: '#5E98D9',
          rare: '#4B69FF',
          mythical: '#8847FF',
          legendary: '#D32CE6',
          ancient: '#EB4B4B',
          immortal: '#E4AE39',
          arcana: '#ADE55C',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Manrope',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius: {
        dh: '0.75rem',
        'dh-lg': '1rem',
      },
      boxShadow: {
        'dh-card': '0 8px 24px -4px rgba(0, 0, 0, 0.45)',
        'dh-card-hover': '0 14px 32px -4px rgba(0, 0, 0, 0.65)',
        'dh-lime': '0 0 24px -4px rgba(183, 255, 69, 0.28)',
        'dh-indigo': '0 0 24px -4px rgba(141, 155, 255, 0.25)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};