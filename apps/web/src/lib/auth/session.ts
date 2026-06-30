/**
 * Recruiter-gate session cookie: a signed, httpOnly token. No DB session table —
 * the cookie itself is the proof, HMAC-signed with SESSION_SECRET so it can't be
 * forged. Payload is just an expiry timestamp; we don't store PII in it.
 *
 * Format:  <expiryMs>.<hex hmac-sha256(expiryMs)>
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'rg_session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET missing or too short (need >= 16 chars).');
  }
  return s;
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

/** Mint a signed session token valid for `ttlMs` (default 30d). */
export function mintSession(ttlMs = THIRTY_DAYS_MS): string {
  const expiry = String(Date.now() + ttlMs);
  return `${expiry}.${sign(expiry)}`;
}

/** Verify a token: signature valid (constant-time) AND not expired. */
export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const expiry = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(expiry);
  // constant-time compare; lengths must match first
  if (mac.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  const ts = Number(expiry);
  return Number.isFinite(ts) && ts > Date.now();
}

/**
 * Generic HMAC sign/verify for NON-recruiter tokens (e.g. the scavenger-hunt
 * completion cookie). Same secret + constant-time compare as the session, but a
 * distinct payload tag so an egg cookie can never be mistaken for a gate cookie.
 * NOTE: this is whimsy, not a security boundary — it just stops the /secret page
 * from being trivially spoofed by editing localStorage.
 */
export function signValue(value: string): string {
  return `${value}.${sign(value)}`;
}

export function verifyValue(token: string | undefined | null, expected: string): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const value = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (value !== expected) return false;
  const want = sign(value);
  if (mac.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(want));
}

/** Cookie attributes. Secure is set based on the public origin (router TLS). */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: THIRTY_DAYS_MS / 1000,
  };
}
