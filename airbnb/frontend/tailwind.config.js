/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF385C',
        gray: {
          50: '#F7F7F7',
          100: '#F0F0F0',
          900: '#222222',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 2px 6px rgba(0,0,0,0.08)',
        floating: '0 4px 12px rgba(0,0,0,0.12)'
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0, 0, 0.2, 1)'
      },
      transitionDuration: {
        200: '200ms'
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
      },
    },
  },
  plugins: [],
};