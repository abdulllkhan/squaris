/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#1A1A1B',
        'surface-elevated': '#202021',
        'surface-high': '#2A2A2B',
        well: '#151516',
        divider: '#343536',
        'divider-hover': '#4A4B4C',
        accent: '#FF4500',
        'accent-hover': '#FF5A1F',
        'accent-muted': '#4A1A0A',
        text: '#D7DADC',
        'text-muted': '#8A8D8F',
        'piece-orange': '#FF4500',
        'piece-orange-light': '#FF6A35',
        'piece-blue': '#2592FF',
        'piece-blue-secondary': '#3A93EF',
        'piece-blue-light': '#6DBEF7',
        'piece-blue-pale': '#A2C9FF',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'accent-glow': '0 8px 16px rgba(255, 69, 0, 0.25)',
        'accent-soft': '0 4px 12px rgba(255, 69, 0, 0.18)',
        piece: '0 4px 8px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
};
