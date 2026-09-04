/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        clinical: {
          blue: '#0284c7',
          indigo: '#4f46e5',
          amber: '#d97706',
          rose: '#e11d48',
          slate: '#334155'
        }
      }
    },
  },
  plugins: [],
}
