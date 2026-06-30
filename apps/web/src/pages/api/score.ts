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
import { createHash } from 'node:crypto';

export const prerender = false;

const SCORE_CAP = 1000; // a real run tops out well under this; reject absurd values

function ipHash(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${day}|ryang`).digest('hex');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const hash = ipHash(request);
  if (!checkRate(hash).allowed) return json({ ok: false, error: 'rate' }, 429);

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

  // Create via service token. The moderation hook forces approved=false +
  // stamps sessionHash, so the row stays hidden until approved.
  try {
    await withServerClient((pb) => pb.collection('scores').create({ initials, score }));
  } catch {
    return json({ ok: false, error: 'backend' }, 502);
  }
  return json({ ok: true, pending: true });
};
