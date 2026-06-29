/**
 * POST /api/unlock — recruiter gate.
 * argon2-verify the submitted passphrase against RECRUITER_HASH; on success set
 * a signed httpOnly session cookie, log a recruiter_unlocks row (fires the ntfy
 * hook), and redirect to /private. Rate-limited; generic errors (no oracle).
 */
import type { APIRoute } from 'astro';
import { verify } from '@node-rs/argon2';
import { mintSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { checkRate, clearRate } from '@/lib/auth/ratelimit';
import { serverClient } from '@/lib/pb/client';
import { createHash } from 'node:crypto';

export const prerender = false;

function clientIpHash(req: Request): string {
  // behind the router Caddy → trust X-Forwarded-For's first hop
  const xff = req.headers.get('x-forwarded-for') || '';
  const ip = xff.split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${day}|ryang`).digest('hex');
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const ipHash = clientIpHash(request);

  // rate limit first
  const rate = checkRate(ipHash);
  if (!rate.allowed) {
    return new Response('Too many attempts. Try again later.', {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfterSec) },
    });
  }

  const form = await request.formData();
  const passphrase = String(form.get('passphrase') ?? '');

  const expected = process.env.RECRUITER_HASH;
  if (!expected) {
    // misconfigured server — don't leak which side failed
    return redirect('/unlock?e=1', 303);
  }

  let ok = false;
  try {
    ok = passphrase.length > 0 && (await verify(expected, passphrase));
  } catch {
    ok = false;
  }

  if (!ok) {
    // generic failure; the rate counter already incremented
    return redirect('/unlock?e=1', 303);
  }

  // success → clear the rate window, set the session cookie
  clearRate(ipHash);
  const secure = (process.env.PUBLIC_SITE_URL || '').startsWith('https://');
  const token = mintSession();
  const opts = sessionCookieOptions(secure);
  const cookie =
    `${SESSION_COOKIE}=${token}; Path=${opts.path}; Max-Age=${opts.maxAge}; ` +
    `SameSite=Lax; HttpOnly${opts.secure ? '; Secure' : ''}`;

  // best-effort: log the unlock (fires the ntfy hook). Never block on it.
  try {
    const pb = await serverClient();
    await pb.collection('recruiter_unlocks').create({
      ipHash,
      userAgent: request.headers.get('user-agent') ?? '',
      unlockedAt: new Date().toISOString(),
    });
  } catch {
    /* backend down or not yet provisioned — unlock still succeeds */
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/private', 'Set-Cookie': cookie },
  });
};
