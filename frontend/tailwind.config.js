export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /* ── Playful Geometric color tokens ── */
      colors: {
        brand: {
          bg:         '#FFFDF5',   // warm cream
          fg:         '#1E293B',   // slate-800
          muted:      '#F1F5F9',
          'muted-fg': '#64748B',
          accent:     '#8B5CF6',   // violet
          secondary:  '#F472B6',   // hot pink
          tertiary:   '#FBBF24',   // amber
          quaternary: '#34D399',   // emerald
          border:     '#E2E8F0',
          card:       '#FFFFFF',
          ring:       '#8B5CF6',
        },
      },
      /* ── Fonts ── */
      fontFamily: {
        outfit:   ['Outfit', 'system-ui', 'sans-serif'],
        jakarta:  ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      /* ── Hard "pop" shadows (no blur) ── */
      boxShadow: {
        'pop':       '4px 4px 0px 0px #1E293B',
        'pop-lg':    '6px 6px 0px 0px #1E293B',
        'pop-sm':    '2px 2px 0px 0px #1E293B',
        'pop-pink':  '6px 6px 0px 0px #F472B6',
        'pop-amber': '6px 6px 0px 0px #FBBF24',
        'pop-violet':'6px 6px 0px 0px #8B5CF6',
        'pop-mint':  '6px 6px 0px 0px #34D399',
      },
      /* ── Border radius ── */
      borderRadius: {
        'brand-sm': '8px',
        'brand-md': '16px',
        'brand-lg': '24px',
      },
      /* ── Bounce easing ── */
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34,1.56,0.64,1)',
      },
      /* ── Keyframes ── */
      keyframes: {
        wiggle: {
          '0%,100%': { transform: 'rotate(0deg)' },
          '25%':     { transform: 'rotate(3deg)' },
          '75%':     { transform: 'rotate(-3deg)' },
        },
        popIn: {
          '0%':   { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out',
        popIn:  'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        float:  'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
