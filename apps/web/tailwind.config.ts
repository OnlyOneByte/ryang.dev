import type { Config } from 'tailwindcss';

/**
 * Tailwind maps its color/role utilities onto the theme-engine CSS variables
 * defined in src/styles/tokens.css. Components use `bg-bg`, `text-accent`, etc.,
 * which resolve to whatever the active [data-theme] block sets — so a theme
 * swap re-skins every utility with zero markup changes.
 */
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx,svelte,md,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-strong': 'var(--text-strong)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'accent-ink': 'var(--accent-ink)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      borderRadius: { theme: 'var(--radius)' },
      borderWidth: { theme: 'var(--border-width)' },
      boxShadow: { theme: 'var(--shadow)' },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
        display: 'var(--font-display)',
      },
    },
  },
  plugins: [],
} satisfies Config;
