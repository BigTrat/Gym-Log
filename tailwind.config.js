/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: {
          950: '#07090f',
          900: '#0b0e15',
          800: '#11151f',
          700: '#1a1f2c',
          600: '#262c3b'
        },
        accent: {
          400: '#7dd3fc',
          500: '#38bdf8',
          600: '#0ea5e9'
        }
      }
    }
  },
  plugins: []
}
