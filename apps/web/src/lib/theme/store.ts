/**
 * Theme persistence. Two keys, two jobs:
 *   - `theme` cookie       → read by Astro SSR to render data-theme server-side
 *   - `ryang.unlocked` LS  → client-only unlock set (see konami.ts)
 *
 * Switching is a pure attribute swap on <html>; CSS variables do the rest.
 */
import { DEFAULT_THEME, isValidTheme } from '@/styles/themes';

const COOKIE = 'theme';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Read the theme from the cookie (client-side). Falls back to default. */
export function getTheme(): string {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const m = document.cookie.match(/(?:^|;\s*)theme=([\w-]+)/);
  return isValidTheme(m?.[1]) ? (m![1] as string) : DEFAULT_THEME;
}

/** Apply + persist a theme. Locked themes must already be unlocked by caller. */
export function setTheme(id: string): void {
  const theme = isValidTheme(id) ? id : DEFAULT_THEME;
  document.documentElement.dataset.theme = theme;
  // SameSite=Lax; Secure is added by the browser over HTTPS (router TLS).
  document.cookie = `${COOKIE}=${theme};path=/;max-age=${ONE_YEAR};samesite=lax`;
}

/**
 * Server-side: parse the theme from a Cookie header for SSR render.
 * Use in Astro layouts: `const theme = themeFromCookie(Astro.request.headers.get('cookie'))`.
 */
export function themeFromCookie(cookieHeader: string | null): string {
  const m = cookieHeader?.match(/(?:^|;\s*)theme=([\w-]+)/);
  return isValidTheme(m?.[1]) ? (m![1] as string) : DEFAULT_THEME;
}
