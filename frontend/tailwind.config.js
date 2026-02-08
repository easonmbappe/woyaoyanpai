/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'table-green': '#0d3328',
        'table-green-light': '#1a4d3a',
        'gold': '#d4af37',
        'chip-red': '#e74c3c',
        'chip-blue': '#2980b9',
        'chip-green': '#27ae60',
        'chip-black': '#2c3e50',
        'chip-purple': '#9b59b6',
        'action-orange': '#ed8936',
        'danger-red': '#e53e3e',
        'success-green': '#48bb78',
      },
      fontFamily: {
        mono: ['Roboto Mono', 'monospace'],
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'shine': 'shine 1s infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
