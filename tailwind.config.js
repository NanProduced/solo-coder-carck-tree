/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: 'oklch(0.15 0.02 260)',
          900: 'oklch(0.20 0.02 260)',
          850: 'oklch(0.25 0.02 260)',
          800: 'oklch(0.30 0.02 260)',
        },
        neon: {
          blue: 'oklch(0.75 0.15 250)',
          cyan: 'oklch(0.80 0.15 180)',
          purple: 'oklch(0.70 0.18 280)',
          pink: 'oklch(0.70 0.20 330)',
          green: 'oklch(0.75 0.15 140)',
        },
        strength: {
          weak: 'oklch(0.65 0.22 20)',
          fair: 'oklch(0.70 0.18 70)',
          good: 'oklch(0.70 0.18 200)',
          strong: 'oklch(0.70 0.15 140)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px oklch(0.75 0.15 250 / 0.3)' },
          '100%': { boxShadow: '0 0 40px oklch(0.75 0.15 250 / 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
