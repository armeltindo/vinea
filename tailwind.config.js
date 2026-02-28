/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }], // 10px — usage exceptionnel uniquement
      },
      borderRadius: {
        'card': '0.875rem', // 14px — rayon standard des cards
      },
      keyframes: {
        'bell-swing': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%, 60%': { transform: 'rotate(10deg)' },
          '40%, 80%': { transform: 'rotate(-10deg)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'bell-swing': 'bell-swing 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
      },
    },
  },
  plugins: [],
};
