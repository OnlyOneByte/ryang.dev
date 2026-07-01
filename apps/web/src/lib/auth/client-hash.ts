/**
 * Per-user hash derived from the real client IP — the dedup / rate-limit key for
 * server-mediated writes (guestbook, comments, reactions, scores, egg finds).
 *
 * WHY THIS EXISTS: the browser no longer talks to Pocketbase directly; the Astro
 * server proxies every write via the service token. That means PB's own
 * `e.realIP()` sees the WEB CONTAINER's IP on every request — identical for all
 * visitors — which would collapse every per-user dedup key to one value (one
 * reaction per emoji for the whole internet, an egg counter stuck at 1, a global
 * rate-limit bucket). So the per-user identity MUST be derived here, at the edge,
 * from the forwarded client IP, and passed explicitly to PB.
 *
 * The router (external Caddy) sets X-Forwarded-For to the real client; we take
 * the first hop. Granularity is per-IP-per-day — good enough for vanity dedup,
 * not ballot-grade.
 */
import { createHash } from 'node:crypto';

/** First hop of X-Forwarded-For (the original client), or 'unknown'. */
export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

/**
 * Stable per-user/day hash. `salt` namespaces the hash per feature so the same
 * IP yields different ids across features (e.g. 'ryang' vs 'ryang-egg') and the
 * value can't be correlated across collections.
 */
export function clientHash(req: Request, salt = 'ryang'): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${clientIp(req)}|${day}|${salt}`).digest('hex');
}
