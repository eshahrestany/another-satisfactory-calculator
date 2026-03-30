/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        satisfactory: {
          orange: '#e8a630',
          'orange-dim': '#b8842a',
          dark: '#1a1a2e',
          darker: '#0a0a16',
          panel: '#252540',
          'panel-light': '#2e2e4a',
          border: '#3a3a5c',
          'border-light': '#4a4a6c',
          text: '#e0e0e0',
          muted: '#8888aa',
          steel: '#3a3a50',
          rust: '#8b4513',
        },
        node: {
          recipe: '#2a3f5f',
          'recipe-border': '#3a5580',
          resource: '#2f5f3a',
          'resource-border': '#3a8048',
          output: '#5f4a2a',
          'output-border': '#806030',
        },
        indicator: {
          green: '#4ade80',
          red: '#ef4444',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        industrial: ['Orbitron', 'sans-serif'],
        body: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gear-spin': 'gear-spin 3s linear infinite',
        'flicker': 'flicker 5s step-end infinite',
        'hum': 'hum-pulse 3s ease-in-out infinite',
        'caution': 'caution-slide 2s linear infinite',
        'stamp': 'stamp-in 0.3s ease-out',
      },
      boxShadow: {
        'industrial': '2px 2px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'industrial-inset': 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 0 rgba(255,255,255,0.02)',
        'glow-orange': '0 0 10px rgba(232, 166, 48, 0.3)',
        'glow-green': '0 0 10px rgba(74, 222, 128, 0.3)',
      },
    },
  },
  plugins: [],
}
