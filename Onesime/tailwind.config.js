/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1220',
          900: '#111d35',
          800: '#162040',
          700: '#1a2744',
          600: '#1e2d50',
          500: '#243464',
          400: '#2d4280',
        },
      },
      boxShadow: {
        polaroid: '0 4px 24px 0 rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
