/**
 * Route guard: anything under /private requires a valid recruiter session
 * cookie, else redirect to /unlock. Keeps the gate check in one place rather
 * than per-page.
 */
import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * Central gate. Any route whose pathname matches GATED requires a valid
 * recruiter session cookie. Gated responses are marked no-store so neither the
 * router nor any proxy/CDN caches private content.
 *
 * NOTE: /resume.pdf is intentionally PUBLIC and is NOT gated here — it filters
 * recruiter_content to a public-section allowlist itself (see resume.pdf.ts).
 */
const GATED = [/^\/private(\/|$)/];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const gated = GATED.some((re) => re.test(path));
  if (gated) {
    const token = ctx.cookies.get(SESSION_COOKIE)?.value;
    if (!verifySession(token)) {
      return ctx.redirect('/unlock?from=private', 302);
    }
  }
  const res = await next();
  if (gated) {
    res.headers.set('Cache-Control', 'private, no-store, max-age=0');
    res.headers.set('X-Robots-Tag', 'noindex'); // keep gated pages out of search
  }
  // Scavenger-hunt fragment for the network-tab-curious: the value is a claim
  // token (`egg forwarded` in the shell). Whimsy only; harmless to expose.
  res.headers.set('X-Egg', 'forwarded');
  return res;
});
