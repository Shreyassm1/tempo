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
        // Desert-race palette: the stock scales are remapped so every existing class themes itself.
        // slate = day (sand to saddle leather), zinc/gray = night (parchment to violet sky).
        white: '#fffaf0',
        black: '#120a06',
        slate: {
          50: '#f8f0de', 100: '#f0e3c6', 200: '#e3cfa6', 300: '#cfb383', 400: '#a88a63',
          500: '#7f6449', 600: '#634b36', 700: '#4a3727', 800: '#33251a', 900: '#231812', 950: '#160f0a',
        },
        zinc: {
          50: '#fbf5e9', 100: '#f3e9d6', 200: '#e2d4bb', 300: '#cdbda6', 400: '#ab9cad',
          500: '#85779a', 600: '#5f5378', 700: '#43395f', 800: '#2c2444', 900: '#1d1730', 950: '#120d1f',
        },
        gray: {
          50: '#fbf5e9', 100: '#f3e9d6', 200: '#e2d4bb', 300: '#cdbda6', 400: '#ab9cad',
          500: '#85779a', 600: '#5f5378', 700: '#43395f', 800: '#2c2444', 900: '#1d1730', 950: '#120d1f',
        },
        // rose = magenta (urgency, overdue), indigo = turquoise (selection, drag, focus)
        rose: {
          50: '#fdf0f6', 100: '#fbe0ee', 200: '#f6bcd9', 300: '#ee8fbe', 400: '#e45f9f',
          500: '#d23a84', 600: '#b5266c', 700: '#921d57', 800: '#761a49', 900: '#5f173d', 950: '#3a0822',
        },
        indigo: {
          50: '#eafaf8', 100: '#ccf2ed', 200: '#9ce4dc', 300: '#63cfc5', 400: '#34b6ac',
          500: '#1a9a91', 600: '#137c76', 700: '#13635f', 800: '#134f4d', 900: '#134241', 950: '#052726',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'monospace'],
        menace: ['"Dela Gothic One"', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.25em',
      }
    },
  },
  plugins: [],
}
