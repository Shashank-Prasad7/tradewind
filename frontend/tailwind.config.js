/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Ocean Depths theme — full gray scale override ──────────────────────
      // Derived from: Deep Navy #1a2332 · Teal #2d8b8b · Seafoam #a8dadc · Cream #f1faee
      colors: {
        gray: {
          50:  '#f1faee',  // cream  — primary text
          100: '#d4eef0',  // pale seafoam — bright text
          200: '#a8dadc',  // seafoam — secondary text / highlights
          300: '#6aa0ae',  // muted seafoam — tertiary text
          400: '#4a7a8a',  // ocean mist — placeholder text
          500: '#335a6a',  // deep mist — hint text
          600: '#253d4e',  // abyss rim — subtle bg tint
          700: '#1a2d3e',  // deep current — borders
          800: '#142030',  // sea floor — card borders / dividers
          900: '#0f1823',  // deep navy — panel / header bg
          950: '#090f18',  // midnight ocean — primary bg
        },
      },
      fontFamily: {
        mono:    ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Oxanium', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-in',
        'slide-in':   'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
