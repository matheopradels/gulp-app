/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: '#CEFF00',
      },
      // Écrans peu hauts (petits téléphones, Safari avec ses barres) : on resserre.
      screens: {
        short: { raw: '(max-height: 700px)' },
      },
    },
  },
  plugins: [],
}
