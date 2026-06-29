/**
 * Tiny in-memory fixed-window rate limiter for the unlock endpoint. Keyed by
 * hashed client IP. Process-local (fine for a single-box self-host); resets on
 * restart. Not a substitute for the cookie/argon2 gate — just slows brute force.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 8;

const hits = new Map<string, { count: number; resetAt: number }>();

export interface RateResult { allowed: boolean; remaining: number; retryAfterSec: number; }

export function checkRate(key: string): RateResult {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSec: 0 };
  }
  e.count += 1;
  if (e.count > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - e.count, retryAfterSec: 0 };
}

/** Clear a key on success so a legit unlock doesn't count against the window. */
export function clearRate(key: string): void {
  hits.delete(key);
}
