/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        'surface-deep': 'var(--surface-deep)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-dark': 'var(--accent-dark)',
        'accent-tint': 'var(--accent-tint)',
        success: 'var(--success)',
        'success-tint': 'var(--success-tint)',
        warning: 'var(--warning)',
        'warning-tint': 'var(--warning-tint)',
      },
      fontFamily: {
        display: ['var(--display)'],
        body: ['var(--body)'],
        mono: ['var(--mono)'],
      },
      borderRadius: {
        card: '10px',
        btn: '6px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
