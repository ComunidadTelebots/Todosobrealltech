/** @type {import('tailwindcss').Config} */
// Tokens de la identidad ComunidadTelebots (ref. BugPanel de chat.todosobreall.tech).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b14',
        bg2: '#0b1220',
        ink: '#e9f0fb',
        muted: '#8794ad',
        teal: '#3ee0c7',
        cyan: '#36b6f0',
        blue: '#5b8af1',
        violet: '#9b6cf0',
        green: '#6de08c',
        rose: '#f0688c',
        amber: '#ffb43c',
        line: 'rgba(255,255,255,.09)',
        card: 'rgba(255,255,255,.04)',
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", 'sans-serif'],
        body: ["'Hanken Grotesk'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      maxWidth: { wrap: '1180px' },
      boxShadow: {
        glow: '0 6px 22px -6px rgba(54,182,240,.6)',
      },
    },
  },
  plugins: [],
}
