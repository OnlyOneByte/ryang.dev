/**
 * Route guard: anything under /private requires a valid recruiter session
 * cookie, else redirect to /unlock. Keeps the gate check in one place rather
 * than per-page.
 */
import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (path === '/private' || path.startsWith('/private/')) {
    const token = ctx.cookies.get(SESSION_COOKIE)?.value;
    if (!verifySession(token)) {
      return ctx.redirect('/unlock?from=private', 302);
    }
  }
  return next();
});
