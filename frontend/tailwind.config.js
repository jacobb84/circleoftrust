/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cot': {
          'dark': '#0a0f1a',
          'darker': '#060b14',
          'primary': '#0d4f4f',
          'secondary': '#1a6b6b',
          'accent': '#2dd4bf',
          'accent-light': '#5eead4',
          'blue': '#1e3a5f',
          'blue-light': '#2563eb',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(45, 212, 191, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(45, 212, 191, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
