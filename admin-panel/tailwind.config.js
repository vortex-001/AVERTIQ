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
        avertiq: {
          navy: '#2B6777',      // Primary (#2B6777)
          surface: '#FFFFFF',   // Surface (#FFFFFF)
          elevated: '#F8FAFC',
          border: '#C8D8E4',    // Secondary (#C8D8E4)
          orange: '#FF7A18',
          crimson: '#EF3038',
          slate: '#4A5568',
          blue: '#2B6777',
          teal: '#2B6777',      // Primary
          ice: '#C8D8E4',       // Secondary
          bg: '#F2F2F2',        // Background
          success: '#52AB98',   // Success Mint
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF7A18',
          600: '#EA580C',
          700: '#C2410C',
          900: '#7C2D12',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        silent: {
          purple: '#8b5cf6',
          indigo: '#6366f1',
          dark: '#1e1b4b',
        }
      },
    },
  },
  plugins: [],
}
