/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tenet: {
          bg: '#07080b',
          vault: '#0b0d12',
          card: '#10121a',
          surface: '#151822',
          border: '#232735',
          borderHover: '#373d52',
          steel: '#848d9f',
          text: '#f2f4f8',
          dim: '#4f5669',
          red: '#dc2626',
          redGlow: 'rgba(220, 38, 38, 0.25)',
          blue: '#0284c7',
          blueGlow: 'rgba(2, 132, 199, 0.25)',
          amber: '#d97706',
          emerald: '#059669',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        tactical: '0.2em',
        widest: '0.25em',
      }
    },
  },
  plugins: [],
}
