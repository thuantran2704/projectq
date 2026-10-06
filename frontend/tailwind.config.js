/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#0d1117',
          100: '#161b22',
          200: '#21262d',
          300: '#30363d',
          400: '#8b949e',
          500: '#a1aab4',
          600: '#b1bac4',
          700: '#c9d1d9',
          800: '#e6edf3',
          900: '#f0f6fc',
        },
        hospital: {
          50: '#0d1d36',
          100: '#122a45',
          500: '#2f81f7',
          600: '#2f81f7',
          700: '#1f6feb',
          800: '#1158c7',
        },
        emerald: {
          50: '#0f2f23', 100: '#163d2f', 200: '#1f6d46',
          600: '#3fb950', 700: '#56d364', 800: '#aff5b4', 950: '#e6edf3',
        },
        amber: {
          50: '#2a1d0a', 100: '#3a2608', 200: '#6e4b0d', 300: '#8b6414',
          500: '#d29922', 600: '#e3b341', 700: '#e3b341', 800: '#e3b341', 900: '#f0d36b',
        },
        red: {
          50: '#2c1214', 100: '#3d1719', 200: '#6e2b2b', 300: '#8e3636',
          500: '#f85149', 600: '#ff7b72', 700: '#ff7b72', 800: '#ffa198',
        },
        sky: {
          50: '#0d1d36', 100: '#122a45', 200: '#1f6feb',
          600: '#2f81f7', 700: '#79c0ff', 800: '#a5d6ff', 900: '#c9e6ff',
        },
        purple: { 50: '#171d2f', 200: '#343d60', 950: '#d2d9f7' },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
