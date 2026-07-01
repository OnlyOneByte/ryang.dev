/**
 * POST /api/score — submit a 404-game high score (JSON: {initials, score}).
 *
 * Scores are client-computed and forgeable; this route is the cheap deterrent
 * layer (clamp + rate-limit), and the moderation hook (approved=false until you
 * approve in admin) is the real backstop. We write via the service token so the
 * client never touches PB directly. Fail-soft: if PB is down the game is
 * unaffected — submission just reports a soft failure.
 */
import type { APIRoute } from 'astro';
import { checkRate } from '@/lib/auth/ratelimit';
import { withServerClient } from '@/lib/pb/client';
import { clientHash } from '@/lib/auth/client-hash';

export const prerender = false;

const SCORE_CAP = 1000; // a real run tops out well under this; reject absurd values

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const hash = clientHash(request);
  if (!checkRate(`score:${hash}`).allowed) return json({ ok: false, error: 'rate' }, 429);

  let initials = '';
  let score = NaN;
  try {
    const body = await request.json();
    initials = String(body.initials ?? '');
    score = Number(body.score);
  } catch {
    return json({ ok: false, error: 'bad-input' }, 400);
  }

  // sanitize: 1-3 uppercase letters; clamp the score to a sane integer range.
  initials = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (!initials) return json({ ok: false, error: 'bad-initials' }, 400);
  if (!Number.isFinite(score) || score <= 0 || score > SCORE_CAP) {
    return json({ ok: false, error: 'bad-score' }, 400);
  }
  score = Math.floor(score);

  // Create via service token with approved=false + the per-user sessionHash set
  // explicitly (the browser can't reach PB, and the hash must be the END USER's,
  // not the web container's realIP). Stays hidden until approved in admin.
  try {
    await withServerClient((pb) =>
      pb.collection('scores').create({ initials, score, approved: false, sessionHash: hash })
    );
  } catch {
    return json({ ok: false, error: 'backend' }, 502);
  }
  return json({ ok: true, pending: true });
};
