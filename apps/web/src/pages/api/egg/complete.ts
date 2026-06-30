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
import { withServerClient } from '@/lib/pb/client';
import { createHash } from 'node:crypto';

export const prerender = false;

export const EGG_COOKIE = 'rg_egg';
export const EGG_VALUE = 'complete';

// Per-completer id derived from the END-USER IP (not the service-token writer's).
// A unique (sessionHash, fragment='__complete__') index dedupes repeat visits so
// the live counter reflects distinct finishers, not page reloads.
function completerHash(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${day}|ryang-egg`).digest('hex');
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const secure = (process.env.PUBLIC_SITE_URL || request.url).startsWith('https://');
  cookies.set(EGG_COOKIE, signValue(EGG_VALUE), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // a year — finding everything should stick
  });

  // Best-effort: record one completion row for the live counter. The unique
  // index makes a repeat completion a no-op (we swallow the 400). Never blocks
  // the cookie/unlock — if PB is down the hunt still completes locally.
  try {
    await withServerClient((pb) =>
      pb.collection('egg_finds').create({
        sessionHash: completerHash(request),
        fragment: '__complete__',
        completedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* PB down or duplicate (unique index) — counter just won't double-count */
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
