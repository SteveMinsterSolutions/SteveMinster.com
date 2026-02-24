/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary palette
        navy: {
          DEFAULT: '#1B2A4A',
          light: '#253660',
          dark: '#111C33',
        },
        electric: {
          DEFAULT: '#2D7DD2',
          light: '#4A94E0',
          dark: '#1E5FA3',
        },
        lime: {
          DEFAULT: '#97D700',
          light: '#ADE633',
          dark: '#7AB300',
        },
        // Supporting palette
        slate: {
          DEFAULT: '#4A5568',
          light: '#718096',
          dark: '#2D3748',
        },
        charcoal: '#1A202C',
        cloud: '#F7FAFC',
        coral: {
          DEFAULT: '#FF6B6B',
          light: '#FF8E8E',
          dark: '#E85555',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'h1': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h2': ['1.875rem', { lineHeight: '1.2' }],
        'h3': ['1.375rem', { lineHeight: '1.3' }],
        'body': ['1.0625rem', { lineHeight: '1.7' }],
        'small': ['0.875rem', { lineHeight: '1.5' }],
        'label': ['0.8125rem', { lineHeight: '1', letterSpacing: '0.1em' }],
      },
      maxWidth: {
        'content': '720px',
        'wide': '1200px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
