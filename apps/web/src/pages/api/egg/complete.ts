/**
 * POST /api/egg/complete — sets a signed cookie marking the scavenger hunt done,
 * so /secret unlocks across reloads without trusting localStorage server-side.
 *
 * This is honor-system whimsy, not a security boundary: the client decides when
 * it's "complete" (the fragments ship in client code). The signature only stops
 * a casual `document.cookie = ...` spoof. No PII, no body needed.
 */
import type { APIRoute } from 'astro';
import { signValue } from '@/lib/auth/session';

export const prerender = false;

export const EGG_COOKIE = 'rg_egg';
export const EGG_VALUE = 'complete';

export const POST: APIRoute = ({ cookies, request }) => {
  const secure = (process.env.PUBLIC_SITE_URL || request.url).startsWith('https://');
  cookies.set(EGG_COOKIE, signValue(EGG_VALUE), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // a year — finding everything should stick
  });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
